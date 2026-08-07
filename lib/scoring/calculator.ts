import { IssueResult, CategoryScores, IssueCategory, IssueSeverity } from "../types/seo";

const SEVERITY_DEDUCTIONS: Record<IssueSeverity, number> = {
  critical: 15,
  high: 8,
  medium: 4,
  low: 1,
};

export function calculateSeoScores(
  issues: IssueResult[],
  perfScoreOverride?: number
): CategoryScores {
  // Category base scores starting at 100
  const categoryScores: Record<IssueCategory, number> = {
    technical: 100,
    onpage: 100,
    performance: perfScoreOverride !== undefined ? perfScoreOverride : 100,
    security: 100,
    accessibility: 100,
  };

  const deductionMap = new Map<
    string,
    { category: IssueCategory; code: string; title: string; severity: IssueSeverity; deduction: number; count: number }
  >();

  for (const issue of issues) {
    const penalty = SEVERITY_DEDUCTIONS[issue.severity] || 1;
    // Apply penalty to category (capped at 0)
    categoryScores[issue.category] = Math.max(0, categoryScores[issue.category] - penalty);

    // Track top deductions
    const key = `${issue.category}:${issue.code}`;
    const existing = deductionMap.get(key) || {
      category: issue.category,
      code: issue.code,
      title: issue.title,
      severity: issue.severity,
      deduction: 0,
      count: 0,
    };
    existing.deduction += penalty;
    existing.count += 1;
    deductionMap.set(key, existing);
  }

  // If performance score was passed as a measured Lighthouse score, blend it
  if (perfScoreOverride !== undefined) {
    categoryScores.performance = Math.round(
      Math.max(0, Math.min(100, perfScoreOverride - (100 - categoryScores.performance) * 0.5))
    );
  }

  // Weighted overall formula:
  // Overall = 0.30·Technical + 0.25·OnPage + 0.25·Performance + 0.10·Security + 0.10·Accessibility
  const overall = Math.round(
    0.3 * categoryScores.technical +
      0.25 * categoryScores.onpage +
      0.25 * categoryScores.performance +
      0.1 * categoryScores.security +
      0.1 * categoryScores.accessibility
  );

  // Grade mapping
  let grade: "A" | "B" | "C" | "D" | "F" = "F";
  if (overall >= 90) grade = "A";
  else if (overall >= 75) grade = "B";
  else if (overall >= 60) grade = "C";
  else if (overall >= 45) grade = "D";
  else grade = "F";

  const topDeductions = Array.from(deductionMap.values())
    .sort((a, b) => b.deduction - a.deduction)
    .slice(0, 5);

  return {
    technical: categoryScores.technical,
    onpage: categoryScores.onpage,
    performance: categoryScores.performance,
    security: categoryScores.security,
    accessibility: categoryScores.accessibility,
    overall,
    grade,
    topDeductions,
  };
}
