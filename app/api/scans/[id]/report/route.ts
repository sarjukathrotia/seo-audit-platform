import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const scan = await prisma.scan.findUnique({
      where: { id },
      include: {
        pages: { take: 100 },
        issues: { take: 200 },
        recommendations: true,
      },
    });

    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    const aiPlan = scan.aiPlan ? JSON.parse(scan.aiPlan) : null;

    const criticalCount = scan.issues.filter((i) => i.severity === "critical").length;
    const highCount = scan.issues.filter((i) => i.severity === "high").length;
    const mediumCount = scan.issues.filter((i) => i.severity === "medium").length;
    const lowCount = scan.issues.filter((i) => i.severity === "low").length;

    const htmlReport = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SEO Audit Report - ${scan.rootUrl}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
      .page-break { page-break-after: always; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 32px;
      line-height: 1.5;
    }
    .header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      font-size: 24px;
      font-weight: 800;
      color: #4f46e5;
    }
    .score-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      display: flex;
      gap: 32px;
      align-items: center;
    }
    .gauge {
      width: 110px;
      height: 110px;
      border-radius: 50%;
      background: #4f46e5;
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: 800;
    }
    .gauge span { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .grid-5 {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      margin-bottom: 28px;
    }
    .cat-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
      background: #ffffff;
    }
    .cat-title { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .cat-score { font-size: 24px; font-weight: 700; color: #0f172a; margin-top: 4px; }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 28px;
      margin-bottom: 12px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
    }
    .pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .pill-critical { background: #fee2e2; color: #991b1b; }
    .pill-high { background: #ffedd5; color: #9a3412; }
    .pill-medium { background: #fef9c3; color: #854d0e; }
    .pill-low { background: #e0e7ff; color: #3730a3; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th { text-align: left; background: #f1f5f9; padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: 600; }
    td { padding: 8px 12px; border: 1px solid #e2e8f0; }
    .action-box {
      background: #f8fafc;
      border-left: 4px solid #4f46e5;
      padding: 12px 16px;
      margin-bottom: 12px;
      border-radius: 0 8px 8px 0;
    }
    .action-heading { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 16px; display: flex; justify-content: flex-end;">
    <button onclick="window.print()" style="background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;">
      Print / Save as PDF
    </button>
  </div>

  <div class="header">
    <div>
      <div class="brand">SEO Audit Platform</div>
      <div style="color: #64748b; font-size: 14px; margin-top: 4px;">Comprehensive Technical & On-Page Audit Report</div>
    </div>
    <div style="text-align: right; font-size: 13px; color: #64748b;">
      <div><strong>Target:</strong> ${scan.rootUrl}</div>
      <div><strong>Date:</strong> ${new Date(scan.createdAt).toLocaleDateString()}</div>
      <div><strong>Pages Analyzed:</strong> ${scan.pages.length}</div>
    </div>
  </div>

  <div class="score-card">
    <div class="gauge">
      ${scan.overallScore ?? 0}
      <span>Health</span>
    </div>
    <div>
      <h2 style="margin: 0 0 6px 0; font-size: 20px;">SEO Health Score: ${scan.overallScore ?? 0}/100</h2>
      <p style="margin: 0; color: #475569; font-size: 14px;">
        ${scan.summary || "Complete technical SEO crawl and rule evaluation summary."}
      </p>
      <div style="display: flex; gap: 16px; margin-top: 12px; font-size: 13px;">
        <div><span class="pill pill-critical">Critical</span> <strong>${criticalCount}</strong></div>
        <div><span class="pill pill-high">High</span> <strong>${highCount}</strong></div>
        <div><span class="pill pill-medium">Medium</span> <strong>${mediumCount}</strong></div>
        <div><span class="pill pill-low">Low</span> <strong>${lowCount}</strong></div>
      </div>
    </div>
  </div>

  <div class="grid-5">
    <div class="cat-box">
      <div class="cat-title">Technical</div>
      <div class="cat-score">${scan.technicalScore ?? 0}</div>
    </div>
    <div class="cat-box">
      <div class="cat-title">On-Page</div>
      <div class="cat-score">${scan.onPageScore ?? 0}</div>
    </div>
    <div class="cat-box">
      <div class="cat-title">Performance</div>
      <div class="cat-score">${scan.performanceScore ?? 0}</div>
    </div>
    <div class="cat-box">
      <div class="cat-title">Security</div>
      <div class="cat-score">${scan.securityScore ?? 0}</div>
    </div>
    <div class="cat-box">
      <div class="cat-title">Accessibility</div>
      <div class="cat-score">${scan.accessibilityScore ?? 0}</div>
    </div>
  </div>

  ${
    aiPlan?.action_plan
      ? `
  <div class="section-title">Phased Remediation Plan</div>
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
    <div class="action-box">
      <div class="action-heading">30-Day Priorities</div>
      <ul style="margin: 0; padding-left: 18px; font-size: 12px;">
        ${aiPlan.action_plan.day_30.map((i: string) => `<li style="margin-bottom: 4px;">${i}</li>`).join("")}
      </ul>
    </div>
    <div class="action-box">
      <div class="action-heading">60-Day Priorities</div>
      <ul style="margin: 0; padding-left: 18px; font-size: 12px;">
        ${aiPlan.action_plan.day_60.map((i: string) => `<li style="margin-bottom: 4px;">${i}</li>`).join("")}
      </ul>
    </div>
    <div class="action-box">
      <div class="action-heading">90-Day Priorities</div>
      <ul style="margin: 0; padding-left: 18px; font-size: 12px;">
        ${aiPlan.action_plan.day_90.map((i: string) => `<li style="margin-bottom: 4px;">${i}</li>`).join("")}
      </ul>
    </div>
  </div>
  `
      : ""
  }

  <div class="section-title">Key SEO Issues Detected (${scan.issues.length})</div>
  <table>
    <thead>
      <tr>
        <th style="width: 100px;">Severity</th>
        <th style="width: 120px;">Category</th>
        <th>Issue Title & Recommendation</th>
        <th>Page URL</th>
      </tr>
    </thead>
    <tbody>
      ${scan.issues
        .slice(0, 30)
        .map(
          (issue) => `
        <tr>
          <td><span class="pill pill-${issue.severity}">${issue.severity}</span></td>
          <td style="text-transform: capitalize; font-weight: 500;">${issue.category}</td>
          <td>
            <strong>${issue.title}</strong>
            <div style="color: #64748b; font-size: 12px; margin-top: 2px;">${issue.message}</div>
          </td>
          <td style="word-break: break-all; font-size: 12px; color: #475569;">
            ${scan.pages.find((p) => p.id === issue.pageId)?.url || scan.rootUrl}
          </td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>

  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
    Generated by SEO Audit Platform — Automated Technical & On-Page Analysis
  </div>
</body>
</html>`;

    return new Response(htmlReport, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate report" }, { status: 500 });
  }
}
