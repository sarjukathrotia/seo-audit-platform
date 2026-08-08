import { CMSPlatform, CrawledPageData } from "../types/seo";

export interface PlatformDetectionResult {
  platform: CMSPlatform;
  confidence: number;
  signals: string[];
}

export function detectPlatform(pages: CrawledPageData[]): PlatformDetectionResult {
  if (!pages || pages.length === 0) {
    return { platform: "custom", confidence: 0, signals: [] };
  }

  const signals: string[] = [];
  let shopifyPoints = 0;
  let wpPoints = 0;
  let wooPoints = 0;
  let webflowPoints = 0;
  let wixPoints = 0;
  let sqPoints = 0;
  let nextPoints = 0;

  for (const page of pages.slice(0, 10)) {
    const rawHtml = page.bodyText + " " + JSON.stringify(page.headers) + " " + JSON.stringify(page.images) + " " + JSON.stringify(page.internalLinks);
    const urlStr = page.url.toLowerCase();

    // 1. Shopify Signals
    if (rawHtml.includes("cdn.shopify.com") || rawHtml.includes("Shopify.theme") || rawHtml.includes("myshopify.com")) {
      shopifyPoints += 4;
      signals.push("Shopify CDN / Global Theme Object detected");
    }
    if (urlStr.includes("/collections/") || urlStr.includes("/products/")) {
      shopifyPoints += 2;
    }

    // 2. WordPress / WooCommerce Signals
    if (rawHtml.includes("/wp-content/") || rawHtml.includes("/wp-includes/") || rawHtml.includes("wp-json")) {
      wpPoints += 4;
      signals.push("WordPress Asset Paths (/wp-content/) detected");
    }
    if (rawHtml.includes("woocommerce") || rawHtml.includes("wc-api") || rawHtml.includes("wc-cart")) {
      wooPoints += 5;
      signals.push("WooCommerce eCommerce modules detected");
    }

    // 3. Webflow Signals
    if (rawHtml.includes("data-wf-page") || rawHtml.includes("assets.website-files.com") || rawHtml.includes("uploads-ssl.webflow.com")) {
      webflowPoints += 5;
      signals.push("Webflow Asset Engine & Data Attributes detected");
    }

    // 4. Wix Signals
    if (rawHtml.includes("parastorage.com") || rawHtml.includes("wix.com") || rawHtml.includes("wix-warmup-data")) {
      wixPoints += 5;
      signals.push("Wix Platform Runtime detected");
    }

    // 5. Squarespace Signals
    if (rawHtml.includes("squarespace.com") || rawHtml.includes("static1.squarespace.com")) {
      sqPoints += 5;
      signals.push("Squarespace Template Engine detected");
    }

    // 6. Next.js Signals
    if (rawHtml.includes("__NEXT_DATA__") || rawHtml.includes("_next/static")) {
      nextPoints += 5;
      signals.push("Next.js App Router / Pages Engine detected");
    }
  }

  if (shopifyPoints >= 4) {
    return { platform: "shopify", confidence: Math.min(100, shopifyPoints * 20), signals: Array.from(new Set(signals)) };
  }
  if (wooPoints >= 4) {
    return { platform: "woocommerce", confidence: Math.min(100, wooPoints * 20), signals: Array.from(new Set(signals)) };
  }
  if (wpPoints >= 4) {
    return { platform: "wordpress", confidence: Math.min(100, wpPoints * 20), signals: Array.from(new Set(signals)) };
  }
  if (webflowPoints >= 4) {
    return { platform: "webflow", confidence: Math.min(100, webflowPoints * 20), signals: Array.from(new Set(signals)) };
  }
  if (wixPoints >= 4) {
    return { platform: "wix", confidence: Math.min(100, wixPoints * 20), signals: Array.from(new Set(signals)) };
  }
  if (sqPoints >= 4) {
    return { platform: "squarespace", confidence: Math.min(100, sqPoints * 20), signals: Array.from(new Set(signals)) };
  }
  if (nextPoints >= 4) {
    return { platform: "nextjs", confidence: Math.min(100, nextPoints * 20), signals: Array.from(new Set(signals)) };
  }

  return { platform: "custom", confidence: 50, signals: ["Custom HTML / Modern Framework"] };
}
