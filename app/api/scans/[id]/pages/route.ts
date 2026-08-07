import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status");
    const pageNum = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);

    const whereClause: any = { scanId: id };
    if (search) {
      whereClause.OR = [
        { url: { contains: search } },
        { title: { contains: search } },
      ];
    }
    if (status) {
      const code = parseInt(status, 10);
      if (!isNaN(code)) {
        whereClause.statusCode = code;
      }
    }

    const [pages, total] = await Promise.all([
      prisma.page.findMany({
        where: whereClause,
        orderBy: { depth: "asc" },
        skip: (pageNum - 1) * limit,
        take: limit,
        include: {
          metrics: true,
          _count: {
            select: {
              issues: true,
              linksFrom: true,
            },
          },
        },
      }),
      prisma.page.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      pages: pages.map((p) => ({
        id: p.id,
        url: p.url,
        finalUrl: p.finalUrl,
        statusCode: p.statusCode,
        responseTimeMs: p.responseTimeMs,
        title: p.title,
        metaDescription: p.metaDescription,
        h1Count: p.h1Count,
        wordCount: p.wordCount,
        canonicalUrl: p.canonicalUrl,
        depth: p.depth,
        rendered: p.rendered,
        issueCount: p._count.issues,
        linkCount: p._count.linksFrom,
      })),
      total,
      page: pageNum,
      limit,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch pages" }, { status: 500 });
  }
}
