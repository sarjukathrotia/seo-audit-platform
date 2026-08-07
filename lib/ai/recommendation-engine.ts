import Anthropic from "@anthropic-ai/sdk";
import {
  AIRecommendationResponse,
  CategoryScores,
  CoreWebVitals,
  IssueResult,
} from "../types/seo";

export async function generateAiRecommendations(
  rootUrl: string,
  scores: CategoryScores,
  issues: IssueResult[],
  perfMetrics?: CoreWebVitals | null,
  searchConsoleData: any = null,
  apiKey?: string
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
and — when available — Google Search Console data.

Your job:
1. Explain each significant issue in plain language a non-expert client can act on.
2. Prioritize fixes by impact-vs-effort, favoring issues that affect many pages
   or high-traffic pages (use Search Console data when present).
3. Produce a phased action plan grouped into 30-day, 60-day, and 90-day buckets.

Rules:
- Be concrete and specific to the data provided. Do not invent issues that are
  not in the input.
- For each recommendation, state: the problem, why it matters for SEO, and the
  exact action to take.
- Keep language professional and client-ready. No hype, no filler.
- Output valid JSON only, matching the schema given in the user message. No
  markdown, no commentary outside the JSON.`;

      const userMessage = `Website: ${rootUrl}
Overall score: ${scores.overall}
Category scores: ${JSON.stringify(scores, null, 2)}

Issues (grouped by code, with counts and example pages):
${JSON.stringify(groupedIssues, null, 2)}

Performance summary (homepage + sampled pages):
${JSON.stringify(perfMetrics || {}, null, 2)}

Search Console data (may be null):
${JSON.stringify(searchConsoleData, null, 2)}

Return JSON with this exact shape:
{
  "executive_summary": "string, 3-5 sentences",
  "prioritized_recommendations": [
    {
      "title": "string",
      "problem": "string",
      "why_it_matters": "string",
      "action": "string",
      "priority": "high|medium|low",
      "affected_page_count": number
    }
  ],
  "action_plan": {
    "day_30": ["string", ...],
    "day_60": ["string", ...],
    "day_90": ["string", ...]
  }
}`;

      const response = await client.messages.create({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 2500,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (textBlock && "text" in textBlock) {
        let rawJson = textBlock.text.trim();
        // Defensive parsing: strip code fences if present
        rawJson = rawJson.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
        const parsed = JSON.parse(rawJson);
        if (parsed.executive_summary && parsed.prioritized_recommendations && parsed.action_plan) {
          return parsed as AIRecommendationResponse;
        }
      }
    } catch (err) {
      console.warn("AI recommendation Claude call failed, using heuristic engine:", err);
    }
  }

  // High quality deterministic fallback matching the exact schema
  return generateDeterministicRecommendations(rootUrl, scores, groupedIssues, perfMetrics);
}

export function generateDeterministicRecommendations(
  rootUrl: string,
  scores: CategoryScores,
  groupedIssues: Array<{ code: string; title: string; category: string; severity: string; count: number; samplePages: string[] }>,
  perfMetrics?: CoreWebVitals | null
): AIRecommendationResponse {
  const domain = new URL(rootUrl).hostname;
  const criticalCount = groupedIssues.filter((i) => i.severity === "critical").length;
  const highCount = groupedIssues.filter((i) => i.severity === "high").length;

  const executive_summary = `Automated technical SEO audit for ${domain} identified an overall SEO Health Score of ${scores.overall}/100 (Grade ${scores.grade}). The crawl uncovered ${criticalCount} critical blocker(s) and ${highCount} high-priority optimization opportunities across Technical, On-Page, and Performance categories. Immediate remediation of broken internal paths, missing metadata, and Core Web Vitals bottlenecks will strengthen search crawl efficiency, indexation, and user conversion.`;

  const prioritized_recommendations: AIRecommendationResponse["prioritized_recommendations"] = [];
  const day_30: string[] = [];
  const day_60: string[] = [];
  const day_90: string[] = [];

  for (const item of groupedIssues) {
    let problem = `Detected ${item.count} instance(s) of ${item.title.toLowerCase()}.`;
    let why_it_matters = "Search engines penalize inconsistent signals and broken crawl paths, reducing organic visibility.";
    let action = `Resolve ${item.title} across all affected pages.`;
    let priority: "high" | "medium" | "low" = item.severity === "critical" || item.severity === "high" ? "high" : item.severity === "medium" ? "medium" : "low";

    if (item.code === "BROKEN_INTERNAL_LINK") {
      problem = `${item.count} internal link(s) return 4xx/5xx HTTP status codes.`;
      why_it_matters = "Broken links leak PageRank equity, waste crawl budget, and degrade user experience.";
      action = "Update outdated href destinations or implement 301 redirects to active equivalent URLs.";
      day_30.push(`Fix ${item.count} broken internal links to stop PageRank leakage`);
    } else if (item.code === "MISSING_TITLE" || item.code === "DUPLICATE_TITLE") {
      problem = `${item.count} page(s) have missing or duplicate title tags.`;
      why_it_matters = "The title tag is the single strongest on-page ranking signal for thematic relevance.";
      action = "Write unique, keyword-rich title tags (30–60 characters) matching user intent for every indexable URL.";
      day_30.push(`Write unique, optimized <title> tags for ${item.count} affected pages`);
    } else if (item.code === "MISSING_META_DESCRIPTION" || item.code === "DUPLICATE_META_DESCRIPTION") {
      problem = `${item.count} page(s) lack customized meta descriptions.`;
      why_it_matters = "Meta descriptions directly influence search result Click-Through Rates (CTR).";
      action = "Craft concise 70–160 character meta descriptions with clear value propositions and call-to-actions.";
      day_60.push(`Implement tailored meta descriptions across ${item.count} URLs to boost SERP CTR`);
    } else if (item.code === "MISSING_H1" || item.code === "MULTIPLE_H1") {
      problem = `${item.count} page(s) violate primary H1 heading hierarchy guidelines.`;
      why_it_matters = "A clear single H1 establishes page topical authority for search bots and assistive tech.";
      action = "Restructure HTML templates to render exactly one descriptive H1 tag per page.";
      day_30.push(`Ensure exactly one semantic H1 tag per template`);
    } else if (item.code === "IMAGES_MISSING_ALT") {
      problem = `${item.count} page(s) contain images without alt attributes.`;
      why_it_matters = "Alt text is required for Google Image Search indexing and WCAG accessibility standards.";
      action = "Add concise, descriptive alt tags to all substantive editorial and product images.";
      day_60.push(`Add descriptive alt attributes across all discovered images`);
    } else if (item.code === "THIN_CONTENT") {
      problem = `${item.count} content page(s) have fewer than 300 words of body copy.`;
      why_it_matters = "Google's helpful content algorithms deprioritize thin or superficial pages.";
      action = "Expand substantive depth, add FAQs, or consolidate related thin pages into topic pillars.";
      day_60.push(`Expand or consolidate thin content pages (<300 words)`);
    } else if (item.code === "MISSING_STRUCTURED_DATA") {
      problem = `${item.count} key landing page(s) lack Schema.org JSON-LD structured data.`;
      why_it_matters = "Rich results and knowledge graph eligibility require valid structured schema markup.";
      action = "Implement Organization, WebSite, BreadcrumbList, and Article/Product JSON-LD schema.";
      day_90.push(`Deploy Schema.org JSON-LD structured data on core templates`);
    } else if (item.code === "ROBOTS_TXT_MISSING" || item.code === "SITEMAP_MISSING_OR_EMPTY") {
      problem = "Robots.txt or XML Sitemap is missing or misconfigured.";
      why_it_matters = "Search crawlers require standard discovery entry points to allocate crawl budget efficiently.";
      action = "Generate a dynamic XML sitemap and configure standard robots.txt allow rules.";
      day_30.push("Publish valid /robots.txt and dynamic /sitemap.xml");
    } else {
      if (item.severity === "critical" || item.severity === "high") {
        day_30.push(`Remediate ${item.title} on affected pages`);
      } else if (item.severity === "medium") {
        day_60.push(`Optimize ${item.title}`);
      } else {
        day_90.push(`Refine ${item.title}`);
      }
    }

    prioritized_recommendations.push({
      title: item.title,
      problem,
      why_it_matters,
      action,
      priority,
      affected_page_count: item.count,
      issue_code: item.code,
    });
  }

  // Performance recommendations
  if (perfMetrics) {
    if (perfMetrics.lcp > 2.5) {
      prioritized_recommendations.push({
        title: "Optimize Largest Contentful Paint (LCP)",
        problem: `LCP is currently ${perfMetrics.lcp}s (target ≤ 2.5s).`,
        why_it_matters: "LCP is a core Google ranking factor and directly impacts bounce rate on mobile.",
        action: "Compress hero imagery with WebP/AVIF, preload critical assets, and defer non-essential JavaScript.",
        priority: "high",
        affected_page_count: 1,
      });
      day_30.push("Optimize hero images and server response time to bring LCP under 2.5s");
    }

    if (perfMetrics.cls > 0.1) {
      prioritized_recommendations.push({
        title: "Stabilize Cumulative Layout Shift (CLS)",
        problem: `CLS score is ${perfMetrics.cls} (target ≤ 0.1).`,
        why_it_matters: "Visual shifts degrade mobile usability and user interaction scores.",
        action: "Set explicit width and height attributes on all images and ad containers.",
        priority: "medium",
        affected_page_count: 1,
      });
      day_60.push("Add explicit dimension attributes to prevent layout shifts (CLS)");
    }
  }

  // Fill in default plan items if sparse
  if (day_30.length === 0) day_30.push("Audit and fix critical 4xx/5xx crawl errors", "Verify robots.txt and sitemap submission in Search Console");
  if (day_60.length === 0) day_60.push("Optimize title tags and meta descriptions for key target queries", "Improve page load speed and Core Web Vitals metrics");
  if (day_90.length === 0) day_90.push("Deploy advanced Schema.org structured data", "Build topic clusters and strengthen internal contextual linking");

  return {
    executive_summary,
    prioritized_recommendations: prioritized_recommendations.slice(0, 10),
    action_plan: {
      day_30: Array.from(new Set(day_30)).slice(0, 5),
      day_60: Array.from(new Set(day_60)).slice(0, 5),
      day_90: Array.from(new Set(day_90)).slice(0, 5),
    },
  };
}
