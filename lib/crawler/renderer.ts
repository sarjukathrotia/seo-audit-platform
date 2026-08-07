import { chromium } from "playwright";

export async function renderHtml(url: string, timeoutMs = 20000): Promise<string | null> {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage({
      userAgent: "Mozilla/5.0 (compatible; SEOAuditBot/1.0; +https://example.com/bot)",
    });
    await page.goto(url, { waitUntil: "networkidle", timeout: timeoutMs });
    return await page.content();
  } catch {
    return null;
  } finally {
    if (browser) await browser.close();
  }
}
