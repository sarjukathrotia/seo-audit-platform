export type ScanStatus =
  | "queued"
  | "crawling"
  | "analyzing"
  | "scoring"
  | "generating_report"
  | "complete"
  | "failed";

export type IssueCategory =
  | "technical"
  | "onpage"
  | "performance"
  | "security"
  | "accessibility";

export type IssueSeverity = "critical" | "high" | "medium" | "low";

export interface CrawledPageData {
  url: string;
  finalUrl: string;
  statusCode: number;
  responseTimeMs: number;
  title: string | null;
  metaDescription: string | null;
  h1List: string[];
  headings: { level: number; text: string }[];
  canonicalUrl: string | null;
  robotsDirectives: string | null;
  wordCount: number;
  bodyText: string;
  images: { src: string; alt: string | null; width?: number; height?: number }[];
  internalLinks: { url: string; anchorText: string; statusCode?: number; hops?: number }[];
  externalLinks: { url: string; anchorText: string; statusCode?: number }[];
  depth: number;
  rendered: boolean;
  contentType: string;
  headers: Record<string, string>;
  hasStructuredData: boolean;
  structuredDataTypes: string[];
  fleschScore: number;
  sslValid?: boolean;
  sslDaysRemaining?: number;
  mixedContent?: string[];
  securityHeaders?: {
    hsts: boolean;
    csp: boolean;
    xContentTypeOptions: boolean;
    xFrameOptions: boolean;
    referrerPolicy: boolean;
  };
}

export interface IssueResult {
  category: IssueCategory;
  code: string;
  severity: IssueSeverity;
  title: string;
  message: string;
  pageUrl?: string;
  pageId?: string;
  detail?: Record<string, any>;
}

export interface CategoryScores {
  technical: number;
  onpage: number;
  performance: number;
  security: number;
  accessibility: number;
  overall: number;
  grade: "A" | "B" | "C" | "D" | "F";
  topDeductions: {
    category: IssueCategory;
    code: string;
    title: string;
    severity: IssueSeverity;
    deduction: number;
    count: number;
  }[];
}

export interface CoreWebVitals {
  perfScore: number;
  lcp: number; // seconds
  inp: number; // ms
  cls: number; // score
  fcp: number; // seconds
  tbt: number; // ms
  opportunities: {
    title: string;
    description: string;
    savings?: string;
  }[];
  source?: "measured" | "estimated";
}

export type CMSPlatform =
  | "shopify"
  | "wordpress"
  | "woocommerce"
  | "webflow"
  | "wix"
  | "squarespace"
  | "nextjs"
  | "custom";

export interface CodeSnippet {
  language: string;
  code: string;
  filename?: string;
  description?: string;
}

export interface RecommendationItem {
  title: string;
  problem: string;
  why_it_matters: string;
  action: string;
  priority: "high" | "medium" | "low";
  impact?: "high" | "medium" | "low";
  effort?: "quick_win" | "moderate" | "complex";
  affected_page_count: number;
  issue_code?: string;
  how_to_fix?: string[];
  code_snippet?: CodeSnippet;
  estimated_result?: string;
}

export interface AIRecommendationResponse {
  executive_summary: string;
  detected_platform?: CMSPlatform;
  prioritized_recommendations: RecommendationItem[];
  action_plan: {
    day_30: string[];
    day_60: string[];
    day_90: string[];
  };
}

export interface ScanSummaryData {
  id: string;
  rootUrl: string;
  status: ScanStatus;
  maxPages: number;
  maxDepth: number;
  renderJs: boolean;
  overallScore: number | null;
  technicalScore: number | null;
  onPageScore: number | null;
  performanceScore: number | null;
  securityScore: number | null;
  accessibilityScore: number | null;
  summary: string | null;
  aiPlan: AIRecommendationResponse | null;
  detectedPlatform?: CMSPlatform;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
  pageCount: number;
  issueCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  metrics?: CoreWebVitals | null;
}

