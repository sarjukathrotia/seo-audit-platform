import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dispatchScanJob } from "@/lib/worker/queue";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, maxPages = 25, maxDepth = 3, renderJs = false } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    try {
      new URL(formattedUrl);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // 1. Create scan row with status=queued
    const scan = await prisma.scan.create({
      data: {
        rootUrl: formattedUrl,
        status: "queued",
        maxPages: Math.min(100, Math.max(1, parseInt(String(maxPages), 10) || 25)),
        maxDepth: Math.min(10, Math.max(1, parseInt(String(maxDepth), 10) || 3)),
        renderJs: Boolean(renderJs),
      },
    });

    // 2. Enqueue background job (non-blocking)
    await dispatchScanJob(scan.id);

    // 3. Return scanId immediately
    return NextResponse.json({
      scanId: scan.id,
      status: scan.status,
      rootUrl: scan.rootUrl,
    });
  } catch (err: any) {
    console.error("POST /api/scans error:", err);
    return NextResponse.json({ error: err.message || "Failed to create scan" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const scans = await prisma.scan.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        rootUrl: true,
        status: true,
        overallScore: true,
        technicalScore: true,
        onPageScore: true,
        performanceScore: true,
        securityScore: true,
        accessibilityScore: true,
        createdAt: true,
        completedAt: true,
        _count: {
          select: {
            pages: true,
            issues: true,
          },
        },
      },
    });

    return NextResponse.json({ scans });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch scans" }, { status: 500 });
  }
}
