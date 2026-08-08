import { describe, it, expect } from "vitest";
import { detectPlatform } from "../lib/crawler/platform-detector";
import { checkShopifyRules, checkWordPressRules } from "../lib/rules/niche-rules";
import { generateDeterministicRecommendations } from "../lib/ai/recommendation-engine";
import { CrawledPageData } from "../lib/types/seo";

describe("CMS & Platform Auto-Detector", () => {
  it("detects Shopify from CDN and theme signals", () => {
    const shopifyPage: Partial<CrawledPageData> = {
      url: "https://shop.example.com/collections/frontpage/products/t-shirt",
      bodyText: "Powered by Shopify cdn.shopify.com theme assets",
      headers: {},
      images: [],
      internalLinks: [],
    };
    const result = detectPlatform([shopifyPage as CrawledPageData]);
    expect(result.platform).toBe("shopify");
    expect(result.confidence).toBeGreaterThanOrEqual(40);
  });

  it("detects WordPress from /wp-content/ assets", () => {
    const wpPage: Partial<CrawledPageData> = {
      url: "https://blog.example.com/hello-world",
      bodyText: "Welcome to our blog /wp-content/uploads/2026/01/logo.png",
      headers: {},
      images: [],
      internalLinks: [],
    };
    const result = detectPlatform([wpPage as CrawledPageData]);
    expect(result.platform).toBe("wordpress");
  });

  it("detects Next.js from __NEXT_DATA__ payload", () => {
    const nextItem: Partial<CrawledPageData> = {
      url: "https://app.example.com/dashboard",
      bodyText: `<script id="__NEXT_DATA__">{"props":{}}</script>`,
      headers: {},
      images: [],
      internalLinks: [],
    };
    const result = detectPlatform([nextItem as CrawledPageData]);
    expect(result.platform).toBe("nextjs");
  });
});

describe("Shopify & Niche Rules Engine", () => {
  it("flags nested collection product duplicates when canonical is missing", () => {
    const crawlMock: any = {
      pages: [
        {
          url: "https://shop.com/collections/apparel/products/hoodie",
          canonicalUrl: "https://shop.com/collections/apparel/products/hoodie",
          structuredDataTypes: ["Product"],
        },
      ],
    };
    const issues = checkShopifyRules(crawlMock);
    expect(issues.some((i) => i.code === "SHOPIFY_COLLECTION_PRODUCT_DUPLICATE")).toBe(true);
  });

  it("flags indexable variant query parameter links", () => {
    const crawlMock: any = {
      pages: [
        {
          url: "https://shop.com/products/hoodie?variant=12345678",
          canonicalUrl: "https://shop.com/products/hoodie",
          structuredDataTypes: ["Product"],
        },
      ],
    };
    const issues = checkShopifyRules(crawlMock);
    expect(issues.some((i) => i.code === "SHOPIFY_VARIANT_PARAM_BLOAT")).toBe(true);
  });

  it("flags product pages missing Schema.org Product markup", () => {
    const crawlMock: any = {
      pages: [
        {
          url: "https://shop.com/products/hoodie",
          canonicalUrl: "https://shop.com/products/hoodie",
          structuredDataTypes: [],
        },
      ],
    };
    const issues = checkShopifyRules(crawlMock);
    expect(issues.some((i) => i.code === "MISSING_PRODUCT_SCHEMA")).toBe(true);
  });
});

describe("AI Action Plan 2.0 Engine", () => {
  it("generates impact/effort badges, how-to guides, and code snippets", () => {
    const scores = { technical: 60, onpage: 70, performance: 50, security: 100, accessibility: 90, overall: 68, grade: "C" as const, topDeductions: [] };
    const groupedIssues = [
      { code: "BROKEN_INTERNAL_LINK", title: "Broken Internal Link", category: "technical", severity: "high", count: 4, samplePages: [] },
      { code: "MISSING_PRODUCT_SCHEMA", title: "Missing Product & Offer JSON-LD Schema", category: "onpage", severity: "high", count: 2, samplePages: [] },
    ];

    const plan = generateDeterministicRecommendations("https://mystore.com", scores, groupedIssues, null, "shopify");
    expect(plan.detected_platform).toBe("shopify");
    expect(plan.prioritized_recommendations.length).toBeGreaterThan(0);

    const first = plan.prioritized_recommendations[0];
    expect(first.impact).toBeDefined();
    expect(first.effort).toBeDefined();
    expect(first.how_to_fix).toBeInstanceOf(Array);
    expect(first.how_to_fix!.length).toBeGreaterThan(0);
    expect(first.code_snippet).toBeDefined();
  });
});
