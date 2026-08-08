import { CrawledPageData, IssueResult } from "../types/seo";
import { CrawlResult } from "../crawler/crawler";
import {
  checkMissingTitle,
  checkTitleLength,
  checkDuplicateTitles,
  checkMissingMetaDescription,
  checkMetaDescriptionLength,
  checkDuplicateMetaDescriptions,
  checkHeadings,
  checkStatusCodes,
  checkCanonical,
  checkNoindex,
  checkBrokenInternalLinks,
  checkSiteWideTechnical,
} from "./technical";
import {
  checkWeakTitle,
  checkThinContent,
  checkImagesMissingAlt,
  checkNoOutboundLinks,
  checkNonDescriptiveAnchors,
  checkUrlQuality,
  checkStructuredData,
  checkReadability,
} from "./onpage";
import { checkBrokenExternalLinks, checkRedirectChains } from "./links-extra";
import { checkSecurity, checkAccessibility } from "./security-a11y";
import { detectPlatform } from "../crawler/platform-detector";
import { checkPlatformSpecific } from "./niche-rules";

export function runAllRules(crawlResult: CrawlResult): { issues: IssueResult[]; detectedPlatform: string } {
  const issues: IssueResult[] = [];
  const { pages, rootUrl } = crawlResult;

  // 0. Auto-detect CMS platform
  const platformResult = detectPlatform(pages);
  const detectedPlatform = platformResult.platform;

  // 1. Per-page deterministic checks
  for (const page of pages) {
    // Technical checks
    issues.push(...checkMissingTitle(page));
    issues.push(...checkTitleLength(page));
    issues.push(...checkMissingMetaDescription(page));
    issues.push(...checkMetaDescriptionLength(page));
    issues.push(...checkHeadings(page));
    issues.push(...checkStatusCodes(page));
    issues.push(...checkCanonical(page));
    issues.push(...checkNoindex(page));

    // On-page checks
    issues.push(...checkWeakTitle(page));
    issues.push(...checkThinContent(page));
    issues.push(...checkImagesMissingAlt(page));
    issues.push(...checkNoOutboundLinks(page));
    issues.push(...checkNonDescriptiveAnchors(page));
    issues.push(...checkUrlQuality(page));
    issues.push(...checkStructuredData(page));
    issues.push(...checkReadability(page));

    // Security & Accessibility checks
    issues.push(...checkSecurity(page, rootUrl));
    issues.push(...checkAccessibility(page));
  }

  // 2. Cross-page duplicate & relational checks
  issues.push(...checkDuplicateTitles(pages));
  issues.push(...checkDuplicateMetaDescriptions(pages));
  issues.push(...checkBrokenInternalLinks(pages));

  // 3. Site-wide checks (Robots.txt, Sitemap, Orphan pages, Duplicates, External links, Redirect chains)
  issues.push(...checkSiteWideTechnical(crawlResult));
  issues.push(...checkBrokenExternalLinks(crawlResult));
  issues.push(...checkRedirectChains(crawlResult));

  // 4. Platform-specific niche checks (Shopify, WordPress, etc.)
  issues.push(...checkPlatformSpecific(crawlResult, detectedPlatform as any));

  return { issues, detectedPlatform };
}
