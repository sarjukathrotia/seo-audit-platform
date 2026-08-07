import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const origin = req.nextUrl.origin;

  // Reuse the existing HTML report route as the source
  const htmlRes = await fetch(`${origin}/api/scans/${id}/report`);
  if (!htmlRes.ok) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  const html = await htmlRes.text();

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "16px", bottom: "16px", left: "16px", right: "16px" } });
    return new Response(pdf as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="seo-audit-${id}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
