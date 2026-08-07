import { CrawledPageData, IssueResult } from "../types/seo";
import { CrawlResult } from "../crawler/crawler";
import { findDuplicates } from "../crawler/duplicate-detector";

/**
 * 6.1 Technical SEO Checks
 * Each check is a pure function returning IssueResult[]
 */

// 1. Missing title tag
export function checkMissingTitle(page: CrawledPageData): IssueResult[] {
  if (!page.title || page.title.trim().length === 0) {
    return [
      {
        category: "technical",
        code: "MISSING_TITLE",
        severity: "high",
        title: "Missing Title Tag",
        message: "This page is missing a `<title>` tag in the `<head>`, preventing search engines from displaying an accurate headline.",
        pageUrl: page.url,
      },
    ];
  }
  return [];
}

// 2. Title length check (30-60 chars)
export function checkTitleLength(page: CrawledPageData): IssueResult[] {
  if (!page.title) return [];
  const len = page.title.length;
  if (len < 30) {
    return [
      {
        category: "technical",
        code: "TITLE_TOO_SHORT",
        severity: "low",
        title: "Title Tag Too Short",
        message: `The title tag is only ${len} characters long. Aim for 30–60 characters to maximize CTR and convey topic intent.`,
        pageUrl: page.url,
        detail: { length: len, title: page.title },
      },
    ];
  }
  if (len > 60) {
    return [
      {
        category: "technical",
        code: "TITLE_TOO_LONG",
        severity: "low",
        title: "Title Tag Too Long",
        message: `The title tag is ${len} characters long and is likely truncated in Google SERP snippets. Keep it under 60 characters.`,
        pageUrl: page.url,
        detail: { length: len, title: page.title },
      },
    ];
  }
  return [];
}

// 3. Duplicate title tags (across all pages)
export function checkDuplicateTitles(allPages: CrawledPageData[]): IssueResult[] {
  const issues: IssueResult[] = [];
  const titleMap = new Map<string, string[]>();

  for (const p of allPages) {
    if (p.title && p.title.trim().length > 0) {
      const norm = p.title.trim().toLowerCase();
      const list = titleMap.get(norm) || [];
      list.push(p.url);
      titleMap.set(norm, list);
    }
  }

  for (const [normTitle, urls] of titleMap.entries()) {
    if (urls.length > 1) {
      for (const url of urls) {
        issues.push({
          category: "technical",
          code: "DUPLICATE_TITLE",
          severity: "high",
          title: "Duplicate Title Tag",
          message: `Identical title tag "${normTitle}" found across ${urls.length} distinct pages. Each page must have a unique title.`,
          pageUrl: url,
          detail: { sharedUrls: urls, title: normTitle },
        });
      }
    }
  }

  return issues;
}

// 4. Missing meta description
export function checkMissingMetaDescription(page: CrawledPageData): IssueResult[] {
  if (!page.metaDescription || page.metaDescription.trim().length === 0) {
    return [
      {
        category: "technical",
        code: "MISSING_META_DESCRIPTION",
        severity: "medium",
        title: "Missing Meta Description",
        message: "No `<meta name=\"description\">` tag found. Search engines will auto-generate an excerpt, which may reduce click-through rate.",
        pageUrl: page.url,
      },
    ];
  }
  return [];
}

// 5. Meta description length (70-160 chars)
export function checkMetaDescriptionLength(page: CrawledPageData): IssueResult[] {
  if (!page.metaDescription) return [];
  const len = page.metaDescription.length;
  if (len < 70) {
    return [
      {
        category: "technical",
        code: "META_DESC_TOO_SHORT",
        severity: "low",
        title: "Meta Description Too Short",
        message: `Meta description is only ${len} characters. Expand to 70–160 characters for maximum search snippet impact.`,
        pageUrl: page.url,
        detail: { length: len },
      },
    ];
  }
  if (len > 160) {
    return [
      {
        category: "technical",
        code: "META_DESC_TOO_LONG",
        severity: "low",
        title: "Meta Description Too Long",
        message: `Meta description is ${len} characters and will be truncated in search results. Shorten to under 160 characters.`,
        pageUrl: page.url,
        detail: { length: len },
      },
    ];
  }
  return [];
}

