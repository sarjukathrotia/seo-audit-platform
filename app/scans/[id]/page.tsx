"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileText,
  Clock,
  Zap,
  Shield,
  Layers,
  ChevronRight,
  Printer,
  Search,
  ExternalLink,
  ArrowUpRight,
  Filter,
  Sparkles,
  RefreshCw,
} from "lucide-react";

interface ScanData {
  id: string;
  rootUrl: string;
  status: string;
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
  aiPlan: {
    executive_summary: string;
    prioritized_recommendations: Array<{
      title: string;
      problem: string;
      why_it_matters: string;
      action: string;
      priority: string;
      affected_page_count: number;
    }>;
    action_plan: {
      day_30: string[];
      day_60: string[];
      day_90: string[];
    };
  } | null;
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
  metrics?: {
    perfScore: number;
    lcp: number;
    inp: number;
    cls: number;
    fcp: number;
    tbt: number;
    opportunities: Array<{ title: string; description: string; savings?: string }>;
    source?: "measured" | "estimated";
  } | null;
}

interface PageItem {
  id: string;
  url: string;
  finalUrl: string;
  statusCode: number;
  responseTimeMs: number;
  title: string | null;
  metaDescription: string | null;
  h1Count: number;
  wordCount: number;
  depth: number;
  issueCount: number;
}

interface GroupedIssue {
  code: string;
  title: string;
  message: string;
  category: string;
  severity: string;
  count: number;
  affectedPages: string[];
}

