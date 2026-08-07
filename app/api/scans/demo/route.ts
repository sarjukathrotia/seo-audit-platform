import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST() {
  try {
    const demoUrl = "https://techflow-cloud.io";

    // Create completed scan row
    const scan = await prisma.scan.create({
      data: {
        rootUrl: demoUrl,
        status: "complete",
        maxPages: 25,
        maxDepth: 3,
        overallScore: 78,
        technicalScore: 82,
        onPageScore: 74,
        performanceScore: 71,
        securityScore: 90,
        accessibilityScore: 80,
        summary:
          "Comprehensive technical SEO audit for techflow-cloud.io discovered key opportunities in Core Web Vitals (LCP: 3.4s), missing meta descriptions on deep blog posts, and duplicate title tags across paginated catalog indexes. Addressing 3 broken internal links and adding JSON-LD structured data will immediately recover lost crawl budget.",
        aiPlan: JSON.stringify({
          executive_summary:
            "Techflow Cloud displays a solid technical foundation (Score: 78/100, Grade B), but is constrained by crawl inefficiencies and page speed bottlenecks on key conversion landing pages. Resolving 3 broken internal links, consolidating duplicate paginated title tags, and bringing Largest Contentful Paint under 2.5s will immediately elevate organic keyword rankings and SERP click-through rates.",
          prioritized_recommendations: [
            {
              title: "Fix 3 Broken Internal Links (HTTP 404)",
              problem: "Found 3 internal links pointing to deprecated feature URLs returning 404 errors.",
              why_it_matters: "Broken internal links leak PageRank equity and create dead ends for Googlebot crawl budget.",
              action: "Update navigation links to active equivalent pages or set up 301 permanent redirects.",
              priority: "high",
              affected_page_count: 3,
              issue_code: "BROKEN_INTERNAL_LINK",
            },
            {
              title: "Optimize Largest Contentful Paint (LCP)",
              problem: "LCP is currently 3.4s on the homepage due to uncompressed PNG hero assets.",
              why_it_matters: "LCP is a core Google ranking signal and directly affects mobile user bounce rates.",
              action: "Convert hero banners to WebP format, implement `fetchpriority='high'`, and defer non-critical JS.",
              priority: "high",
              affected_page_count: 1,
              issue_code: "POOR_LCP",
            },
            {
              title: "Write Unique Meta Descriptions",
              problem: "8 blog and product pages are missing custom `<meta name='description'>` tags.",
              why_it_matters: "Search engines auto-generate snippet text, reducing search snippet CTR.",
              action: "Add 140–160 character meta descriptions with clear benefits and keyword intent.",
              priority: "medium",
              affected_page_count: 8,
              issue_code: "MISSING_META_DESCRIPTION",
            },
            {
              title: "Deduplicate Title Tags on Paginated Pages",
              problem: "Blog pagination pages (/blog?page=2) share the identical title 'Techflow Cloud Blog'.",
              why_it_matters: "Duplicate title tags trigger cannibalization and prevent indexing of deep articles.",
              action: "Append dynamic page modifiers (e.g. 'Page 2 | Techflow Cloud') to paginated titles.",
              priority: "medium",
              affected_page_count: 4,
              issue_code: "DUPLICATE_TITLE",
            },
            {
              title: "Deploy Schema.org SoftwareApplication JSON-LD",
              problem: "No structured data markup was detected on pricing or product landing pages.",
              why_it_matters: "Structured data enables rich snippets, star ratings, and enhanced Google Knowledge Graph placement.",
              action: "Embed valid JSON-LD for Organization, WebSite, and SoftwareApplication schema.",
              priority: "low",
              affected_page_count: 5,
              issue_code: "MISSING_STRUCTURED_DATA",
            },
          ],
          action_plan: {
            day_30: [
              "Fix 3 broken internal 404 links on header and footer nav",
              "Compress hero imagery with WebP and preload LCP elements",
              "Submit updated XML sitemap to Google Search Console",
            ],
            day_60: [
              "Write unique meta descriptions for 8 top landing pages",
              "Implement dynamic pagination modifiers in title tags",
              "Add descriptive alt text to 12 product feature images",
            ],
            day_90: [
              "Deploy Schema.org SoftwareApplication JSON-LD markup",
              "Build topic cluster internal links between blog articles and feature pages",
              "Audit Core Web Vitals field data in Search Console",
            ],
          },
        }),
        completedAt: new Date(),
      },
    });

    // Create sample pages
    const p1 = await prisma.page.create({
      data: {
        scanId: scan.id,
        url: `${demoUrl}/`,
        finalUrl: `${demoUrl}/`,
        statusCode: 200,
        responseTimeMs: 180,
        title: "Techflow Cloud — Next-Gen Serverless Analytics Platform",
        metaDescription: "Scale your cloud infrastructure with real-time serverless observability, automated workflows, and instant queries.",
        h1Count: 1,
        wordCount: 1250,
        canonicalUrl: `${demoUrl}/`,
        robotsDirectives: "index, follow",
        depth: 0,
        rendered: true,
        contentType: "text/html",
      },
    });

    const p2 = await prisma.page.create({
      data: {
        scanId: scan.id,
        url: `${demoUrl}/pricing`,
        finalUrl: `${demoUrl}/pricing`,
        statusCode: 200,
        responseTimeMs: 210,
        title: "Pricing Plans & Tier Comparison | Techflow Cloud",
        metaDescription: "Transparent pay-as-you-go pricing for development teams and enterprise organizations. Start free.",
        h1Count: 1,
        wordCount: 890,
        canonicalUrl: `${demoUrl}/pricing`,
        robotsDirectives: "index, follow",
        depth: 1,
        rendered: true,
        contentType: "text/html",
      },
    });

    const p3 = await prisma.page.create({
      data: {
        scanId: scan.id,
        url: `${demoUrl}/features/legacy-v1`,
        finalUrl: `${demoUrl}/features/legacy-v1`,
        statusCode: 404,
        responseTimeMs: 95,
        title: null,
        metaDescription: null,
        h1Count: 0,
        wordCount: 45,
        depth: 1,
        contentType: "text/html",
      },
    });

    const p4 = await prisma.page.create({
      data: {
        scanId: scan.id,
        url: `${demoUrl}/blog`,
        finalUrl: `${demoUrl}/blog`,
        statusCode: 200,
        responseTimeMs: 240,
        title: "Techflow Cloud Blog — Engineering & Cloud Insights",
        metaDescription: null,
        h1Count: 1,
        wordCount: 1600,
        canonicalUrl: `${demoUrl}/blog`,
        depth: 1,
        contentType: "text/html",
      },
    });

    const p5 = await prisma.page.create({
      data: {
        scanId: scan.id,
        url: `${demoUrl}/blog/zero-downtime-deployments`,
        finalUrl: `${demoUrl}/blog/zero-downtime-deployments`,
        statusCode: 200,
        responseTimeMs: 190,
        title: "How to Achieve Zero-Downtime Deployments at Scale",
        metaDescription: "A deep dive into blue-green deployments, canary releases, and automated health checks in Kubernetes.",
        h1Count: 2,
        wordCount: 2400,
        canonicalUrl: `${demoUrl}/blog/zero-downtime-deployments`,
        depth: 2,
        contentType: "text/html",
      },
    });

    // Create metrics for homepage
    await prisma.pageMetric.create({
      data: {
        pageId: p1.id,
        perfScore: 71,
        lcp: 3.4,
        inp: 180,
        cls: 0.08,
        fcp: 1.9,
        tbt: 320,
        opportunities: JSON.stringify([
          { title: "Properly size and compress hero images", description: "Serve images in next-gen WebP/AVIF format to save bandwidth.", savings: "1.2s" },
          { title: "Eliminate render-blocking stylesheets", description: "Defer non-critical CSS or deliver critical CSS inline.", savings: "480ms" },
          { title: "Reduce unused JavaScript", description: "Split vendor bundles to avoid parsing unnecessary client code.", savings: "290ms" },
        ]),
      },
    });

    // Create issues
    const sampleIssues = [
      {
        category: "technical",
        code: "BROKEN_INTERNAL_LINK",
        severity: "critical",
        title: "Broken Internal Link (HTTP 404)",
        message: "Internal link pointing to '/features/legacy-v1' returns HTTP 404 Not Found.",
        pageId: p1.id,
      },
      {
        category: "performance",
        code: "POOR_LCP",
        severity: "high",
        title: "Poor Largest Contentful Paint (3.4s)",
        message: "Hero section takes 3.4s to render, exceeding Google's 2.5s good threshold.",
        pageId: p1.id,
      },
      {
        category: "technical",
        code: "DUPLICATE_TITLE",
        severity: "high",
        title: "Duplicate Title Tags Across Pagination",
        message: "Identical title tag found on '/blog' and '/blog?page=2'.",
        pageId: p4.id,
      },
      {
        category: "technical",
        code: "MISSING_META_DESCRIPTION",
        severity: "medium",
        title: "Missing Meta Description",
        message: "No meta description tag provided on main blog index.",
        pageId: p4.id,
      },
      {
        category: "technical",
        code: "MULTIPLE_H1",
        severity: "medium",
        title: "Multiple H1 Headings on Single Page",
        message: "Found 2 <h1> tags on the blog post page. Maintain a single primary H1 heading.",
        pageId: p5.id,
      },
      {
        category: "onpage",
        code: "IMAGES_MISSING_ALT",
        severity: "medium",
        title: "Images Missing Alt Text",
        message: "3 architectural diagrams lack descriptive alt text attributes.",
        pageId: p5.id,
      },
      {
        category: "onpage",
        code: "MISSING_STRUCTURED_DATA",
        severity: "low",
        title: "Missing Schema.org Structured Data",
        message: "Pricing page lacks SoftwareApplication / Product JSON-LD schema.",
        pageId: p2.id,
      },
      {
        category: "security",
        code: "MISSING_HSTS",
        severity: "low",
        title: "Missing HSTS Header",
        message: "Strict-Transport-Security header is not present on response.",
        pageId: p1.id,
      },
    ];

    for (const issue of sampleIssues) {
      await prisma.issue.create({
        data: {
          scanId: scan.id,
          pageId: issue.pageId,
          category: issue.category,
          code: issue.code,
          severity: issue.severity,
          title: issue.title,
          message: issue.message,
        },
      });
    }

    return NextResponse.json({
      scanId: scan.id,
      status: scan.status,
      rootUrl: scan.rootUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create demo scan" }, { status: 500 });
  }
}