// 6. Duplicate meta descriptions
export function checkDuplicateMetaDescriptions(allPages: CrawledPageData[]): IssueResult[] {
  const issues: IssueResult[] = [];
  const descMap = new Map<string, string[]>();

  for (const p of allPages) {
    if (p.metaDescription && p.metaDescription.trim().length > 10) {
      const norm = p.metaDescription.trim().toLowerCase();
      const list = descMap.get(norm) || [];
      list.push(p.url);
      descMap.set(norm, list);
    }
  }

  for (const [normDesc, urls] of descMap.entries()) {
    if (urls.length > 1) {
      for (const url of urls) {
        issues.push({
          category: "technical",
          code: "DUPLICATE_META_DESCRIPTION",
          severity: "medium",
          title: "Duplicate Meta Description",
          message: `The exact same meta description is used on ${urls.length} pages. Provide unique descriptions for all indexable pages.`,
          pageUrl: url,
          detail: { sharedUrls: urls, descriptionSnippet: normDesc.slice(0, 80) },
        });
      }
    }
  }

  return issues;
}

// 7. Heading checks (Missing H1, Multiple H1s, Broken Hierarchy)
export function checkHeadings(page: CrawledPageData): IssueResult[] {
  const issues: IssueResult[] = [];

  // Missing H1
  if (page.h1List.length === 0) {
    issues.push({
      category: "technical",
      code: "MISSING_H1",
      severity: "high",
      title: "Missing H1 Tag",
      message: "No `<h1>` heading tag found on this page. Every indexable page should have one main H1 heading describing the primary topic.",
      pageUrl: page.url,
    });
  } else if (page.h1List.length > 1) {
    // Multiple H1s
    issues.push({
      category: "technical",
      code: "MULTIPLE_H1",
      severity: "medium",
      title: "Multiple H1 Tags Found",
      message: `Found ${page.h1List.length} \`<h1>\` tags on this page. Standard SEO best practice recommends a single primary H1 heading.`,
      pageUrl: page.url,
      detail: { h1s: page.h1List },
    });
  }

  // Broken H-hierarchy (e.g. H3 before any H2, or jumping H1 -> H4)
  let maxLevelSeen = 0;
  for (const h of page.headings) {
    if (h.level > maxLevelSeen + 1 && maxLevelSeen > 0) {
      issues.push({
        category: "technical",
        code: "BROKEN_HEADING_HIERARCHY",
        severity: "low",
        title: "Broken Heading Hierarchy",
        message: `Heading \`<h${h.level}>\` ("${h.text.slice(0, 30)}") skips heading levels from previous \`<h${maxLevelSeen}>\`. Use sequential nesting (H1 → H2 → H3).`,
        pageUrl: page.url,
        detail: { jumpedFrom: maxLevelSeen, jumpedTo: h.level, text: h.text },
      });
      break;
    }
    maxLevelSeen = Math.max(maxLevelSeen, h.level);
  }

  return issues;
}

// 8. HTTP Status Codes & Error Pages (404, 5xx)
export function checkStatusCodes(page: CrawledPageData): IssueResult[] {
  const issues: IssueResult[] = [];
  if (page.statusCode >= 500) {
    issues.push({
      category: "technical",
      code: "SERVER_ERROR_5XX",
      severity: "critical",
      title: `Server Error (${page.statusCode})`,
      message: `This URL returned a ${page.statusCode} internal server error, making it completely unavailable to visitors and search engine bots.`,
      pageUrl: page.url,
    });
  } else if (page.statusCode === 404 || page.statusCode >= 400) {
    issues.push({
      category: "technical",
      code: "PAGE_NOT_FOUND_4XX",
      severity: "critical",
      title: `Page Not Found (${page.statusCode})`,
      message: `Crawled URL returned HTTP ${page.statusCode} client error. Update links pointing to this URL or configure a 301 redirect.`,
      pageUrl: page.url,
    });
  }
  return issues;
}

// 9. Canonical checks
export function checkCanonical(page: CrawledPageData): IssueResult[] {
  const issues: IssueResult[] = [];

  if (!page.canonicalUrl) {
    issues.push({
      category: "technical",
      code: "MISSING_CANONICAL",
      severity: "low",
      title: "Missing Canonical Tag",
      message: "No `<link rel=\"canonical\">` tag specified. Adding self-referential canonicals prevents duplicate content parameter issues.",
      pageUrl: page.url,
    });
  } else {
    // Check canonical mismatch
    try {
      const pageUrlObj = new URL(page.url);
      const canonUrlObj = new URL(page.canonicalUrl);
      if (pageUrlObj.pathname !== canonUrlObj.pathname && !page.url.includes("?")) {
        issues.push({
          category: "technical",
          code: "CANONICAL_MISMATCH",
          severity: "medium",
          title: "Canonical URL Mismatch",
          message: `The canonical tag points to a different URL: "${page.canonicalUrl}". Ensure this is intentional consolidation.`,
          pageUrl: page.url,
          detail: { canonicalTarget: page.canonicalUrl },
        });
      }
    } catch {
      issues.push({
        category: "technical",
        code: "INVALID_CANONICAL",
        severity: "high",
        title: "Invalid Canonical URL",
        message: `Canonical tag contains an unparseable URL format: "${page.canonicalUrl}".`,
        pageUrl: page.url,
      });
    }
  }

  return issues;
}

