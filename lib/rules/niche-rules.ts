import { CrawlResult } from "../crawler/crawler";
import { IssueResult } from "../types/seo";
import { CMSPlatform } from "../types/seo";

// 1. Shopify-Specific Checks
// - Duplicate /collections/.../products/... links without clean canonical
// - Variant query parameter bloat (?variant=)
// - Missing Product / Offer Schema on PDPs
export function checkShopifyRules(crawl: CrawlResult): IssueResult[] {
  const issues: IssueResult[] = [];

  for (const page of crawl.pages) {
    const url = page.url.toLowerCase();

    // Check 1: Nested collection product URL duplication
    if (url.includes("/collections/") && url.includes("/products/")) {
      const isCanonicalToRootProduct = page.canonicalUrl && !page.canonicalUrl.includes("/collections/") && page.canonicalUrl.includes("/products/");
      if (!isCanonicalToRootProduct) {
        issues.push({
          category: "technical",
          code: "SHOPIFY_COLLECTION_PRODUCT_DUPLICATE",
          severity: "high",
          title: "Shopify Nested Collection Product URL",
          message: `Product URL contains /collections/*/products/* structure without canonical pointing to the primary /products/* path, creating duplicate content.`,
          pageUrl: page.url,
          detail: { url: page.url, canonical: page.canonicalUrl },
        });
      }
    }

    // Check 2: Variant parameter bloat
    if (url.includes("?variant=") || url.includes("&variant=")) {
      issues.push({
        category: "technical",
        code: "SHOPIFY_VARIANT_PARAM_BLOAT",
        severity: "medium",
        title: "Shopify Indexable Variant Parameter",
        message: `Variant query parameter (?variant=) is present in crawled internal link. Ensure canonical points to base product URL.`,
        pageUrl: page.url,
        detail: { url: page.url },
      });
    }

    // Check 3: Product pages missing Product schema
    if (url.includes("/products/") || url.includes("/product/")) {
      const hasProductSchema = page.structuredDataTypes?.some((t) => t.toLowerCase().includes("product"));
      if (!hasProductSchema) {
        issues.push({
          category: "onpage",
          code: "MISSING_PRODUCT_SCHEMA",
          severity: "high",
          title: "Missing Product & Offer JSON-LD Schema",
          message: `Product Detail Page (PDP) lacks Schema.org/Product structured data with price, currency, and stock availability.`,
          pageUrl: page.url,
          detail: { url: page.url },
        });
      }
    }
  }

  return issues;
}

/**
 * 2. WordPress / WooCommerce Checks
 */
export function checkWordPressRules(crawl: CrawlResult): IssueResult[] {
  const issues: IssueResult[] = [];

  for (const page of crawl.pages) {
    const url = page.url.toLowerCase();

    // Check for attachment page bloat (e.g. /?attachment_id=)
    if (url.includes("attachment_id=") || url.includes("/attachment/")) {
      issues.push({
        category: "technical",
        code: "WORDPRESS_ATTACHMENT_PAGE_BLOAT",
        severity: "medium",
        title: "WordPress Attachment Page Indexation Bloat",
        message: `Media attachment URL is indexable. Redirect attachment pages to the parent post or media file.`,
        pageUrl: page.url,
        detail: { url: page.url },
      });
    }
  }

  return issues;
}

/**
 * 3. Master Niche & Platform Evaluator
 */
export function checkPlatformSpecific(crawl: CrawlResult, platform: CMSPlatform): IssueResult[] {
  const issues: IssueResult[] = [];

  if (platform === "shopify") {
    issues.push(...checkShopifyRules(crawl));
  } else if (platform === "wordpress" || platform === "woocommerce") {
    issues.push(...checkWordPressRules(crawl));
  }

  return issues;
}
