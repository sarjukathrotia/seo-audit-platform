import { CrawledPageData } from "../types/seo";
import { fetchUrl } from "./fetcher";
import { fetchRobotsTxt, fetchSitemap, RobotsResult, SitemapResult } from "./robots-sitemap";
import { parsePageHtml } from "./html-parser";
import { renderHtml } from "./renderer";

export interface CrawlOptions {
  rootUrl: string;
  maxPages?: number;
  maxDepth?: number;
  renderJs?: boolean;
  concurrency?: number;
  delayMs?: number;
  onPageCrawled?: (page: CrawledPageData, totalCrawled: number, queueLength: number) => void;
  onStatusUpdate?: (status: string, message: string) => void;
}

export interface CrawlResult {
  rootUrl: string;
  pages: CrawledPageData[];
  sitemapData: SitemapResult;
  robotsData: RobotsResult;
  orphanPages: string[];
  externalBrokenLinks: { sourcePage: string; targetUrl: string; statusCode: number }[];
  durationMs: number;
}

export class WebCrawler {
  private visited = new Set<string>();
  private queue: { url: string; depth: number }[] = [];
  private pages: CrawledPageData[] = [];
  private options: Required<CrawlOptions>;
  private domain: string;
  private origin: string;

  constructor(options: CrawlOptions) {
    const urlObj = new URL(options.rootUrl);
    this.domain = urlObj.hostname;
    this.origin = urlObj.origin;

    this.options = {
      rootUrl: this.normalizeUrl(options.rootUrl),
      maxPages: options.maxPages || 25,
      maxDepth: options.maxDepth || 3,
      renderJs: options.renderJs || false,
      concurrency: options.concurrency || 2,
      delayMs: options.delayMs || 100,
      onPageCrawled: options.onPageCrawled || (() => {}),
      onStatusUpdate: options.onStatusUpdate || (() => {}),
    };
  }

  private normalizeUrl(inputUrl: string): string {
    try {
      const parsed = new URL(inputUrl);
      parsed.hash = "";
      // Strip common tracking params
      parsed.searchParams.delete("utm_source");
      parsed.searchParams.delete("utm_medium");
      parsed.searchParams.delete("utm_campaign");
      parsed.searchParams.delete("fbclid");
      parsed.searchParams.delete("gclid");

      let path = parsed.pathname;
      if (path.length > 1 && path.endsWith("/")) {
        path = path.slice(0, -1);
      }
      parsed.pathname = path;
      return parsed.href;
    } catch {
      return inputUrl;
    }
  }

