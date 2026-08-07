"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Globe, Shield, Zap, Sparkles, Sliders, ChevronDown, ChevronUp, ArrowRight, CheckCircle2, AlertTriangle, Layers } from "lucide-react";

interface RecentScan {
  id: string;
  rootUrl: string;
  status: string;
  overallScore: number | null;
  createdAt: string;
  _count?: {
    pages: number;
    issues: number;
  };
}

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxPages, setMaxPages] = useState(25);
  const [maxDepth, setMaxDepth] = useState(3);
  const [renderJs, setRenderJs] = useState(false);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);

  useEffect(() => {
    fetchRecentScans();
  }, []);

  const fetchRecentScans = async () => {
    try {
      const res = await fetch("/api/scans");
      if (res.ok) {
        const data = await res.json();
        setRecentScans(data.scans || []);
      }
    } catch {
      // ignore
    }
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          maxPages: Number(maxPages),
          maxDepth: Number(maxDepth),
          renderJs: Boolean(renderJs),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start scan");
      }

      router.push(`/scans/${data.scanId}`);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleDemoScan = async () => {
    setDemoLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scans/demo", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load demo");
      router.push(`/scans/${data.scanId}`);
    } catch (err: any) {
      setError(err.message);
      setDemoLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto pt-8 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Production-Grade SEO Crawler & Health Auditor
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Audit Any Website for <br />
          <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
            Technical SEO, Core Web Vitals & AI Action Plans
          </span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-400">
          Googlebot-style BFS crawler, rule-based diagnostic engine, PageSpeed Insights evaluator, and phased 30/60/90-day AI remediation plans.
        </p>

        {/* Search & Audit Form */}
        <form onSubmit={handleScanSubmit} className="mt-8">
          <div className="relative max-w-2xl mx-auto">
            <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2 shadow-2xl shadow-indigo-950/40 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
              <div className="pl-3 pr-2 text-slate-500">
                <Globe className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter domain or URL (e.g., example.com or https://site.io)"
                className="w-full bg-transparent border-none text-white placeholder-slate-500 focus:outline-none text-base px-2"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enqueuing...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Scan Website
                  </>
                )}
              </button>
            </div>

            {/* Advanced Options Toggle */}
            <div className="mt-3 flex items-center justify-between px-2 text-xs text-slate-400">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="inline-flex items-center gap-1 hover:text-indigo-400 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Crawl Settings ({maxPages} pages, depth {maxDepth})</span>
                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={handleDemoScan}
                disabled={demoLoading}
                className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
              >
                {demoLoading ? "Loading Demo..." : "Try Interactive Demo Scan →"}
              </button>
            </div>

            {/* Advanced Settings Drawer */}
            {showAdvanced && (
              <div className="mt-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-left grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm animate-in fade-in">
                <div>
                  <label className="block text-slate-400 font-medium mb-1 text-xs">Max Pages to Crawl</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={maxPages}
                    onChange={(e) => setMaxPages(parseInt(e.target.value, 10) || 25)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1 text-xs">Max Crawl Depth</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(parseInt(e.target.value, 10) || 3)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1 text-xs">Client-Side Rendering</label>
                  <button
                    type="button"
                    onClick={() => setRenderJs(!renderJs)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      renderJs
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {renderJs ? "Playwright JS: ON" : "Static HTML (Fast)"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>

        {error && (
          <div className="mt-4 max-w-md mx-auto p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="p-6 rounded-2xl bg-[#131b2e] border border-slate-800/80 hover:border-slate-700 transition-all">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Technical & On-Page Rule Engine</h3>
          <p className="text-sm text-slate-400">
            25+ deterministic audits: canonical loops, 404 dead links, broken H1-H6 hierarchy, SimHash duplicate text, robots.txt, and sitemap coverage.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#131b2e] border border-slate-800/80 hover:border-slate-700 transition-all">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Core Web Vitals & PageSpeed</h3>
          <p className="text-sm text-slate-400">
            Lab metrics breakdown for LCP, INP, CLS, FCP, and TBT with actionable asset savings recommendations and speed optimization paths.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#131b2e] border border-slate-800/80 hover:border-slate-700 transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Phased AI Action Plan</h3>
          <p className="text-sm text-slate-400">
            Claude AI converts raw technical telemetry into structured executive summaries and prioritized 30-day, 60-day, and 90-day implementation roadmaps.
          </p>
        </div>
      </div>

      {/* Recent Scans Table */}
      {recentScans.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Recent Audit Scans</h2>
            <span className="text-xs text-slate-500">{recentScans.length} scans performed</span>
          </div>

          <div className="overflow-hidden rounded-2xl bg-[#131b2e] border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Target Website</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Health Score</th>
                  <th className="py-3.5 px-4">Discovered</th>
                  <th className="py-3.5 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentScans.map((scan) => (
                  <tr
                    key={scan.id}
                    onClick={() => router.push(`/scans/${scan.id}`)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2">
                      <Globe className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="truncate max-w-xs">{scan.rootUrl}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          scan.status === "complete"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : scan.status === "failed"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse"
                        }`}
                      >
                        {scan.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {scan.overallScore !== null ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold ${
                              scan.overallScore >= 85
                                ? "text-emerald-400"
                                : scan.overallScore >= 70
                                ? "text-amber-400"
                                : "text-rose-400"
                            }`}
                          >
                            {scan.overallScore}/100
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-xs">
                      {scan._count ? `${scan._count.pages} pages, ${scan._count.issues} issues` : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs text-right">
                      {new Date(scan.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
