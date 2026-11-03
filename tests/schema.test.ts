import { describe, expect, it } from "vitest";
import { AlertRuleInputSchema } from "@/lib/schema";

const base = { name: "Weak growth", scope: "portfolio", severity: "warning" as const };

describe("alert rule schema", () => {
  it("coerces form strings into numbers", () => {
    const r = AlertRuleInputSchema.parse({ ...base, growthBelow: "2.5", attainmentBelow: "" });
    expect(r.growthBelow).toBe(2.5);
    expect(r.attainmentBelow).toBeUndefined();
  });

  it("requires at least one threshold", () => {
    const r = AlertRuleInputSchema.safeParse({ ...base, growthBelow: "", attainmentBelow: "" });
    expect(r.success).toBe(false);
  });

  it("rejects out-of-range and non-numeric values", () => {
    expect(AlertRuleInputSchema.safeParse({ ...base, attainmentBelow: "500" }).success).toBe(false);
    expect(AlertRuleInputSchema.safeParse({ ...base, growthBelow: "abc" }).success).toBe(false);
  });

  it("rejects short names", () => {
    expect(AlertRuleInputSchema.safeParse({ ...base, name: "ab", growthBelow: 1 }).success).toBe(false);
  });
});
