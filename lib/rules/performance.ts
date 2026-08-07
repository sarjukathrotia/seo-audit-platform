import { CoreWebVitals, IssueResult, CrawledPageData } from "../types/seo";

export async function checkPerformance(
  targetUrl: string,
  samplePage?: CrawledPageData,
  apiKey?: string
): Promise<{ metrics: CoreWebVitals; issues: IssueResult[] }> {
  // Read key from env if not passed explicitly
  const key = apiKey || process.env.PAGESPEED_API_KEY;

  if (key) {
    try {
      const endpoint =
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
        `?url=${encodeURIComponent(targetUrl)}&key=${key}` +
        `&strategy=mobile&category=performance`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const lh = data.lighthouseResult;
        const audits = lh?.audits || {};
        const categories = lh?.categories || {};

        // Only trust real values; if an audit is missing, treat as unknown (0)
        const perfScore = Math.round((categories.performance?.score ?? 0) * 100);
        const lcp = (audits["largest-contentful-paint"]?.numericValue ?? 0) / 1000;
        const cls = audits["cumulative-layout-shift"]?.numericValue ?? 0;
        const fcp = (audits["first-contentful-paint"]?.numericValue ?? 0) / 1000;
        const tbt = audits["total-blocking-time"]?.numericValue ?? 0;
        const inp = audits["interaction-to-next-paint"]?.numericValue ?? 0;

        const opportunities: CoreWebVitals["opportunities"] = [];
        const oppKeys = [
          "render-blocking-resources",
          "unused-javascript",
          "unused-css-rules",
          "modern-image-formats",
          "uses-optimized-images",
          "uses-text-compression",
          "uses-responsive-images",
        ];
        for (const k of oppKeys) {
          const a = audits[k];
          if (a && a.score !== null && a.score < 0.9) {
            opportunities.push({
              title: a.title,
              description: a.description?.split("[Learn")[0]?.trim() || a.title,
              savings: a.displayValue || undefined,
            });
          }
        }

        const metrics: CoreWebVitals = {
          perfScore,
          lcp: parseFloat(lcp.toFixed(2)),
          inp: Math.round(inp),
          cls: parseFloat(cls.toFixed(3)),
          fcp: parseFloat(fcp.toFixed(2)),
          tbt: Math.round(tbt),
          opportunities,
          source: "measured",
        };
        return { metrics, issues: evaluateVitalsIssues(metrics, targetUrl) };
      }
    } catch (err) {
      console.warn("PageSpeed API failed, using estimate:", err);
    }
  }

  // No key or API failed -> estimate from REAL crawl data of this page
  return estimatePerformance(targetUrl, samplePage);
}

// Honest estimate derived from the page's OWN measured response time and assets.
// Marked source:"estimated" so the UI can label it clearly.
export function estimatePerformance(
  targetUrl: string,
  samplePage?: CrawledPageData
): { metrics: CoreWebVitals; issues: IssueResult[] } {
  const responseTime = samplePage?.responseTimeMs ?? 500;
  const imageCount = samplePage?.images.length ?? 0;
  const wordCount = samplePage?.wordCount ?? 500;

  const lcp = parseFloat(
    Math.min(6, 0.9 + (responseTime / 1000) * 1.8 + (imageCount > 10 ? 1.0 : imageCount * 0.05)).toFixed(2)
  );
  const fcp = parseFloat(Math.min(4, 0.6 + (responseTime / 1000) * 1.3).toFixed(2));
  const cls = parseFloat((imageCount > 8 ? 0.14 : imageCount > 3 ? 0.06 : 0.02).toFixed(3));
  const tbt = Math.min(900, Math.round(60 + wordCount / 25 + imageCount * 14));
  const inp = Math.min(500, Math.round(100 + imageCount * 12));

  let perfScore = 100;
  if (lcp > 2.5) perfScore -= 18;
  if (lcp > 4.0) perfScore -= 15;
  if (cls > 0.1) perfScore -= 12;
  if (cls > 0.25) perfScore -= 12;
  if (tbt > 200) perfScore -= 12;
  if (tbt > 600) perfScore -= 12;
  if (fcp > 1.8) perfScore -= 8;
  perfScore = Math.max(20, Math.min(99, perfScore));

  const opportunities: CoreWebVitals["opportunities"] = [];
  if (imageCount > 5)
    opportunities.push({
      title: "Serve images in next-gen formats (WebP/AVIF)",
      description: "WebP/AVIF compress better than PNG/JPEG.",
      savings: `~${imageCount * 25} KB est.`,
    });
  if (lcp > 2.5)
    opportunities.push({
      title: "Reduce server response time / render-blocking resources",
      description: "Defer non-critical JS/CSS and speed up the initial response.",
    });

  const metrics: CoreWebVitals = {
    perfScore,
    lcp,
    inp,
    cls,
    fcp,
    tbt,
    opportunities,
    source: "estimated",
  };
  return { metrics, issues: evaluateVitalsIssues(metrics, targetUrl) };
}

function evaluateVitalsIssues(m: CoreWebVitals, url: string): IssueResult[] {
  const issues: IssueResult[] = [];
  if (m.lcp > 4.0)
    issues.push({
      category: "performance",
      code: "POOR_LCP",
      severity: "high",
      title: `Poor LCP (${m.lcp}s)`,
      message: `LCP is ${m.lcp}s (target ≤ 2.5s). Main content loads slowly.`,
      pageUrl: url,
      detail: { lcp: m.lcp },
    });
  else if (m.lcp > 2.5)
    issues.push({
      category: "performance",
      code: "NEEDS_WORK_LCP",
      severity: "medium",
      title: `LCP Needs Improvement (${m.lcp}s)`,
      message: `LCP is ${m.lcp}s, above the 2.5s target.`,
      pageUrl: url,
      detail: { lcp: m.lcp },
    });

  if (m.cls > 0.25)
    issues.push({
      category: "performance",
      code: "POOR_CLS",
      severity: "high",
      title: `High CLS (${m.cls})`,
      message: `CLS is ${m.cls} (target ≤ 0.1). Layout shifts during load.`,
      pageUrl: url,
      detail: { cls: m.cls },
    });

  if (m.tbt > 600)
    issues.push({
      category: "performance",
      code: "POOR_TBT",
      severity: "high",
      title: `Excessive Total Blocking Time (${m.tbt}ms)`,
      message: `Main thread blocked ${m.tbt}ms. Break up long JS tasks.`,
      pageUrl: url,
      detail: { tbt: m.tbt },
    });

  return issues;
}
