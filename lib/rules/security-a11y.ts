import { CrawledPageData, IssueResult } from "../types/seo";

/**
 * 6.4 Security & Accessibility Checks
 */

export function checkSecurity(page: CrawledPageData, rootUrl: string): IssueResult[] {
  const issues: IssueResult[] = [];
  const isHttps = page.url.startsWith("https://");

  // 1. HTTPS enforcement
  if (!isHttps) {
    issues.push({
      category: "security",
      code: "NO_HTTPS",
      severity: "high",
      title: "Insecure HTTP Protocol",
      message: "This page is served over unencrypted HTTP. Google Chrome flags HTTP sites as insecure and rewards HTTPS sites with a ranking boost.",
      pageUrl: page.url,
    });
  }

  // 2. SSL certificate validity & expiration
  if (page.sslValid === false) {
    issues.push({
      category: "security",
      code: "INVALID_SSL_CERT",
      severity: "critical",
      title: "Invalid or Expired SSL Certificate",
      message: "The TLS/SSL certificate is expired or failed validation. Browsers show full-page warning interstitials to visitors.",
      pageUrl: page.url,
    });
  } else if (page.sslDaysRemaining !== undefined && page.sslDaysRemaining < 15 && page.sslDaysRemaining > 0) {
    issues.push({
      category: "security",
      code: "SSL_EXPIRING_SOON",
      severity: "medium",
      title: `SSL Certificate Expiring in ${page.sslDaysRemaining} Days`,
      message: `Your SSL certificate expires in ${page.sslDaysRemaining} days. Renew it promptly to prevent certificate errors.`,
      pageUrl: page.url,
      detail: { daysRemaining: page.sslDaysRemaining },
    });
  }

  // 3. Mixed content
  if (page.mixedContent && page.mixedContent.length > 0) {
    issues.push({
      category: "security",
      code: "MIXED_CONTENT",
      severity: "medium",
      title: "Mixed Content Detected",
      message: `HTTPS page requests ${page.mixedContent.length} unencrypted HTTP resources (e.g. "${page.mixedContent[0]}"). Update all resource links to HTTPS.`,
      pageUrl: page.url,
      detail: { count: page.mixedContent.length, sampleResources: page.mixedContent.slice(0, 5) },
    });
  }

  // 4. Security Headers (HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
  if (page.securityHeaders) {
    if (!page.securityHeaders.hsts && isHttps) {
      issues.push({
        category: "security",
        code: "MISSING_HSTS",
        severity: "low",
        title: "Missing HSTS Header (Strict-Transport-Security)",
        message: "HSTS instructs browsers to always connect via HTTPS, preventing man-in-the-middle downgrade attacks.",
        pageUrl: page.url,
      });
    }

    if (!page.securityHeaders.xContentTypeOptions) {
      issues.push({
        category: "security",
        code: "MISSING_X_CONTENT_TYPE",
        severity: "low",
        title: "Missing X-Content-Type-Options Header",
        message: "Add `X-Content-Type-Options: nosniff` to prevent MIME type sniffing security vulnerabilities.",
        pageUrl: page.url,
      });
    }

    if (!page.securityHeaders.xFrameOptions && !page.securityHeaders.csp) {
      issues.push({
        category: "security",
        code: "MISSING_X_FRAME_OPTIONS",
        severity: "low",
        title: "Missing X-Frame-Options / CSP Frame Protection",
        message: "Add `X-Frame-Options: SAMEORIGIN` or CSP `frame-ancestors` to protect against clickjacking attacks.",
        pageUrl: page.url,
      });
    }
  }

  return issues;
}

export function checkAccessibility(page: CrawledPageData): IssueResult[] {
  const issues: IssueResult[] = [];

  // 1. Missing image alt tags (accessibility impact)
  const missingAlt = page.images.filter((i) => !i.alt || i.alt.trim().length === 0);
  if (missingAlt.length > 0) {
    issues.push({
      category: "accessibility",
      code: "A11Y_IMAGES_MISSING_ALT",
      severity: "medium",
      title: `${missingAlt.length} Image(s) Missing Accessible Alt Text`,
      message: "Screen readers rely on alt text to describe visual elements to visually impaired users.",
      pageUrl: page.url,
      detail: { count: missingAlt.length },
    });
  }

  // 2. Heading structure nesting (a11y)
  const h1Count = page.h1List.length;
  if (h1Count === 0 && page.statusCode === 200) {
    issues.push({
      category: "accessibility",
      code: "A11Y_MISSING_H1",
      severity: "medium",
      title: "Missing Document Level 1 Heading",
      message: "Screen readers use H1 headings as the primary page landmark for navigation.",
      pageUrl: page.url,
    });
  }

  return issues;
}
