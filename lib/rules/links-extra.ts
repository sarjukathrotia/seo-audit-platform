import { CrawlResult } from "../crawler/crawler";
import { IssueResult } from "../types/seo";

// Broken external links — uses data the crawler already gathers
export function checkBrokenExternalLinks(crawl: CrawlResult): IssueResult[] {
  const issues: IssueResult[] = [];

  // From the crawler's collected list (if populated)
  for (const b of crawl.externalBrokenLinks || []) {
    issues.push({
      category: "technical",
      code: "BROKEN_EXTERNAL_LINK",
      severity: "medium",
      title: "Broken External Link",
      message: `Link to ${b.targetUrl} returned HTTP ${b.statusCode}.`,
      pageUrl: b.sourcePage,
      detail: { target: b.targetUrl, status: b.statusCode },
    });
  }

  // Also derive from per-page external links that carry a status code
  for (const page of crawl.pages) {
    for (const link of page.externalLinks || []) {
      if (link.statusCode && link.statusCode >= 400) {
        issues.push({
          category: "technical",
          code: "BROKEN_EXTERNAL_LINK",
          severity: "medium",
          title: "Broken External Link",
          message: `Link to ${link.url} returned HTTP ${link.statusCode}.`,
          pageUrl: page.url,
          detail: { target: link.url, status: link.statusCode },
        });
      }
    }
  }
  return issues;
}

// Redirect chains — flags internal links resolving through 2+ hops
export function checkRedirectChains(crawl: CrawlResult): IssueResult[] {
  const issues: IssueResult[] = [];
  for (const page of crawl.pages) {
    for (const link of page.internalLinks || []) {
      if (link.hops && link.hops >= 2) {
        issues.push({
          category: "technical",
          code: "REDIRECT_CHAIN",
          severity: "medium",
          title: "Redirect Chain",
          message: `Link to ${link.url} passes through ${link.hops} redirects before resolving. Point it directly at the final URL.`,
          pageUrl: page.url,
          detail: { target: link.url, hops: link.hops },
        });
      }
    }
  }
  return issues;
}
