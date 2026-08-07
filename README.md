# SEO Audit Platform

A production-grade, full-stack SEO Audit Platform built with **Next.js 15 (App Router), TypeScript, Prisma, Tailwind CSS, BullMQ / In-Process Worker Architecture, Cheerio, Undici, and Claude AI**.

---

## Features

- **Googlebot-Style BFS Crawler**: Concurrency-limited, polite crawler that respects `robots.txt` disallow directives and parses `sitemap.xml` for complete orphan page discovery.
- **Deterministic Technical SEO Rule Engine (§6.1)**:
  - Canonical missing, mismatches, and redirect loops
  - Broken internal links (4xx/5xx) and external links
  - Title tag and meta description validation & deduplication
  - Broken heading hierarchy (e.g. H3 before H2, missing H1, multiple H1s)
  - 64-bit SimHash and MD5 text shingling for exact and near-duplicate content detection
  - `noindex` directives and sitemap coverage
- **On-Page SEO Checks (§6.2)**:
  - Weak / generic title detection ("Home", "Untitled", "Page 1")
  - Thin content (<300 words)
  - Missing image alt attributes
  - URL structure quality (length, uppercase characters, underscores, query parameters)
  - Dead-end page detection (pages with zero outbound internal links)
  - Schema.org JSON-LD structured data validation
  - Flesch Reading Ease readability scoring
- **Core Web Vitals & PageSpeed Lab Metrics (§6.3)**:
  - LCP, INP, CLS, FCP, and TBT metrics with good/poor thresholds
  - Automated asset and performance optimization savings opportunities
- **Security & Accessibility Audits (§6.4)**:
  - HTTPS enforcement & SSL certificate validity/expiration tracking
  - Mixed content detection
  - Security headers audit (`HSTS`, `CSP`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`)
  - Accessibility landmark and navigation checks
- **SEO Health Score Calculation (§7.0)**:
  - Base 100 points per category with severity deductions: Critical (-15), High (-8), Medium (-4), Low (-1).
  - Weighted overall formula:
    $$\text{Overall} = 0.30 \cdot \text{Technical} + 0.25 \cdot \text{OnPage} + 0.25 \cdot \text{Performance} + 0.10 \cdot \text{Security} + 0.10 \cdot \text{Accessibility}$$
  - Grade bands: A (90-100), B (75-89), C (60-74), D/F (<60).
- **Phased AI Recommendations (§9A)**:
  - Anthropic Claude API prompt integration with defensive JSON parsing
  - Phased 30-day, 60-day, and 90-day actionable implementation roadmaps
- **Client-Ready PDF & Print Reports**:
  - Executive printable audit report format accessible at `/api/scans/:id/report`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (React 19, App Router) + Tailwind CSS + Lucide Icons |
| Backend & API | Next.js API Routes (`/api/scans`) |
| Background Worker | Modular Async Worker / BullMQ on Redis |
| Database | PostgreSQL / SQLite with Prisma ORM |
| Crawler / Fetch | `undici` + `cheerio` + `robots-parser` |
| AI Recommendations | `@anthropic-ai/sdk` (Claude API) with heuristic fallback |
| Testing | Vitest (11 unit tests covering rules and scoring) |

---

## Getting Started

### Prerequisites
- Node.js 18+ (tested on Node v25.2.1)
- npm

### Installation & Run

```bash
# 1. Clone the repository
git clone https://github.com/texas8720/seo-audit-platform.git
cd seo-audit-platform

# 2. Install dependencies
npm install

# 3. Initialize Prisma Database
npx prisma generate
npx prisma db push

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Tests

```bash
npm test
```

---

## License
MIT
