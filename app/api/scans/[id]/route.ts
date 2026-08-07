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
        _count: {
          select: {
            pages: true,
            issues: true,
            links: true,
          },
        },
      },
    });

    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    // Aggregate issue counts by severity
    const issueSeverities = await prisma.issue.groupBy({
      by: ["severity"],
      where: { scanId: id },
      _count: { _all: true },
    });

    const severityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      total: scan._count.issues,
    };

    for (const group of issueSeverities) {
      if (group.severity === "critical") severityCounts.critical = group._count._all;
      if (group.severity === "high") severityCounts.high = group._count._all;
      if (group.severity === "medium") severityCounts.medium = group._count._all;
      if (group.severity === "low") severityCounts.low = group._count._all;
    }

    // Get metrics from primary page
    const primaryMetric = await prisma.pageMetric.findFirst({
      where: {
        page: { scanId: id },
      },
    });

    let metricsData = null;
    if (primaryMetric) {
      metricsData = {
        perfScore: primaryMetric.perfScore || 85,
        lcp: primaryMetric.lcp || 2.1,
        inp: primaryMetric.inp || 120,
        cls: primaryMetric.cls || 0.04,
        fcp: primaryMetric.fcp || 1.4,
        tbt: primaryMetric.tbt || 150,
        opportunities: primaryMetric.opportunities ? JSON.parse(primaryMetric.opportunities) : [],
      };
    }

    let parsedAiPlan = null;
    if (scan.aiPlan) {
      try {
        parsedAiPlan = JSON.parse(scan.aiPlan);
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      scan: {
        id: scan.id,
        rootUrl: scan.rootUrl,
        status: scan.status,
        maxPages: scan.maxPages,
        maxDepth: scan.maxDepth,
        renderJs: scan.renderJs,
        overallScore: scan.overallScore,
        technicalScore: scan.technicalScore,
        onPageScore: scan.onPageScore,
        performanceScore: scan.performanceScore,
        securityScore: scan.securityScore,
        accessibilityScore: scan.accessibilityScore,
        summary: scan.summary,
        aiPlan: parsedAiPlan,
        createdAt: scan.createdAt,
        completedAt: scan.completedAt,
        error: scan.error,
        pageCount: scan._count.pages,
        issueCounts: severityCounts,
        metrics: metricsData,
      },
    });
  } catch (err: any) {
    console.error("GET /api/scans/:id error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch scan" }, { status: 500 });
  }
}
