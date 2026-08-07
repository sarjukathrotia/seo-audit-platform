import { prisma } from "../db";
import { WebCrawler, CrawlOptions } from "../crawler/crawler";
import { runAllRules } from "../rules";
import { checkPerformance } from "../rules/performance";
import { calculateSeoScores } from "../scoring/calculator";
import { generateAiRecommendations } from "../ai/recommendation-engine";
import { ScanStatus } from "../types/seo";

export async function runScanPipeline(scanId: string): Promise<void> {
  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  if (!scan) {
    throw new Error(`Scan ${scanId} not found`);
  }

  const updateStatus = async (status: ScanStatus, summary?: string, error?: string) => {
    await prisma.scan.update({
      where: { id: scanId },
      data: { status, summary, error },
    });
  };

  try {
    // 1. Stage: CRAWLING
    await updateStatus("crawling", "Fetching robots.txt, sitemap.xml, and discovering pages...");

    const crawler = new WebCrawler({
      rootUrl: scan.rootUrl,
      maxPages: scan.maxPages,
      maxDepth: scan.maxDepth,
      renderJs: scan.renderJs,
      concurrency: 2,
      delayMs: 120,
      onStatusUpdate: (status, msg) => {
        // Log status update
      },
    });

    const crawlResult = await crawler.crawl();

    // 2. Persist crawled pages & links to Database
    const pageIdMap = new Map<string, string>();

    for (const crawledPage of crawlResult.pages) {
      const pageRecord = await prisma.page.create({
        data: {
          scanId,
          url: crawledPage.url,
          finalUrl: crawledPage.finalUrl,
          statusCode: crawledPage.statusCode,
          responseTimeMs: crawledPage.responseTimeMs,
          title: crawledPage.title,
          metaDescription: crawledPage.metaDescription,
          h1Count: crawledPage.h1List.length,
          wordCount: crawledPage.wordCount,
          canonicalUrl: crawledPage.canonicalUrl,
          robotsDirectives: crawledPage.robotsDirectives,
          rendered: crawledPage.rendered,
          depth: crawledPage.depth,
          contentType: crawledPage.contentType,
          headers: JSON.stringify(crawledPage.headers || {}),
        },
      });
      pageIdMap.set(crawledPage.url, pageRecord.id);
    }

    // Persist discovered links
    for (const crawledPage of crawlResult.pages) {
      const fromPageId = pageIdMap.get(crawledPage.url);
      if (!fromPageId) continue;

      for (const link of crawledPage.internalLinks) {
        await prisma.link.create({
          data: {
            scanId,
            fromPageId,
            targetUrl: link.url,
            isInternal: true,
            anchorText: link.anchorText || null,
          },
        });
      }
    }

    // 3. Stage: ANALYZING (Run rule engine)
    await updateStatus("analyzing", `Executing technical, on-page, security and accessibility rules on ${crawlResult.pages.length} pages...`);

    const rawIssues = runAllRules(crawlResult);

    // 4. Stage: SCORING & PERFORMANCE
    await updateStatus("scoring", "Evaluating Core Web Vitals and calculating SEO Health Scores...");

    const { metrics: perfMetrics, issues: perfIssues } = await checkPerformance(scan.rootUrl);
    const allIssues = [...rawIssues, ...perfIssues];

    // Persist page metrics
    const rootPageId = pageIdMap.get(scan.rootUrl) || (crawlResult.pages[0] ? pageIdMap.get(crawlResult.pages[0].url) : undefined);
    if (rootPageId) {
      await prisma.pageMetric.create({
        data: {
          pageId: rootPageId,
          perfScore: perfMetrics.perfScore,
          lcp: perfMetrics.lcp,
          inp: perfMetrics.inp,
          cls: perfMetrics.cls,
          fcp: perfMetrics.fcp,
          tbt: perfMetrics.tbt,
          opportunities: JSON.stringify(perfMetrics.opportunities),
        },
      });
    }

    // Persist issues to database
    for (const issue of allIssues) {
      const pageId = issue.pageUrl ? pageIdMap.get(issue.pageUrl) || null : null;
      await prisma.issue.create({
        data: {
          scanId,
          pageId,
          category: issue.category,
          code: issue.code,
          severity: issue.severity,
          title: issue.title,
          message: issue.message,
          detail: issue.detail ? JSON.stringify(issue.detail) : null,
        },
      });
    }

    // Calculate weighted category scores and overall grade
    const scores = calculateSeoScores(allIssues, perfMetrics.perfScore);

    // 5. Stage: GENERATING_REPORT (AI Recommendations)
    await updateStatus("generating_report", "Generating prioritized AI recommendations and phased 30/60/90-day action plan...");

    const aiPlan = await generateAiRecommendations(
      scan.rootUrl,
      scores,
      allIssues,
      perfMetrics,
      null // search console data
    );

    // Persist recommendations
    for (const rec of aiPlan.prioritized_recommendations) {
      await prisma.recommendation.create({
        data: {
          scanId,
          issueCode: rec.issue_code || null,
          title: rec.title,
          problem: rec.problem,
          whyItMatters: rec.why_it_matters,
          action: rec.action,
          priority: rec.priority,
          planBucket: "30",
          affectedPageCount: rec.affected_page_count,
        },
      });
    }

    // 6. Stage: COMPLETE
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: "complete",
        overallScore: scores.overall,
        technicalScore: scores.technical,
        onPageScore: scores.onpage,
        performanceScore: scores.performance,
        securityScore: scores.security,
        accessibilityScore: scores.accessibility,
        summary: aiPlan.executive_summary,
        aiPlan: JSON.stringify(aiPlan),
        completedAt: new Date(),
      },
    });
  } catch (err: any) {
    console.error(`Pipeline failed for scan ${scanId}:`, err);
    await updateStatus("failed", undefined, err.message || "Unknown error occurred during scan");
  }
}
