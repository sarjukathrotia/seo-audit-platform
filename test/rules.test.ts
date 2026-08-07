import { describe, it, expect } from "vitest";
import {
  checkMissingTitle,
  checkTitleLength,
  checkDuplicateTitles,
  checkMissingMetaDescription,
  checkHeadings,
  checkStatusCodes,
  checkCanonical,
} from "../lib/rules/technical";
import { checkWeakTitle, checkThinContent, checkImagesMissingAlt } from "../lib/rules/onpage";
import { CrawledPageData } from "../lib/types/seo";

const createMockPage = (overrides: Partial<CrawledPageData> = {}): CrawledPageData => ({
  url: "https://example.com/test",
  finalUrl: "https://example.com/test",
  statusCode: 200,
  responseTimeMs: 150,
  title: "A Valid SEO Title for Testing Purposes Here",
  metaDescription: "This is an effective, valid meta description that is between 70 and 160 characters long.",
  h1List: ["Primary H1 Topic Title"],
  headings: [{ level: 1, text: "Primary H1 Topic Title" }],
  canonicalUrl: "https://example.com/test",
  robotsDirectives: "index, follow",
  wordCount: 650,
  bodyText: "Sample body text",
  images: [{ src: "/logo.png", alt: "Company Logo" }],
  internalLinks: [{ url: "https://example.com/about", anchorText: "About Us" }],
  externalLinks: [],
  depth: 0,
  rendered: false,
  contentType: "text/html",
  headers: {},
  hasStructuredData: true,
  structuredDataTypes: ["Organization"],
  fleschScore: 65,
  ...overrides,
});

describe("Technical SEO Rule Engine", () => {
  it("flags missing title tag", () => {
    const page = createMockPage({ title: "" });
    const issues = checkMissingTitle(page);
    expect(issues.length).toBe(1);
    expect(issues[0].code).toBe("MISSING_TITLE");
    expect(issues[0].severity).toBe("high");
  });

  it("flags title tag too short or too long", () => {
    const shortPage = createMockPage({ title: "Short" });
    const shortIssues = checkTitleLength(shortPage);
    expect(shortIssues.length).toBe(1);
    expect(shortIssues[0].code).toBe("TITLE_TOO_SHORT");

    const longPage = createMockPage({
      title: "This title tag is definitely far too long because it exceeds sixty characters in total length easily",
    });
    const longIssues = checkTitleLength(longPage);
    expect(longIssues.length).toBe(1);
    expect(longIssues[0].code).toBe("TITLE_TOO_LONG");
  });

  it("detects duplicate titles across pages", () => {
    const pageA = createMockPage({ url: "https://example.com/a", title: "Same Shared Title" });
    const pageB = createMockPage({ url: "https://example.com/b", title: "Same Shared Title" });
    const issues = checkDuplicateTitles([pageA, pageB]);
    expect(issues.length).toBe(2);
    expect(issues[0].code).toBe("DUPLICATE_TITLE");
  });

  it("flags missing H1 and multiple H1 tags", () => {
    const missingH1Page = createMockPage({ h1List: [] });
    expect(checkHeadings(missingH1Page)[0].code).toBe("MISSING_H1");

    const multipleH1Page = createMockPage({ h1List: ["First Heading", "Second Heading"] });
    expect(checkHeadings(multipleH1Page)[0].code).toBe("MULTIPLE_H1");
  });

  it("flags 404 and 500 status codes", () => {
    const notFoundPage = createMockPage({ statusCode: 404 });
    expect(checkStatusCodes(notFoundPage)[0].code).toBe("PAGE_NOT_FOUND_4XX");

    const serverErrorPage = createMockPage({ statusCode: 500 });
    expect(checkStatusCodes(serverErrorPage)[0].code).toBe("SERVER_ERROR_5XX");
  });
});

describe("On-Page SEO Rule Engine", () => {
  it("flags weak and generic titles", () => {
    const genericPage = createMockPage({ title: "Home" });
    const issues = checkWeakTitle(genericPage);
    expect(issues.length).toBe(1);
    expect(issues[0].code).toBe("WEAK_GENERIC_TITLE");
  });

  it("flags thin content under 300 words", () => {
    const thinPage = createMockPage({ wordCount: 120 });
    const issues = checkThinContent(thinPage);
    expect(issues.length).toBe(1);
    expect(issues[0].code).toBe("THIN_CONTENT");
  });

  it("flags images missing alt attributes", () => {
    const pageWithoutAlt = createMockPage({
      images: [
        { src: "/banner.jpg", alt: null },
        { src: "/photo.png", alt: "" },
      ],
    });
    const issues = checkImagesMissingAlt(pageWithoutAlt);
    expect(issues.length).toBe(1);
    expect(issues[0].code).toBe("IMAGES_MISSING_ALT");
  });
});

describe("Links & Redirects Rule Engine", () => {
  it("flags broken external links and redirect chains", async () => {
    const { checkBrokenExternalLinks, checkRedirectChains } = await import("../lib/rules/links-extra");
    const crawlMock: any = {
      pages: [
        {
          url: "https://example.com/source",
          externalLinks: [{ url: "https://dead-partner.com", statusCode: 404 }],
          internalLinks: [{ url: "https://example.com/dest", hops: 3 }],
        },
      ],
      externalBrokenLinks: [],
    };

    const extIssues = checkBrokenExternalLinks(crawlMock);
    expect(extIssues.length).toBe(1);
    expect(extIssues[0].code).toBe("BROKEN_EXTERNAL_LINK");

    const redirIssues = checkRedirectChains(crawlMock);
    expect(redirIssues.length).toBe(1);
    expect(redirIssues[0].code).toBe("REDIRECT_CHAIN");
  });
});
