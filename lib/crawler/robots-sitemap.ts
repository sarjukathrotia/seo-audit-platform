import robotsParser from "robots-parser";

export interface SitemapResult {
  urls: string[];
  sitemapFound: boolean;
  sitemapUrl?: string;
  error?: string;
}

export interface RobotsResult {
  robotsFound: boolean;
  robotsUrl: string;
  sitemapUrls: string[];
  isDisallowed: (url: string) => boolean;
  rawText?: string;
}

const USER_AGENT = "SEOAuditBot/1.0 (+https://example.com/bot)";

export async function fetchRobotsTxt(rootUrl: string): Promise<RobotsResult> {
  const urlObj = new URL(rootUrl);
  const robotsUrl = `${urlObj.origin}/robots.txt`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(robotsUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        robotsFound: false,
        robotsUrl,
        sitemapUrls: [],
        isDisallowed: () => false,
      };
    }

    const text = await res.text();
    const robots = robotsParser(robotsUrl, text);

    // Extract sitemaps listed in robots.txt
    const sitemaps = robots.getSitemaps();

    return {
      robotsFound: true,
      robotsUrl,
      sitemapUrls: sitemaps.length > 0 ? sitemaps : [`${urlObj.origin}/sitemap.xml`],
      isDisallowed: (testUrl: string) => {
        try {
          return !robots.isAllowed(testUrl, USER_AGENT);
        } catch {
          return false;
        }
      },
      rawText: text,
    };
  } catch {
    return {
      robotsFound: false,
      robotsUrl,
      sitemapUrls: [`${urlObj.origin}/sitemap.xml`],
      isDisallowed: () => false,
    };
  }
}

export async function fetchSitemap(
  sitemapUrl: string,
  maxUrls = 500,
  visitedSitemaps = new Set<string>()
): Promise<SitemapResult> {
  if (visitedSitemaps.has(sitemapUrl)) {
    return { urls: [], sitemapFound: false };
  }
  visitedSitemaps.add(sitemapUrl);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(sitemapUrl, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/xml, text/xml, */*" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { urls: [], sitemapFound: false, sitemapUrl, error: `HTTP ${res.status}` };
    }

    const xml = await res.text();
    const urls: string[] = [];

    // Check for nested sitemap index (<sitemap><loc>...</loc></sitemap>)
    const sitemapIndexMatches = xml.matchAll(/<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/sitemap>/gi);
    const nestedSitemaps: string[] = [];
    for (const match of sitemapIndexMatches) {
      if (match[1]) nestedSitemaps.push(match[1].trim());
    }

    if (nestedSitemaps.length > 0) {
      for (const nested of nestedSitemaps.slice(0, 5)) {
        const sub = await fetchSitemap(nested, maxUrls - urls.length, visitedSitemaps);
        urls.push(...sub.urls);
        if (urls.length >= maxUrls) break;
      }
      return { urls: Array.from(new Set(urls)), sitemapFound: true, sitemapUrl };
    }

    // Standard urlset (<url><loc>...</loc></url>)
    const urlMatches = xml.matchAll(/<url>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/gi);
    for (const match of urlMatches) {
      if (match[1]) {
        urls.push(match[1].trim());
      }
      if (urls.length >= maxUrls) break;
    }

    // Fallback regex if formatting differs
    if (urls.length === 0) {
      const genericLocs = xml.matchAll(/<loc>([^<]+)<\/loc>/gi);
      for (const match of genericLocs) {
        if (match[1] && !match[1].endsWith(".xml")) {
          urls.push(match[1].trim());
        }
        if (urls.length >= maxUrls) break;
      }
    }

    return {
      urls: Array.from(new Set(urls)),
      sitemapFound: true,
      sitemapUrl,
    };
  } catch (err: any) {
    return {
      urls: [],
      sitemapFound: false,
      sitemapUrl,
      error: err.message || "Failed to fetch sitemap",
    };
  }
}
