"use client";

import { use, useEffect, useState } from "react";
import {
  ShieldCheck,
  Zap,
  Globe,
  FileText,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
  Layers,
  Copy,
  Check,
} from "lucide-react";

export default function PublicReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [scan, setScan] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"executive" | "technical">("executive");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/scans/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.scan) setScan(data.scan);
      })
      .catch(() => {});
  }, [id]);

  if (!scan) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Loading client report deliverable...</p>
        </div>
      </div>
    );
  }

  const aiPlan = scan.aiPlan || null;
  const platform = aiPlan?.detected_platform || "Website";

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-20">
      {/* Header */}
      <header className="border-b border-slate-800 bg-[#0f172a]/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              SEO
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wide">Client SEO Audit Deliverable</div>
              <div className="text-[11px] text-slate-400 font-mono">{scan.rootUrl}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex items-center gap-1 text-xs">
              <button
                onClick={() => setViewMode("executive")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  viewMode === "executive" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                Executive View
              </button>
              <button
                onClick={() => setViewMode("technical")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  viewMode === "technical" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                Full Technical
              </button>
            </div>

            <a
              href={`/api/scans/${scan.id}/export`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Excel
            </a>
            <a
              href={`/api/scans/${scan.id}/report/pdf`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-400" />
              PDF
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Top Banner Card */}
        <div className="p-8 rounded-3xl bg-gradient-to-br from-[#131b2e] to-[#0f172a] border border-slate-800 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              {platform} Audit & Roadmap
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Website SEO Health & Action Plan
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {aiPlan?.executive_summary ||
                `Comprehensive technical SEO and on-page audit conducted across ${scan.pageCount} page(s).`}
            </p>
          </div>

          {/* Score Badge */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-900/90 border border-slate-800 text-center shrink-0 w-44">
            <div className="text-4xl font-extrabold text-white">
              {scan.overallScore}
              <span className="text-lg text-slate-500 font-normal">/100</span>
            </div>
            <div className="text-xs font-bold text-emerald-400 mt-1 uppercase tracking-wider">
              {scan.overallScore >= 90
                ? "Excellent (Grade A)"
                : scan.overallScore >= 75
                ? "Good (Grade B)"
                : scan.overallScore >= 60
                ? "Needs Work (Grade C)"
                : "Poor (Grade F)"}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">{scan.pageCount} Pages Crawled</div>
          </div>
        </div>

        {/* 4 Category Pill Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#131b2e] border border-slate-800">
            <div className="text-xs font-bold text-slate-400 uppercase">Technical SEO</div>
            <div className="text-2xl font-black text-white mt-1">{scan.technicalScore}/100</div>
          </div>
          <div className="p-5 rounded-2xl bg-[#131b2e] border border-slate-800">
            <div className="text-xs font-bold text-slate-400 uppercase">On-Page Content</div>
            <div className="text-2xl font-black text-white mt-1">{scan.onPageScore}/100</div>
          </div>
          <div className="p-5 rounded-2xl bg-[#131b2e] border border-slate-800">
            <div className="text-xs font-bold text-slate-400 uppercase">Speed & Vitals</div>
            <div className="text-2xl font-black text-white mt-1">{scan.performanceScore}/100</div>
          </div>
          <div className="p-5 rounded-2xl bg-[#131b2e] border border-slate-800">
            <div className="text-xs font-bold text-slate-400 uppercase">Security & A11y</div>
            <div className="text-2xl font-black text-white mt-1">{scan.securityScore}/100</div>
          </div>
        </div>

        {/* EXECUTIVE VIEW */}
        {viewMode === "executive" && (
          <div className="space-y-8">
            {/* Prioritized Quick Wins & Actions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                  Prioritized High-Impact Actions
                </h2>
                <span className="text-xs text-slate-400">Sorted by Quick Wins first</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiPlan?.prioritized_recommendations?.map((rec: any, i: number) => (
                  <div key={i} className="p-6 rounded-2xl bg-[#131b2e] border border-slate-800 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              rec.effort === "quick_win"
                                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                : "bg-slate-800 text-slate-300 border border-slate-700"
                            }`}
                          >
                            {rec.effort === "quick_win" ? "⚡ Quick Win" : rec.effort || "Moderate"}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            Impact: {rec.impact || rec.priority}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">{rec.affected_page_count} pages affected</span>
                      </div>

                      <h3 className="text-sm font-bold text-white">{rec.title}</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        <strong className="text-slate-200">The Problem:</strong> {rec.problem}
                      </p>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        <strong className="text-slate-200">Why it matters:</strong> {rec.why_it_matters}
                      </p>
                    </div>

                    {/* How to fix steps */}
                    {rec.how_to_fix && rec.how_to_fix.length > 0 && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                        <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                          How to resolve ({platform}):
                        </div>
                        <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1">
                          {rec.how_to_fix.map((step: string, sIdx: number) => (
                            <li key={sIdx}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Copy-paste code snippet if available */}
                    {rec.code_snippet && (
                      <div className="mt-2 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                        <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px]">
                          <span className="font-mono text-slate-400">{rec.code_snippet.filename || "Copy-Paste Fix"}</span>
                          <button
                            onClick={() => handleCopy(rec.code_snippet.code, i)}
                            className="flex items-center gap-1 text-indigo-400 hover:text-white font-semibold"
                          >
                            {copiedIndex === i ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            {copiedIndex === i ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <pre className="p-3 text-[11px] font-mono text-slate-200 overflow-x-auto whitespace-pre-wrap">
                          {rec.code_snippet.code}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Phased Action Plan */}
            {aiPlan?.action_plan && (
              <div className="p-6 rounded-3xl bg-[#131b2e] border border-slate-800 space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-400" />
                  Phased 30 / 60 / 90-Day Remediation Schedule
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Phase 1 (Day 1–30)</div>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {aiPlan.action_plan.day_30?.map((t: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Phase 2 (Day 31–60)</div>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {aiPlan.action_plan.day_60?.map((t: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Phase 3 (Day 61–90)</div>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {aiPlan.action_plan.day_90?.map((t: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TECHNICAL VIEW */}
        {viewMode === "technical" && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-[#131b2e] border border-slate-800">
              <h2 className="text-lg font-bold text-white mb-4">Complete Issue Registry</h2>
              <p className="text-xs text-slate-400 mb-6">
                Showing all detected technical, on-page, security, and performance violations identified during crawl.
              </p>
              <div className="space-y-3">
                {aiPlan?.prioritized_recommendations?.map((r: any, i: number) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start justify-between gap-4 text-xs">
                    <div>
                      <div className="font-bold text-white text-sm">{r.title}</div>
                      <div className="text-slate-300 mt-1">{r.problem}</div>
                      <div className="text-indigo-300 mt-1 font-mono">{r.action}</div>
                    </div>
                    <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 font-bold uppercase shrink-0">
                      {r.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
