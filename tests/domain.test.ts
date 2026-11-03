import { describe, expect, it } from "vitest";
import { anomaliesIn, breachesRule, PORTFOLIO_ID, statusOf } from "@/lib/domain";
import { idx, LATEST } from "./helpers";

describe("domain", () => {
  it("reproduces data.json's own latest-period status for every market", () => {
    for (const m of idx.data.markets) expect(idx.kpis(m.id, LATEST).status, m.name).toBe(m.kpis.status);
  });

  it("agrees with data.json's precomputed KPIs (to rounding) where they are derivable from the series", () => {
    for (const m of idx.data.markets) {
      const k = idx.kpis(m.id, LATEST);
      expect(k.growth * 100, m.name).toBeCloseTo(m.kpis.growthPct, 0);
      expect(k.attainment * 100, m.name).toBeCloseTo(m.kpis.forecastAttainmentPct, -0.5);
      expect(Math.abs(k.revenue / m.kpis.revenue - 1), m.name).toBeLessThan(0.05);
      expect(k.share).toBeCloseTo(m.kpis.sharePct / 100, 5);
    }
  });

  it("classifies status from attainment and growth", () => {
    expect(statusOf(1.0, 0.05)).toBe("on_track");
    expect(statusOf(0.95, 0.05)).toBe("at_risk");
    expect(statusOf(1.04, -0.05)).toBe("off_track");
  });

  it("aggregates children consistently up the hierarchy", () => {
    const regions = idx.children(PORTFOLIO_ID).reduce((a, r) => a + idx.kpis(r.id, LATEST).revenue, 0);
    expect(regions).toBeCloseTo(idx.kpis(PORTFOLIO_ID, LATEST).revenue, 0);
    const products = idx.children("de").reduce((a, p) => a + idx.kpis(p.id, LATEST).revenue, 0);
    expect(products).toBeCloseTo(idx.kpis("de", LATEST).revenue, 0);
  });

  it("derives the drill path from a node id", () => {
    expect(idx.path("de.veltrix").map((n) => n.id)).toEqual([PORTFOLIO_ID, "eu", "de", "de.veltrix"]);
    expect(idx.node("nope").id).toBe(PORTFOLIO_ID);
  });

  it("has no share at product level, and a weighted share for groups", () => {
    expect(idx.kpis("de.veltrix", LATEST).share).toBeNull();
    const eu = idx.kpis("eu", LATEST).share!;
    const shares = idx.marketIds("eu").map((m) => idx.kpis(m, LATEST).share!);
    expect(eu).toBeGreaterThan(Math.min(...shares));
    expect(eu).toBeLessThan(Math.max(...shares));
  });

  it("surfaces Germany's March dip from the dataset's anomalies", () => {
    expect(anomaliesIn(idx, "eu").some((a) => a.marketId === "de" && a.period === "2026-03")).toBe(true);
  });

  it("evaluates alert rules by scope and threshold", () => {
    const k = idx.kpis("br", LATEST);
    const rule = { id: "r", name: "x", scope: "latam", severity: "warning" as const, attainmentBelow: 100 };
    expect(breachesRule(rule, k, "latam")).toBe(k.attainment * 100 < 100);
    expect(breachesRule(rule, k, "eu")).toBe(false);
  });
});