  public async crawl(): Promise<CrawlResult> {
    const startTime = Date.now();
    this.options.onStatusUpdate("crawling", "Fetching robots.txt and sitemap.xml...");

    // 1. Fetch robots.txt and sitemap.xml in parallel
    const [robotsData, sitemapData] = await Promise.all([
      fetchRobotsTxt(this.origin),
      (async () => {
        const robots = await fetchRobotsTxt(this.origin);
        const sitemapUrl = robots.sitemapUrls[0] || `${this.origin}/sitemap.xml`;
        return fetchSitemap(sitemapUrl);
      })(),
    ]);

    // 2. Initialize queue with Root URL and top sitemap URLs
    this.queue.push({ url: this.options.rootUrl, depth: 0 });
    this.visited.add(this.options.rootUrl);

    // Also add up to 10 sitemap URLs to discover deep pages
    for (const smUrl of sitemapData.urls.slice(0, 10)) {
      const normalized = this.normalizeUrl(smUrl);
      if (!this.visited.has(normalized)) {
        this.queue.push({ url: normalized, depth: 1 });
        this.visited.add(normalized);
      }
    }

    this.options.onStatusUpdate("crawling", `Crawling pages (Max: ${this.options.maxPages})...`);

    // 3. BFS Crawl Loop with Concurrency
    while (this.queue.length > 0 && this.pages.length < this.options.maxPages) {
      const batch = this.queue.splice(0, this.options.concurrency);
      const batchPromises = batch.map(async (item) => {
        if (robotsData.isDisallowed(item.url)) {
          // Record disallowed page metadata
          const disallowedPage: CrawledPageData = {
            url: item.url,
            finalUrl: item.url,
            statusCode: 403,
            responseTimeMs: 0,
            title: null,
            metaDescription: null,
            h1List: [],
            headings: [],
            canonicalUrl: null,
            robotsDirectives: "Disallowed in robots.txt",
            wordCount: 0,
            bodyText: "",
            images: [],
            internalLinks: [],
            externalLinks: [],
            depth: item.depth,
            rendered: false,
            contentType: "text/html",
            headers: {},
            hasStructuredData: false,
            structuredDataTypes: [],
            fleschScore: 0,
          };
          this.pages.push(disallowedPage);
          return;
        }

        // Polite delay
        if (this.options.delayMs > 0) {
          await new Promise((r) => setTimeout(r, this.options.delayMs));
        }

        try {
          const fetchResult = await fetchUrl(item.url, 10000);
          let html = fetchResult.html;
          let rendered = false;

          if (this.options.renderJs) {
            const r = await renderHtml(fetchResult.finalUrl);
            if (r) {
              html = r;
              rendered = true;
            }
          }

          const parsedPage = parsePageHtml(
            html,
            fetchResult.finalUrl,
            fetchResult.statusCode,
            fetchResult.responseTimeMs,
            item.depth,
            fetchResult.headers
          );
          parsedPage.rendered = rendered;

          if (fetchResult.sslInfo) {
            parsedPage.sslValid = fetchResult.sslInfo.valid;
            parsedPage.sslDaysRemaining = fetchResult.sslInfo.daysRemaining;
          }

          this.pages.push(parsedPage);
          this.options.onPageCrawled(parsedPage, this.pages.length, this.queue.length);

          // Add discovered internal links if depth < maxDepth
          if (item.depth < this.options.maxDepth && this.pages.length + this.queue.length < this.options.maxPages * 2) {
            for (const link of parsedPage.internalLinks) {
              const normLink = this.normalizeUrl(link.url);
              if (!this.visited.has(normLink)) {
                this.visited.add(normLink);
                try {
                  const linkObj = new URL(normLink);
                  if (linkObj.hostname === this.domain) {
                    this.queue.push({ url: normLink, depth: item.depth + 1 });
                  }
                } catch {
                  // Ignore invalid link
                }
              }
            }
          }
        } catch {
          // Graceful handling of network timeouts or fetch errors
          this.pages.push({
            url: item.url,
            finalUrl: item.url,
            statusCode: 500,
            responseTimeMs: 0,
            title: null,
            metaDescription: null,
            h1List: [],
            headings: [],
            canonicalUrl: null,
            robotsDirectives: null,
            wordCount: 0,
            bodyText: "",
            images: [],
            internalLinks: [],
            externalLinks: [],
            depth: item.depth,
            rendered: false,
            contentType: "text/html",
            headers: {},
            hasStructuredData: false,
            structuredDataTypes: [],
            fleschScore: 0,
          });
        }
      });

      await Promise.all(batchPromises);
    }

    // 4. Calculate Orphan Pages (pages present in sitemap but never linked internally)
    const internalTargetUrls = new Set<string>();
    for (const page of this.pages) {
      for (const link of page.internalLinks) {
        internalTargetUrls.add(this.normalizeUrl(link.url));
      }
    }

    const orphanPages: string[] = [];
    for (const sitemapUrl of sitemapData.urls) {
      const norm = this.normalizeUrl(sitemapUrl);
      if (norm !== this.options.rootUrl && !internalTargetUrls.has(norm)) {
        orphanPages.push(sitemapUrl);
      }
    }

    const durationMs = Date.now() - startTime;

    return {
      rootUrl: this.options.rootUrl,
      pages: this.pages,
      sitemapData,
      robotsData,
      orphanPages,
      externalBrokenLinks: [],
      durationMs,
    };
  }
}
