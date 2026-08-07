import { CrawledPageData, IssueResult } from "../types/seo";

/**
 * 6.2 On-Page SEO Checks
 */

const GENERIC_TITLES = new Set(["home", "untitled", "index", "welcome", "page 1", "default", "landing"]);
const GENERIC_ANCHORS = new Set(["click here", "read more", "learn more", "here", "link", "view more", "more", "this page"]);

// 1. Weak / generic title
export function checkWeakTitle(page: CrawledPageData): IssueResult[] {
  if (!page.title) return [];
  const normalized = page.title.trim().toLowerCase();
  if (GENERIC_TITLES.has(normalized)) {
    return [
      {
        category: "onpage",
        code: "WEAK_GENERIC_TITLE",
        severity: "medium",
        title: "Generic / Weak Title Tag",
        message: `Page title is "${page.title}", which lacks descriptive keyword intent. Target specific primary keywords and brand identifiers.`,
        pageUrl: page.url,
      },
    ];
  }
  return [];
}

// 2. Thin content (< 300 words)
export function checkThinContent(page: CrawledPageData): IssueResult[] {
  if (page.statusCode !== 200) return [];
  if (page.wordCount < 300) {
    return [
      {
        category: "onpage",
        code: "THIN_CONTENT",
        severity: "medium",
        title: `Thin Content (${page.wordCount} Words)`,
        message: `This page contains only ${page.wordCount} words of visible body text. Pages under 300 words struggle to rank for competitive queries.`,
        pageUrl: page.url,
        detail: { wordCount: page.wordCount },
      },
    ];
  }
  return [];
}

// 3. Images missing ALT text
export function checkImagesMissingAlt(page: CrawledPageData): IssueResult[] {
  const missing = page.images.filter((img) => !img.alt || img.alt.trim().length === 0);
  if (missing.length > 0) {
    return [
      {
        category: "onpage",
        code: "IMAGES_MISSING_ALT",
        severity: "medium",
        title: `${missing.length} Image(s) Missing Alt Text`,
        message: `${missing.length} image(s) on this page lack descriptive \`alt\` attributes, harming image SEO search rankings and accessibility.`,
        pageUrl: page.url,
        detail: { count: missing.length, sampleImages: missing.slice(0, 5).map((i) => i.src) },
      },
    ];
  }
  return [];
}

// 4. Outbound internal links check (dead-end page)
export function checkNoOutboundLinks(page: CrawledPageData): IssueResult[] {
  if (page.internalLinks.length === 0 && page.statusCode === 200) {
    return [
      {
        category: "onpage",
        code: "NO_INTERNAL_OUTBOUND_LINKS",
        severity: "low",
        title: "Dead-End Page (No Outbound Internal Links)",
        message: "This page contains zero internal outbound links to other site pages, trapping PageRank flow and bot crawlers.",
        pageUrl: page.url,
      },
    ];
  }
  return [];
}

// 5. Non-descriptive anchor texts
export function checkNonDescriptiveAnchors(page: CrawledPageData): IssueResult[] {
  const genericLinks = page.internalLinks.filter((l) => GENERIC_ANCHORS.has(l.anchorText.toLowerCase().trim()));
  if (genericLinks.length > 0) {
    return [
      {
        category: "onpage",
        code: "NON_DESCRIPTIVE_ANCHOR",
        severity: "low",
        title: "Non-Descriptive Anchor Text Used",
        message: `Found ${genericLinks.length} link(s) with generic anchor text like "${genericLinks[0].anchorText}". Use descriptive keyword-rich anchors.`,
        pageUrl: page.url,
        detail: { count: genericLinks.length, sampleTargets: genericLinks.slice(0, 3).map((l) => l.url) },
      },
    ];
  }
  return [];
}

// 6. URL quality checks (length, uppercase, underscores, excessive query params)
export function checkUrlQuality(page: CrawledPageData): IssueResult[] {
  const issues: IssueResult[] = [];
  try {
    const parsed = new URL(page.url);

    if (page.url.length > 100) {
      issues.push({
        category: "onpage",
        code: "URL_TOO_LONG",
        severity: "low",
        title: `URL Exceeds 100 Characters (${page.url.length} chars)`,
        message: "Long URLs can be truncated in search snippets and are less memorable for users.",
        pageUrl: page.url,
      });
    }

    if (/[A-Z]/.test(parsed.pathname)) {
      issues.push({
        category: "onpage",
        code: "URL_HAS_UPPERCASE",
        severity: "low",
        title: "Uppercase Characters in URL Path",
        message: "Uppercase letters in URLs can cause duplicate content issues on case-sensitive servers. Use all-lowercase URLs.",
        pageUrl: page.url,
      });
    }

    if (parsed.pathname.includes("_")) {
      issues.push({
        category: "onpage",
        code: "URL_HAS_UNDERSCORES",
        severity: "low",
        title: "Underscores in URL Path",
        message: "Google treats hyphens as word separators, but underscores join words into a single compound token. Use hyphens instead.",
        pageUrl: page.url,
      });
    }

    const queryCount = Array.from(parsed.searchParams.keys()).length;
    if (queryCount > 3) {
      issues.push({
        category: "onpage",
        code: "EXCESSIVE_URL_PARAMETERS",
        severity: "low",
        title: `URL Contains ${queryCount} Query Parameters`,
        message: "Clean, canonical URLs without excessive parameters rank higher and avoid spider trap crawl loops.",
        pageUrl: page.url,
      });
    }
  } catch {
    // ignore unparseable URLs
  }
  return issues;
}

// 7. Structured data (Schema.org / JSON-LD)
export function checkStructuredData(page: CrawledPageData): IssueResult[] {
  if (!page.hasStructuredData && page.depth <= 1 && page.statusCode === 200) {
    return [
      {
        category: "onpage",
        code: "MISSING_STRUCTURED_DATA",
        severity: "low",
        title: "Missing Structured Data (Schema.org)",
        message: "No JSON-LD structured data detected. Adding Schema.org markup (Organization, WebSite, Article, Product) earns rich snippets in Google.",
        pageUrl: page.url,
      },
    ];
  }
  return [];
}

// 8. Readability (Flesch Reading Ease score)
export function checkReadability(page: CrawledPageData): IssueResult[] {
  if (page.wordCount > 150 && page.fleschScore < 45) {
    return [
      {
        category: "onpage",
        code: "POOR_READABILITY",
        severity: "low",
        title: `Low Readability Score (${page.fleschScore}/100)`,
        message: `Flesch reading ease is ${page.fleschScore} (difficult to read). Aim for 60+ with shorter sentences and simpler vocabulary for better user engagement.`,
        pageUrl: page.url,
        detail: { fleschScore: page.fleschScore },
      },
    ];
  }
  return [];
}
