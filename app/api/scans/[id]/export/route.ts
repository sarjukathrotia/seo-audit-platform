import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import ExcelJS from "exceljs";

export const runtime = "nodejs";

const SEV_FILL: Record<string, string> = {
  critical: "FFF8CBCB",
  high: "FFFFE0C2",
  medium: "FFFEF3C7",
  low: "FFE0E7FF",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scan = await prisma.scan.findUnique({
      where: { id },
      include: { pages: { take: 500 }, issues: { take: 1000 } },
    });
    if (!scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });

    const aiPlan = scan.aiPlan ? JSON.parse(scan.aiPlan) : null;
    const pageUrlById = new Map(scan.pages.map((p) => [p.id, p.url]));
    const wb = new ExcelJS.Workbook();
    wb.creator = "SEO Audit Platform";
    wb.created = new Date();

    const agencyName = req.nextUrl.searchParams.get("agency") || "SEO Audit Platform";
    const clientName = req.nextUrl.searchParams.get("client") || "";

    // ---- Sheet 1: Summary ----
    const s = wb.addWorksheet("Summary");
    s.columns = [{ width: 28 }, { width: 60 }];
    s.addRow([`${agencyName} - SEO Audit Deliverable`, ""]).font = { bold: true, size: 16 };
    s.addRow(["Website", scan.rootUrl]);
    if (clientName) s.addRow(["Client", clientName]);
    s.addRow(["Date", new Date(scan.createdAt).toLocaleString()]);
    s.addRow(["Pages Crawled", scan.pages.length]);
    s.addRow([]);
    s.addRow(["Overall Score", `${scan.overallScore ?? 0}/100`]).font = { bold: true };
    s.addRow(["Technical", scan.technicalScore ?? 0]);
    s.addRow(["On-Page", scan.onPageScore ?? 0]);
    s.addRow(["Performance", scan.performanceScore ?? 0]);
    s.addRow(["Security", scan.securityScore ?? 0]);
    s.addRow(["Accessibility", scan.accessibilityScore ?? 0]);

    // ---- Sheet 2: Issues / Checks (styled like the reference sheet) ----
    const iSheet = wb.addWorksheet("Issues & Checks");
    iSheet.columns = [
      { header: "Sr No.", key: "no", width: 8 },
      { header: "Issue / Check", key: "title", width: 40 },
      { header: "Category", key: "category", width: 16 },
      { header: "Severity", key: "severity", width: 12 },
      { header: "Items", key: "count", width: 8 },
      { header: "Affected Page", key: "url", width: 50 },
      { header: "Details", key: "message", width: 60 },
    ];
    iSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    iSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };

    // group by code for the "Items" count like your reference
    const groups = new Map<string, { rows: typeof scan.issues; sev: string; cat: string; title: string }>();
    for (const is of scan.issues) {
      const g = groups.get(is.code) || { rows: [], sev: is.severity, cat: is.category, title: is.title };
      g.rows.push(is);
      groups.set(is.code, g);
    }

    let n = 1;
    for (const [, g] of groups) {
      const first = g.rows[0];
      const row = iSheet.addRow({
        no: n++,
        title: g.title,
        category: g.cat,
        severity: g.sev,
        count: g.rows.length,
        url: first.pageId ? pageUrlById.get(first.pageId) || scan.rootUrl : scan.rootUrl,
        message: first.message,
      });
      const fill = SEV_FILL[g.sev] || "FFFFFFFF";
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
        cell.alignment = { vertical: "top", wrapText: true };
      });
    }

    // ---- Sheet 3: Pages Crawled ----
    const pSheet = wb.addWorksheet("Pages");
    pSheet.columns = [
      { header: "URL", key: "url", width: 55 },
      { header: "Status", key: "status", width: 10 },
      { header: "Title", key: "title", width: 40 },
      { header: "Words", key: "words", width: 10 },
      { header: "H1s", key: "h1", width: 8 },
      { header: "Response (ms)", key: "ms", width: 14 },
    ];
    pSheet.getRow(1).font = { bold: true };
    for (const p of scan.pages) {
      pSheet.addRow({
        url: p.url,
        status: p.statusCode,
        title: p.title || "",
        words: p.wordCount,
        h1: p.h1Count,
        ms: p.responseTimeMs,
      });
    }

    // ---- Sheet 4: Action Plan ----
    if (aiPlan?.action_plan) {
      const aSheet = wb.addWorksheet("Action Plan");
      aSheet.columns = [{ header: "Phase", width: 16 }, { header: "Task", width: 80 }];
      aSheet.getRow(1).font = { bold: true };
      const push = (phase: string, items: string[]) =>
        (items || []).forEach((t) => aSheet.addRow([phase, t]));
      push("30-Day", aiPlan.action_plan.day_30);
      push("60-Day", aiPlan.action_plan.day_60);
      push("90-Day", aiPlan.action_plan.day_90);
    }

    const buffer = await wb.xlsx.writeBuffer();
    const domain = (() => { try { return new URL(scan.rootUrl).hostname; } catch { return "site"; } })();

    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="seo-audit-${domain}.xlsx"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Export failed" }, { status: 500 });
  }
}
