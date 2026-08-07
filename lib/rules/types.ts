import { CrawledPageData, IssueResult } from "../types/seo";
import { CrawlResult } from "../crawler/crawler";

export interface RuleCheckContext {
  page: CrawledPageData;
  allPages: CrawledPageData[];
  crawlResult: CrawlResult;
  rootUrl: string;
}

export type PageRuleCheck = (page: CrawledPageData, allPages: CrawledPageData[], rootUrl: string) => IssueResult[];
export type SiteRuleCheck = (crawlResult: CrawlResult) => IssueResult[];