export default function ScanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [scan, setScan] = useState<ScanData | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [groupedIssues, setGroupedIssues] = useState<GroupedIssue[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "issues" | "pages" | "plan">("overview");
  const [issueCategoryFilter, setIssueCategoryFilter] = useState<string>("all");
  const [issueSeverityFilter, setIssueSeverityFilter] = useState<string>("all");
  const [pageSearch, setPageSearch] = useState<string>("");
  const [selectedIssuePages, setSelectedIssuePages] = useState<{ title: string; urls: string[] } | null>(null);
  const [activePlanTab, setActivePlanTab] = useState<"30" | "60" | "90">("30");

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const pollScan = async () => {
      try {
        const res = await fetch(`/api/scans/${id}`);
        if (res.ok) {
          const data = await res.json();
          setScan(data.scan);

          if (data.scan.status === "complete" || data.scan.status === "failed") {
            clearInterval(interval);
            fetchPagesAndIssues();
          }
        }
      } catch (err) {
        console.error("Polling scan failed:", err);
      }
    };

    pollScan();
    interval = setInterval(pollScan, 2000);

    return () => clearInterval(interval);
  }, [id]);

  const fetchPagesAndIssues = async () => {
    try {
      const [pagesRes, issuesRes] = await Promise.all([
        fetch(`/api/scans/${id}/pages`),
        fetch(`/api/scans/${id}/issues`),
      ]);

      if (pagesRes.ok) {
        const pData = await pagesRes.json();
        setPages(pData.pages || []);
      }
      if (issuesRes.ok) {
        const iData = await issuesRes.json();
        setGroupedIssues(iData.grouped || []);
      }
    } catch (err) {
      console.error("Failed to fetch scan details:", err);
    }
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return { grade: "A", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
    if (score >= 75) return { grade: "B", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" };
    if (score >= 60) return { grade: "C", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
    if (score >= 45) return { grade: "D", color: "text-orange-400 bg-orange-500/10 border-orange-500/30" };
    return { grade: "F", color: "text-rose-400 bg-rose-500/10 border-rose-500/30" };
  };

  const filteredIssues = groupedIssues.filter((issue) => {
    const matchCat = issueCategoryFilter === "all" || issue.category === issueCategoryFilter;
    const matchSev = issueSeverityFilter === "all" || issue.severity === issueSeverityFilter;
    return matchCat && matchSev;
  });

  const filteredPages = pages.filter((page) => {
    if (!pageSearch.trim()) return true;
    const q = pageSearch.toLowerCase();
    return page.url.toLowerCase().includes(q) || (page.title && page.title.toLowerCase().includes(q));
  });

  if (!scan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <div className="text-slate-400 text-sm font-medium">Initializing audit session...</div>
      </div>
    );
  }

  // Live crawling / processing state
  if (scan.status !== "complete" && scan.status !== "failed") {
    const stages = [
      { key: "queued", label: "Queued" },
      { key: "crawling", label: "Crawling Pages" },
      { key: "analyzing", label: "Rule Engine" },
      { key: "scoring", label: "Scoring & Vitals" },
      { key: "generating_report", label: "AI Recommendations" },
    ];
    const currentIndex = stages.findIndex((s) => s.key === scan.status);

    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          Active Background Worker
        </div>
        <h1 className="text-3xl font-extrabold text-white">Auditing {scan.rootUrl}</h1>
        <p className="text-slate-400 text-sm">
          {scan.summary || "Walking the website graph, evaluating technical SEO rules, and testing Core Web Vitals..."}
        </p>

        {/* Stepper */}
        <div className="flex items-center justify-between relative pt-6">
          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
          {stages.map((stage, i) => {
            const isCompleted = i < currentIndex;
            const isCurrent = i === currentIndex;
            return (
              <div key={stage.key} className="relative z-10 flex flex-col items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? "bg-emerald-500 text-white"
                      : isCurrent
                      ? "bg-indigo-600 text-white ring-4 ring-indigo-500/30 animate-pulse"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {isCompleted ? "✓" : i + 1}
                </div>
                <span className={`text-[11px] font-medium ${isCurrent ? "text-indigo-400 font-bold" : "text-slate-500"}`}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (scan.status === "failed") {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-white">Audit Execution Failed</h2>
        <p className="text-slate-400 text-sm">{scan.error || "The server could not reach the target domain."}</p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all"
        >
          Try Another URL
        </button>
      </div>
    );
  }

  const gradeInfo = getScoreGrade(scan.overallScore || 0);

  return (
    <div className="space-y-8">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{scan.rootUrl}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${gradeInfo.color}`}>
              Grade {gradeInfo.grade}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <span>Crawled {scan.pageCount} pages</span>
            <span>•</span>
            <span>Completed {scan.completedAt ? new Date(scan.completedAt).toLocaleTimeString() : ""}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/api/scans/${scan.id}/report`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            Download PDF Report
          </a>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
          >
            New Audit
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 text-sm font-medium">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 px-3 border-b-2 transition-all ${
            activeTab === "overview"
              ? "border-indigo-500 text-white font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Overview & Scores
        </button>
        <button
          onClick={() => setActiveTab("issues")}
          className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "issues"
              ? "border-indigo-500 text-white font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>Issues</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-bold">
            {scan.issueCounts.total}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("pages")}
          className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "pages"
              ? "border-indigo-500 text-white font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>Pages Crawled</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-bold">
            {scan.pageCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("plan")}
          className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "plan"
              ? "border-indigo-500 text-white font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>AI Action Plan</span>
        </button>
      </div>

      {/* Tab: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Top Score Banner */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#131b2e] border border-slate-800 flex flex-col md:flex-row items-center gap-8 shadow-xl">
            {/* Score Gauge */}
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" className="stroke-slate-800" strokeWidth="8" fill="transparent" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-indigo-500 transition-all duration-1000"
                  strokeWidth="8"
                  strokeDasharray={264}
                  strokeDashoffset={264 - (264 * (scan.overallScore || 0)) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-4xl font-extrabold text-white">{scan.overallScore || 0}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Health</span>
              </div>
            </div>

            {/* Summary Text & Issues breakdown */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <h2 className="text-xl font-bold text-white">SEO Health Score: {scan.overallScore}/100</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                {scan.summary || "Comprehensive technical crawl and on-page rule assessment."}
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2">
                <div className="px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                  Critical: <strong>{scan.issueCounts.critical}</strong>
                </div>
                <div className="px-3 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
                  High: <strong>{scan.issueCounts.high}</strong>
                </div>
                <div className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                  Medium: <strong>{scan.issueCounts.medium}</strong>
                </div>
                <div className="px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                  Low: <strong>{scan.issueCounts.low}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* 5-Category Breakdown Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="p-5 rounded-2xl bg-[#131b2e] border border-slate-800 text-center">
              <div className="text-xs text-slate-400 uppercase font-semibold">Technical (30%)</div>
              <div className="text-3xl font-extrabold text-white mt-2">{scan.technicalScore || 0}</div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${scan.technicalScore || 0}%` }} />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#131b2e] border border-slate-800 text-center">
              <div className="text-xs text-slate-400 uppercase font-semibold">On-Page (25%)</div>
              <div className="text-3xl font-extrabold text-white mt-2">{scan.onPageScore || 0}</div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-violet-500 h-full rounded-full" style={{ width: `${scan.onPageScore || 0}%` }} />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#131b2e] border border-slate-800 text-center">
              <div className="text-xs text-slate-400 uppercase font-semibold">Performance (25%)</div>
              <div className="text-3xl font-extrabold text-white mt-2">{scan.performanceScore || 0}</div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${scan.performanceScore || 0}%` }} />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#131b2e] border border-slate-800 text-center">
              <div className="text-xs text-slate-400 uppercase font-semibold">Security (10%)</div>
              <div className="text-3xl font-extrabold text-white mt-2">{scan.securityScore || 0}</div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${scan.securityScore || 0}%` }} />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#131b2e] border border-slate-800 text-center col-span-2 sm:col-span-1">
              <div className="text-xs text-slate-400 uppercase font-semibold">Accessibility (10%)</div>
              <div className="text-3xl font-extrabold text-white mt-2">{scan.accessibilityScore || 0}</div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${scan.accessibilityScore || 0}%` }} />
              </div>
            </div>
          </div>

          {/* Core Web Vitals Lab Data */}
          {scan.metrics && (
            <div className="p-6 rounded-3xl bg-[#131b2e] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    Core Web Vitals & PageSpeed Lab Metrics
                  </h3>
                  <p className="text-xs text-slate-400">Simulated mobile load metrics evaluated for root landing page</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/20">
                  {scan.metrics.source === "measured" ? "Measured (PageSpeed)" : "Estimated"} · Perf {scan.metrics.perfScore}/100
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 text-center">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">LCP (Largest Paint)</div>
                  <div className="text-xl font-bold text-white mt-1">{scan.metrics.lcp}s</div>
                  <div className="text-[10px] mt-1 text-slate-500">Target ≤ 2.5s</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 text-center">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">INP (Interaction)</div>
                  <div className="text-xl font-bold text-white mt-1">{scan.metrics.inp}ms</div>
                  <div className="text-[10px] mt-1 text-slate-500">Target ≤ 200ms</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 text-center">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">CLS (Layout Shift)</div>
                  <div className="text-xl font-bold text-white mt-1">{scan.metrics.cls}</div>
                  <div className="text-[10px] mt-1 text-slate-500">Target ≤ 0.1</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 text-center">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">FCP (First Paint)</div>
                  <div className="text-xl font-bold text-white mt-1">{scan.metrics.fcp}s</div>
                  <div className="text-[10px] mt-1 text-slate-500">Target ≤ 1.8s</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 text-center col-span-2 sm:col-span-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">TBT (Blocking Time)</div>
                  <div className="text-xl font-bold text-white mt-1">{scan.metrics.tbt}ms</div>
                  <div className="text-[10px] mt-1 text-slate-500">Target ≤ 200ms</div>
                </div>
              </div>

              {scan.metrics.opportunities && scan.metrics.opportunities.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Top Performance Opportunities
                  </div>
                  <div className="space-y-2">
                    {scan.metrics.opportunities.map((opp, idx) => (
                      <div key={idx} className="flex items-start justify-between text-xs p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                        <div>
                          <div className="font-semibold text-slate-200">{opp.title}</div>
                          <div className="text-slate-400 mt-0.5">{opp.description}</div>
                        </div>
                        {opp.savings && (
                          <span className="text-indigo-400 font-mono font-semibold shrink-0 ml-2">{opp.savings}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: ISSUES */}
      {activeTab === "issues" && (
        <div className="space-y-6">
          {/* Issue Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#131b2e] border border-slate-800">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-300">Category:</span>
              <select
                value={issueCategoryFilter}
                onChange={(e) => setIssueCategoryFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="technical">Technical</option>
                <option value="onpage">On-Page</option>
                <option value="performance">Performance</option>
                <option value="security">Security</option>
                <option value="accessibility">Accessibility</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">Severity:</span>
              <select
                value={issueSeverityFilter}
                onChange={(e) => setIssueSeverityFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Grouped Issues List */}
          <div className="space-y-4">
            {filteredIssues.map((issue) => (
              <div
                key={issue.code}
                className="p-5 rounded-2xl bg-[#131b2e] border border-slate-800 hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        issue.severity === "critical"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                          : issue.severity === "high"
                          ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
                          : issue.severity === "medium"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                      }`}
                    >
                      {issue.severity}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold uppercase">{issue.category}</span>
                  </div>

                  {issue.affectedPages.length > 0 && (
                    <button
                      onClick={() => setSelectedIssuePages({ title: issue.title, urls: issue.affectedPages })}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                    >
                      <span>{issue.count} affected page(s)</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <h3 className="text-base font-bold text-white">{issue.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{issue.message}</p>
              </div>
            ))}

            {filteredIssues.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">
                No issues match the selected category/severity filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: PAGES CRAWLED */}
      {activeTab === "pages" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-[#131b2e] border border-slate-800">
            <div className="flex items-center gap-2 w-full max-w-md">
              <Search className="w-4 h-4 text-slate-400 pl-1" />
              <input
                type="text"
                placeholder="Filter pages by URL or title..."
                value={pageSearch}
                onChange={(e) => setPageSearch(e.target.value)}
                className="w-full bg-transparent border-none text-white text-xs placeholder-slate-500 focus:outline-none"
              />
            </div>
            <span className="text-xs text-slate-400 shrink-0">{filteredPages.length} pages</span>
          </div>

          <div className="overflow-hidden rounded-2xl bg-[#131b2e] border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Page URL</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Words</th>
                  <th className="py-3 px-4">H1s</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4 text-right">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredPages.map((page) => (
                  <tr key={page.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-medium text-white truncate">{page.title || "Untitled Page"}</div>
                      <div className="text-slate-400 font-mono text-[11px] truncate mt-0.5">{page.url}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono font-bold ${
                          page.statusCode === 200
                            ? "bg-emerald-500/10 text-emerald-400"
                            : page.statusCode >= 400
                            ? "bg-rose-500/10 text-rose-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {page.statusCode}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{page.wordCount}</td>
                    <td className="py-3 px-4 text-slate-300">{page.h1Count}</td>
                    <td className="py-3 px-4 text-slate-400">{page.responseTimeMs}ms</td>
                    <td className="py-3 px-4 text-right font-bold text-indigo-400">
                      {page.issueCount > 0 ? page.issueCount : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: AI ACTION PLAN */}
      {activeTab === "plan" && scan.aiPlan && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#131b2e] border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <Sparkles className="w-5 h-5" />
              <h2 className="text-lg font-bold text-white">Executive AI Roadmap & Strategy</h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {scan.aiPlan.executive_summary}
            </p>
          </div>

          {/* Phased Action Plan Tabs */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActivePlanTab("30")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activePlanTab === "30"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                30-Day Priorities (Immediate Fixes)
              </button>
              <button
                onClick={() => setActivePlanTab("60")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activePlanTab === "60"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                60-Day Optimization
              </button>
              <button
                onClick={() => setActivePlanTab("90")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activePlanTab === "90"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                90-Day Authority & Schema
              </button>
            </div>

            <div className="p-6 rounded-3xl bg-[#131b2e] border border-slate-800 space-y-3">
              <ul className="space-y-3">
                {scan.aiPlan.action_plan[`day_${activePlanTab}` as "day_30" | "day_60" | "day_90"].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Prioritized Recommendations */}
          <div className="space-y-4 pt-4">
            <h3 className="text-base font-bold text-white">Prioritized High-Impact Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scan.aiPlan.prioritized_recommendations.map((rec, i) => (
                <div key={i} className="p-5 rounded-2xl bg-[#131b2e] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Priority: {rec.priority}
                    </span>
                    <span className="text-xs text-slate-400">{rec.affected_page_count} pages affected</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{rec.title}</h4>
                  <p className="text-xs text-slate-300"><strong className="text-slate-200">Problem:</strong> {rec.problem}</p>
                  <p className="text-xs text-slate-300"><strong className="text-slate-200">Why it matters:</strong> {rec.why_it_matters}</p>
                  <div className="mt-2 pt-2 border-t border-slate-800 text-xs text-indigo-300">
                    <strong>Action:</strong> {rec.action}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Affected Pages Modal */}
      {selectedIssuePages && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#131b2e] border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white truncate">{selectedIssuePages.title}</h3>
              <button
                onClick={() => setSelectedIssuePages(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>
            <p className="text-xs text-slate-400">
              The following {selectedIssuePages.urls.length} page(s) were flagged with this issue:
            </p>
            <div className="overflow-y-auto space-y-2 flex-1 pr-1 font-mono text-xs text-slate-300">
              {selectedIssuePages.urls.map((url, i) => (
                <div key={i} className="p-2 rounded bg-slate-900 border border-slate-800 truncate">
                  {url}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
