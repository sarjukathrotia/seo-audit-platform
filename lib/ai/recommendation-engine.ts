import Anthropic from "@anthropic-ai/sdk";
import {
  AIRecommendationResponse,
  CategoryScores,
  CMSPlatform,
  CodeSnippet,
  CoreWebVitals,
  IssueResult,
  RecommendationItem,
} from "../types/seo";

export async function generateAiRecommendations(
  rootUrl: string,
  scores: CategoryScores,
  issues: IssueResult[],
  perfMetrics?: CoreWebVitals | null,
  searchConsoleData: any = null,
  apiKey?: string,
  platform: CMSPlatform = "custom"
): Promise<AIRecommendationResponse> {
  const anthropicKey = apiKey || process.env.ANTHROPIC_API_KEY;

  // Group issues by code
  const groupedIssuesMap = new Map<
    string,
    { code: string; title: string; category: string; severity: string; count: number; samplePages: string[] }
  >();

  for (const issue of issues) {
    const existing = groupedIssuesMap.get(issue.code) || {
      code: issue.code,
      title: issue.title,
      category: issue.category,
      severity: issue.severity,
      count: 0,
      samplePages: [],
    };
    existing.count += 1;
    if (issue.pageUrl && existing.samplePages.length < 3) {
      existing.samplePages.push(issue.pageUrl);
    }
    groupedIssuesMap.set(issue.code, existing);
  }

  const groupedIssues = Array.from(groupedIssuesMap.values()).sort((a, b) => {
    const sevOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    return (sevOrder[b.severity] || 0) - (sevOrder[a.severity] || 0) || b.count - a.count;
  });

  if (anthropicKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicKey });

      const systemPrompt = `You are an expert technical SEO consultant. You will receive structured JSON
describing the findings of an automated SEO audit for one website: detected
issues (with category, code, severity, and affected pages), performance metrics,
detected CMS/platform (${platform}), and — when available — Google Search Console data.

Your job:
1. Explain each significant issue in plain language a non-expert client can act on.
2. Provide two clear rating badges for each recommendation:
   - "impact": "high" | "medium" | "low"
   - "effort": "quick_win" | "moderate" | "complex"
3. Provide step-by-step platform-specific instructions in "how_to_fix" (e.g. specific to ${platform} admin navigation).
4. Provide copy-paste code snippets in "code_snippet" where applicable (e.g., Schema JSON-LD, robots.txt, canonical tags).
5. State an "estimated_result" (e.g. "Eliminates duplicate content penalty and lifts collection ranking").
6. Group phased action plan into 30-day, 60-day, and 90-day buckets.

Rules:
- Output valid JSON only matching the schema given. No markdown code blocks, no commentary outside JSON.`;

      const userMessage = `Website: ${rootUrl}
Platform: ${platform}
Overall score: ${scores.overall}
Category scores: ${JSON.stringify(scores, null, 2)}

Issues:
${JSON.stringify(groupedIssues, null, 2)}

Performance summary:
${JSON.stringify(perfMetrics || {}, null, 2)}

Search Console data:
${JSON.stringify(searchConsoleData, null, 2)}

Return JSON with this exact shape:
{
  "executive_summary": "string, 3-5 sentences",
  "detected_platform": "${platform}",
  "prioritized_recommendations": [
    {
      "title": "string",
      "problem": "string",
      "why_it_matters": "string",
      "action": "string",
      "priority": "high|medium|low",
      "impact": "high|medium|low",
      "effort": "quick_win|moderate|complex",
      "affected_page_count": number,
      "how_to_fix": ["Step 1...", "Step 2..."],
      "code_snippet": {
        "language": "html|json|txt",
        "code": "string",
        "filename": "optional filename",
        "description": "optional brief description"
      },
      "estimated_result": "string"
    }
  ],
  "action_plan": {
    "day_30": ["string", ...],
    "day_60": ["string", ...],
    "day_90": ["string", ...]
  }
}`;

      const response = await client.messages.create({
        model: "claude-3-7-sonnet-latest",
        max_tokens: 3000,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (textBlock && "text" in textBlock) {
        let rawJson = textBlock.text.trim();
        rawJson = rawJson.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
        const parsed = JSON.parse(rawJson);
        if (parsed.executive_summary && parsed.prioritized_recommendations && parsed.action_plan) {
          return parsed as AIRecommendationResponse;
        }
      }
    } catch (err) {
      console.warn("[SEO Audit AI] Claude API call failed, using deterministic engine:", err);
    }
  } else {
    console.warn("[SEO Audit AI] Notice: ANTHROPIC_API_KEY is not set in environment. Using deterministic heuristic recommendation engine.");
  }

  // High quality deterministic fallback matching the exact schema with platform recipes & code snippets
  return generateDeterministicRecommendations(rootUrl, scores, groupedIssues, perfMetrics, platform);
}

