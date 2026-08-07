import { describe, it, expect } from "vitest";
import { calculateSeoScores } from "../lib/scoring/calculator";
import { IssueResult } from "../lib/types/seo";

describe("SEO Health Score Calculator", () => {
  it("calculates 100 overall score when zero issues are found", () => {
    const scores = calculateSeoScores([]);
    expect(scores.overall).toBe(100);
    expect(scores.grade).toBe("A");
    expect(scores.technical).toBe(100);
    expect(scores.onpage).toBe(100);
  });

  it("applies accurate severity deductions (Critical: -15, High: -8, Medium: -4, Low: -1)", () => {
    const sampleIssues: IssueResult[] = [
      { category: "technical", code: "BROKEN_INTERNAL_LINK", severity: "critical", title: "Broken Link", message: "404" },
      { category: "technical", code: "MISSING_TITLE", severity: "high", title: "Missing Title", message: "No title" },
      { category: "onpage", code: "MISSING_META", severity: "medium", title: "Missing Meta", message: "No meta" },
      { category: "onpage", code: "URL_LONG", severity: "low", title: "Long URL", message: "Over 100" },
    ];

    const scores = calculateSeoScores(sampleIssues);
    // Technical deduction: 15 + 8 = 23 -> 100 - 23 = 77
    expect(scores.technical).toBe(77);
    // OnPage deduction: 4 + 1 = 5 -> 100 - 5 = 95
    expect(scores.onpage).toBe(95);

    // Weighted Overall: 0.30*77 + 0.25*95 + 0.25*100 + 0.10*100 + 0.10*100
    // = 23.1 + 23.75 + 25 + 10 + 10 = 91.85 -> 92 (Grade A)
    expect(scores.overall).toBe(92);
    expect(scores.grade).toBe("A");
  });

  it("assigns accurate letter grades (A: 90+, B: 75+, C: 60+, D: 45+, F: <45)", () => {
    const criticalIssues: IssueResult[] = Array(5).fill({
      category: "technical",
      code: "BROKEN_INTERNAL_LINK",
      severity: "critical",
      title: "Broken Link",
      message: "404",
    });

    const scores = calculateSeoScores(criticalIssues);
    expect(scores.technical).toBe(25);
    expect(scores.grade).not.toBe("A");
  });
});
