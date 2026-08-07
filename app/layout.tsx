import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SEO Audit Platform — Automated Technical & On-Page Auditor",
  description:
    "Production-grade technical SEO crawler, Core Web Vitals auditor, rule engine, and AI recommendation platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0b0f19] text-slate-100 min-h-screen antialiased selection:bg-indigo-500 selection:text-white">
        <header className="border-b border-slate-800/80 bg-[#0f172a]/90 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  SEO Audit Platform
                </span>
                <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  PRO
                </span>
              </div>
            </a>
            <div className="flex items-center gap-4 text-sm font-medium text-slate-400">
              <a href="/" className="hover:text-white transition-colors">Dashboard</a>
              <a href="https://developers.google.com/search/docs" target="_blank" rel="noreferrer" className="hover:text-white transition-colors hidden sm:inline">Google SEO Docs</a>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