export function generateDeterministicRecommendations(
  rootUrl: string,
  scores: CategoryScores,
  groupedIssues: Array<{ code: string; title: string; category: string; severity: string; count: number; samplePages: string[] }>,
  perfMetrics?: CoreWebVitals | null,
  platform: CMSPlatform = "custom"
): AIRecommendationResponse {
  const domain = (() => {
    try {
      return new URL(rootUrl).hostname;
    } catch {
      return "website";
    }
  })();

  const criticalCount = groupedIssues.filter((i) => i.severity === "critical").length;
  const highCount = groupedIssues.filter((i) => i.severity === "high").length;

  const executive_summary = `Automated technical SEO audit for ${domain} (${platform.toUpperCase()}) identified an overall SEO Health Score of ${scores.overall}/100 (Grade ${scores.grade}). The crawl identified ${criticalCount} critical blocker(s) and ${highCount} high-leverage optimization opportunities. Implementing the prioritized quick wins below will immediately eliminate search crawl waste, consolidate link equity, and improve search visibility.`;

  const prioritized_recommendations: RecommendationItem[] = [];
  const day_30: string[] = [];
  const day_60: string[] = [];
  const day_90: string[] = [];

  for (const item of groupedIssues) {
    let problem = `Detected ${item.count} instance(s) of ${item.title.toLowerCase()}.`;
    let why_it_matters = "Inconsistent technical signals and missing tags dilute search rankings.";
    let action = `Resolve ${item.title} across all affected pages.`;
    let priority: "high" | "medium" | "low" = item.severity === "critical" || item.severity === "high" ? "high" : "medium";
    let impact: "high" | "medium" | "low" = priority;
    let effort: "quick_win" | "moderate" | "complex" = "moderate";
    let how_to_fix: string[] = [];
    let code_snippet: CodeSnippet | undefined = undefined;
    let estimated_result = "Improves organic crawl efficiency and SERP presentation.";

    if (item.code === "BROKEN_INTERNAL_LINK" || item.code === "PAGE_NOT_FOUND_4XX") {
      problem = `${item.count} internal link(s) return 404 or 500 status codes.`;
      why_it_matters = "Broken links leak PageRank equity, waste Googlebot crawl budget, and degrade user experience.";
      action = "Update outdated href destinations or implement 301 redirects to active equivalent URLs.";
      impact = "high";
      effort = "quick_win";
      how_to_fix = [
        "Open your site's redirect manager or web server configuration.",
        "Map each dead URL to its relevant active category or parent page.",
        "Update the internal link anchors across your navigation and footer templates.",
      ];
      code_snippet = {
        language: "apache",
        code: `# 301 Permanent Redirects\nRedirect 301 /old-broken-path /new-active-destination`,
        filename: ".htaccess / redirect rules",
        description: "Standard 301 Permanent Redirect rule",
      };
      estimated_result = "Restores crawl equity and eliminates dead-end 404 crawl errors.";
      day_30.push(`Fix ${item.count} broken internal links to stop PageRank leakage`);
    } else if (item.code === "MISSING_TITLE" || item.code === "DUPLICATE_TITLE") {
      problem = `${item.count} page(s) lack a unique <title> tag.`;
      why_it_matters = "The title tag is the primary on-page signal used by Google and searchers to determine page relevance.";
      action = "Add a unique, keyword-rich title tag under 60 characters to each flagged page.";
      impact = "high";
      effort = "quick_win";
      how_to_fix =
        platform === "shopify"
          ? [
              "Log in to Shopify Admin -> Online Store -> Pages (or Products).",
              "Click on the affected page and scroll to 'Search engine listing'.",
              "Click 'Edit website SEO' and enter a descriptive page title (50-60 characters).",
            ]
          : platform === "wordpress"
          ? [
              "Open the WordPress post/page editor.",
              "Scroll down to Yoast SEO or Rank Math panel.",
              "Enter a focused SEO title containing your primary keyword.",
            ]
          : [
              "Open the HTML document for each page.",
              "Insert a `<title>Primary Keyword - Brand Name</title>` inside the `<head>` section.",
            ];
      code_snippet = {
        language: "html",
        code: `<title>Primary Keyword - Brand Name</title>`,
        description: "Optimized HTML <title> tag",
      };
      estimated_result = "Improves organic click-through rates (CTR) and primary keyword rankings.";
      day_30.push(`Add unique, descriptive <title> tags to ${item.count} page(s)`);
    } else if (item.code === "MISSING_META_DESCRIPTION") {
      problem = `${item.count} page(s) are missing a meta description.`;
      why_it_matters = "Without a meta description, search engines auto-generate snippet snippets from random body text, depressing CTR.";
      action = "Write compelling meta descriptions (120–158 characters) with a clear value proposition.";
      impact = "medium";
      effort = "quick_win";
      how_to_fix =
        platform === "shopify"
          ? [
              "In Shopify Admin, edit the page/product search engine listing.",
              "Provide a 140-155 character description with a call to action.",
            ]
          : [
              "Add `<meta name=\"description\" content=\"...\">` to the `<head>` tag of each page.",
            ];
      code_snippet = {
        language: "html",
        code: `<meta name="description" content="Discover our complete range of lab reagents and industrial supplies with fast shipping and ISO certified quality.">`,
        description: "Optimized Meta Description Tag",
      };
      estimated_result = "Increases search result click-through rates by up to 15%.";
      day_30.push(`Write compelling meta descriptions for ${item.count} page(s)`);
    } else if (item.code === "MISSING_STRUCTURED_DATA" || item.code === "MISSING_PRODUCT_SCHEMA") {
      problem = `${item.count} page(s) lack Schema.org structured data.`;
      why_it_matters = "Structured data unlocks Google rich snippets (star ratings, prices, availability, search breadcrumbs).";
      action = "Inject JSON-LD Schema markup into page headers.";
      impact = "high";
      effort = "moderate";
      how_to_fix = [
        "Generate JSON-LD structured data for the entity type (Organization, Product, WebSite).",
        "Embed the `<script type=\"application/ld+json\">` block directly into the page `<head>`.",
        "Validate the output using Google's Rich Results Test tool.",
      ];
      code_snippet = {
        language: "json",
        code: `<script type="application/ld+json">\n{\n  "@context": "https://schema.org/",\n  "@type": "Product",\n  "name": "Product Name",\n  "image": "https://${domain}/product.jpg",\n  "description": "Product description",\n  "offers": {\n    "@type": "Offer",\n    "priceCurrency": "USD",\n    "price": "27.62",\n    "availability": "https://schema.org/InStock"\n  }\n}\n</script>`,
        filename: "product-schema.jsonld",
        description: "Google Rich Snippets Product JSON-LD",
      };
      estimated_result = "Enables rich search snippets with star ratings, pricing, and stock availability.";
      day_60.push(`Implement JSON-LD Schema structured data across ${item.count} pages`);
    } else if (item.code === "SHOPIFY_COLLECTION_PRODUCT_DUPLICATE") {
      problem = `Shopify is linking to nested /collections/*/products/* URLs instead of canonical /products/* paths.`;
      why_it_matters = "Causes duplicate internal link equity dilution and forces Googlebot to crawl multiple URLs for the same product.";
      action = "Update Shopify Liquid collection templates to reference the root `product.url` instead of `product.url_within_collection`.";
      impact = "high";
      effort = "quick_win";
      how_to_fix = [
        "In Shopify Admin -> Online Store -> Themes -> Edit Code.",
        "Open `snippets/product-card.liquid` (or `product-grid-item.liquid`).",
        "Replace `{{ product.url | within: collection }}` with `{{ product.url }}`.",
        "Save and re-scan.",
      ];
      code_snippet = {
        language: "liquid",
        code: `{%- comment -%} Change collection nested URL to canonical root {%- endcomment -%}\n<a href="{{ product.url }}">\n  {{ product.title }}\n</a>`,
        filename: "snippets/product-card.liquid",
        description: "Shopify Liquid Canonical URL Fix",
      };
      estimated_result = "Consolidates all product link equity into single canonical URLs and eliminates crawl waste.";
      day_30.push("Update Shopify Liquid theme to reference canonical /products/* URLs");
    } else if (item.code === "POOR_LCP" || item.code === "NEEDS_WORK_LCP") {
      problem = `Largest Contentful Paint (${perfMetrics?.lcp || 3.8}s) exceeds the Google 2.5s threshold.`;
      why_it_matters = "Core Web Vitals are an active Google ranking factor and directly influence conversion rate.";
      action = "Preload hero images, defer render-blocking JavaScript, and convert images to WebP/AVIF.";
      impact = "high";
      effort = "moderate";
      how_to_fix = [
        "Identify the LCP hero image and add `<link rel=\"preload\" as=\"image\">` in `<head>`.",
        "Ensure image has explicit `width` and `height` attributes to prevent layout shift.",
        "Defer non-critical third-party analytics and chat widgets.",
      ];
      code_snippet = {
        language: "html",
        code: `<link rel="preload" fetchpriority="high" as="image" href="/hero-banner.webp" type="image/webp">`,
        description: "High-Priority LCP Hero Image Preload",
      };
      estimated_result = "Lifts LCP to <2.5s and passes Google Core Web Vitals assessment.";
      day_60.push("Optimize hero image loading and defer render-blocking scripts");
    } else {
      how_to_fix = [
        `Review the ${item.count} affected URLs in the Issues table.`,
        "Implement necessary content and tag optimizations in your CMS editor.",
        "Re-scan the website to verify resolution.",
      ];
      day_90.push(`Resolve ${item.title}`);
    }

    prioritized_recommendations.push({
      title: item.title,
      problem,
      why_it_matters,
      action,
      priority,
      impact,
      effort,
      affected_page_count: item.count,
      issue_code: item.code,
      how_to_fix,
      code_snippet,
      estimated_result,
    });
  }

  // Sort quick wins (High Impact + Quick Win) to the very top!
  prioritized_recommendations.sort((a, b) => {
    const isQuickWinA = a.effort === "quick_win" && a.impact === "high" ? 1 : 0;
    const isQuickWinB = b.effort === "quick_win" && b.impact === "high" ? 1 : 0;
    return isQuickWinB - isQuickWinA;
  });

  return {
    executive_summary,
    detected_platform: platform,
    prioritized_recommendations: prioritized_recommendations.slice(0, 10),
    action_plan: {
      day_30: Array.from(new Set(day_30)).slice(0, 6),
      day_60: Array.from(new Set(day_60)).slice(0, 6),
      day_90: Array.from(new Set(day_90)).slice(0, 6),
    },
  };
}
