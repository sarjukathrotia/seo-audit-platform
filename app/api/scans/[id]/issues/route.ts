import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const severity = url.searchParams.get("severity");

    const whereClause: any = { scanId: id };
    if (category) whereClause.category = category;
    if (severity) whereClause.severity = severity;

    const issues = await prisma.issue.findMany({
      where: whereClause,
      orderBy: [{ severity: "asc" }, { code: "asc" }],
      include: {
        page: {
          select: {
            url: true,
            title: true,
            statusCode: true,
          },
        },
      },
    });

    // Group issues by code for the UI cards
    const groupedMap = new Map<string, any>();

    for (const issue of issues) {
      const existing = groupedMap.get(issue.code) || {
        code: issue.code,
        title: issue.title,
        message: issue.message,
        category: issue.category,
        severity: issue.severity,
        count: 0,
        affectedPages: [],
        details: [],
      };

      existing.count += 1;
      if (issue.page?.url && !existing.affectedPages.includes(issue.page.url)) {
        existing.affectedPages.push(issue.page.url);
      }
      if (issue.detail) {
        try {
          existing.details.push(JSON.parse(issue.detail));
        } catch {
          // ignore
        }
      }

      groupedMap.set(issue.code, existing);
    }

    const grouped = Array.from(groupedMap.values()).sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4) || b.count - a.count;
    });

    return NextResponse.json({
      issues: issues.map((i) => ({
        id: i.id,
        category: i.category,
        code: i.code,
        severity: i.severity,
        title: i.title,
        message: i.message,
        pageUrl: i.page?.url || null,
        detail: i.detail ? JSON.parse(i.detail) : null,
      })),
      grouped,
      total: issues.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch issues" }, { status: 500 });
  }
}
