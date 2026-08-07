import * as cheerio from "cheerio";
import { CrawledPageData } from "../types/seo";

export function parsePageHtml(
  html: string,
  currentUrl: string,
  statusCode: number,
  responseTimeMs: number,
  depth = 0,
  headers: Record<string, string> = {}
): CrawledPageData {
  const $ = cheerio.load(html);
  const currentUrlObj = new URL(currentUrl);

  // 1. Title
  const title = $("title").first().text().trim() || null;

  // 2. Meta description
  const metaDescription =
    $('meta[name="description" i]').attr("content")?.trim() ||
    $('meta[property="og:description" i]').attr("content")?.trim() ||
    null;

  // 3. Robots directives (from meta tag or X-Robots-Tag header)
  const metaRobots = $('meta[name="robots" i]').attr("content")?.toLowerCase() || null;
  const headerRobots = headers["x-robots-tag"]?.toLowerCase() || null;
  const robotsDirectives = [metaRobots, headerRobots].filter(Boolean).join(", ") || null;

  // 4. Canonical URL
  const canonicalHref = $('link[rel="canonical" i]').attr("href")?.trim() || null;
  let canonicalUrl: string | null = null;
  if (canonicalHref) {
    try {
      canonicalUrl = new URL(canonicalHref, currentUrl).href;
    } catch {
      canonicalUrl = canonicalHref;
    }
  }

  // 5. Headings
  const h1List: string[] = [];
  $("h1").each((_, el) => {
    const text = $(el).text().trim();
    if (text) h1List.push(text);
  });

  const headings: { level: number; text: string }[] = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const tag = el.tagName.toLowerCase();
    const level = parseInt(tag.replace("h", ""), 10);
    const text = $(el).text().trim();
    if (text) {
      headings.push({ level, text });
    }
  });

  // 6. Visible body text & word count (excluding scripts, styles, noscript)
  $("script, style, noscript, svg, iframe").remove();
  const rawBodyText = $("body").text() || $.text() || "";
  const bodyText = rawBodyText.replace(/\s+/g, " ").trim();
  const words = bodyText ? bodyText.split(/\s+/).filter((w) => w.length > 0) : [];
  const wordCount = words.length;

  // 7. Images
  const images: CrawledPageData["images"] = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || "";
    const alt = $(el).attr("alt");
    const width = parseInt($(el).attr("width") || "0", 10) || undefined;
    const height = parseInt($(el).attr("height") || "0", 10) || undefined;
    if (src) {
      images.push({
        src,
        alt: alt !== undefined ? alt.trim() : null,
        width,
        height,
      });
    }
  });

  // 8. Internal and External Links
  const internalLinks: CrawledPageData["internalLinks"] = [];
  const externalLinks: CrawledPageData["externalLinks"] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim();
    const anchorText = $(el).text().trim() || $(el).attr("aria-label")?.trim() || "";

    if (!href || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) {
      return;
    }

    try {
      const resolved = new URL(href, currentUrl);
      // Strip hash fragments for crawl deduplication
      resolved.hash = "";
      const resolvedHref = resolved.href;

      if (resolved.hostname === currentUrlObj.hostname) {
        internalLinks.push({
          url: resolvedHref,
          anchorText,
        });
      } else {
        externalLinks.push({
          url: resolvedHref,
          anchorText,
        });
      }
    } catch {
      // Invalid URL
    }
  });

  // 9. Structured data (JSON-LD)
  let hasStructuredData = false;
  const structuredDataTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const jsonContent = $(el).html();
      if (jsonContent) {
        const parsed = JSON.parse(jsonContent);
        hasStructuredData = true;
        if (parsed["@type"]) {
          structuredDataTypes.push(String(parsed["@type"]));
        } else if (Array.isArray(parsed["@graph"])) {
          parsed["@graph"].forEach((item: any) => {
            if (item["@type"]) structuredDataTypes.push(String(item["@type"]));
          });
        }
      }
    } catch {
      // Invalid JSON-LD
    }
  });

  // 10. Readability (Flesch Reading Ease)
  const fleschScore = calculateFleschReadingEase(bodyText);

  // 11. Security Headers
  const securityHeaders = {
    hsts: Boolean(headers["strict-transport-security"]),
    csp: Boolean(headers["content-security-policy"]),
    xContentTypeOptions: Boolean(headers["x-content-type-options"]),
    xFrameOptions: Boolean(headers["x-frame-options"]),
    referrerPolicy: Boolean(headers["referrer-policy"]),
  };

  // 12. Mixed content on HTTPS
  const mixedContent: string[] = [];
  if (currentUrl.startsWith("https://")) {
    $('script[src^="http://"], link[href^="http://"], img[src^="http://"], iframe[src^="http://"]').each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("href");
      if (src) mixedContent.push(src);
    });
  }

  return {
    url: currentUrl,
    finalUrl: currentUrl,
    statusCode,
    responseTimeMs,
    title,
    metaDescription,
    h1List,
    headings,
    canonicalUrl,
    robotsDirectives,
    wordCount,
    bodyText,
    images,
    internalLinks,
    externalLinks,
    depth,
    rendered: false,
    contentType: headers["content-type"] || "text/html",
    headers,
    hasStructuredData,
    structuredDataTypes,
    fleschScore,
    securityHeaders,
    mixedContent: mixedContent.length > 0 ? mixedContent : undefined,
  };
}

/**
 * Computes Flesch Reading Ease score:
 * Score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
 */
export function calculateFleschReadingEase(text: string): number {
  if (!text || text.trim().length === 0) return 0;

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.split(/\s+/).filter((w) => w.length > 0);

  if (words.length === 0) return 0;
  const sentenceCount = Math.max(1, sentences.length);
  const wordCount = words.length;

  let syllableCount = 0;
  for (const word of words) {
    syllableCount += countSyllables(word);
  }

  const score =
    206.835 -
    1.015 * (wordCount / sentenceCount) -
    84.6 * (syllableCount / wordCount);

  return Math.round(Math.max(0, Math.min(100, score)));
}

function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
  if (clean.length <= 3) return 1;

  const match = clean.match(/[aeiouy]{1,2}/g);
  let count = match ? match.length : 1;

  // Subtract silent 'e' at end
  if (clean.endsWith("e") && !clean.endsWith("le") && count > 1) {
    count--;
  }
  return Math.max(1, count);
}