// 10. Noindex tag audit
export function checkNoindex(page: CrawledPageData): IssueResult[] {
  if (page.robotsDirectives && page.robotsDirectives.includes("noindex")) {
    return [
      {
        category: "technical",
        code: "NOINDEX_DIRECTIVE",
        severity: "high",
        title: "Noindex Directive Detected",
        message: "This page contains a 'noindex' robot directive and will be excluded from search engine index results.",
        pageUrl: page.url,
        detail: { directive: page.robotsDirectives },
      },
    ];
  }
  return [];
}

// 11. Broken Internal Links (cross-page verification)
export function checkBrokenInternalLinks(allPages: CrawledPageData[]): IssueResult[] {
  const issues: IssueResult[] = [];
  const pageStatusMap = new Map<string, number>();

  for (const p of allPages) {
    pageStatusMap.set(p.url, p.statusCode);
    if (p.finalUrl) pageStatusMap.set(p.finalUrl, p.statusCode);
  }

  for (const page of allPages) {
    for (const link of page.internalLinks) {
      const targetStatus = pageStatusMap.get(link.url);
      if (targetStatus && targetStatus >= 400) {
        issues.push({
          category: "technical",
          code: "BROKEN_INTERNAL_LINK",
          severity: "critical",
          title: `Broken Internal Link (HTTP ${targetStatus})`,
          message: `Internal link to "${link.url}" with anchor "${link.anchorText || "none"}" returns HTTP ${targetStatus}.`,
          pageUrl: page.url,
          detail: { targetUrl: link.url, targetStatus, anchorText: link.anchorText },
        });
      }
    }
  }

  return issues;
}

// 12. Site-wide checks (Sitemap, Robots.txt, Orphan Pages, Duplicates)
export function checkSiteWideTechnical(crawlResult: CrawlResult): IssueResult[] {
  const issues: IssueResult[] = [];

  // Robots.txt check
  if (!crawlResult.robotsData.robotsFound) {
    issues.push({
      category: "technical",
      code: "ROBOTS_TXT_MISSING",
      severity: "medium",
      title: "Missing robots.txt File",
      message: "No `/robots.txt` file was found at the domain root. Add a robots.txt to guide search engine crawl budgets.",
    });
  }

  // Sitemap check
  if (!crawlResult.sitemapData.sitemapFound || crawlResult.sitemapData.urls.length === 0) {
    issues.push({
      category: "technical",
      code: "SITEMAP_MISSING_OR_EMPTY",
      severity: "medium",
      title: "Missing or Empty XML Sitemap",
      message: "No valid `/sitemap.xml` was discovered. Submit an XML sitemap to Google Search Console to expedite URL discovery.",
    });
  }

  // Orphan Pages check
  if (crawlResult.orphanPages.length > 0) {
    for (const orphan of crawlResult.orphanPages.slice(0, 10)) {
      issues.push({
        category: "technical",
        code: "ORPHAN_PAGE",
        severity: "low",
        title: "Orphan Page in Sitemap",
        message: `Page "${orphan}" is listed in the XML sitemap but received zero internal inbound links from crawled pages.`,
        pageUrl: orphan,
      });
    }
  }

  // Duplicate Content (SimHash / exact hash)
  const dupes = findDuplicates(crawlResult.pages);
  for (const exact of dupes.exactDuplicates) {
    for (const url of exact.urls) {
      issues.push({
        category: "technical",
        code: "EXACT_DUPLICATE_CONTENT",
        severity: "medium",
        title: "Exact Duplicate Content",
        message: `Identical text body content detected across ${exact.urls.length} URLs. Use 301 redirects or canonical tags.`,
        pageUrl: url,
        detail: { duplicateUrls: exact.urls },
      });
    }
  }

  for (const near of dupes.nearDuplicates.slice(0, 10)) {
    issues.push({
      category: "technical",
      code: "NEAR_DUPLICATE_CONTENT",
      severity: "medium",
      title: `Near-Duplicate Content (${near.similarity}% Match)`,
      message: `Content on "${near.urlA}" is ${near.similarity}% identical to "${near.urlB}". Differentiate the content to prevent keyword cannibalization.`,
      pageUrl: near.urlA,
      detail: { urlA: near.urlA, urlB: near.urlB, similarity: near.similarity },
    });
  }

  return issues;
}
