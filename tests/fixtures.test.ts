import { describe, expect, it } from "vitest";
import { resolveCitation } from "@/lib/citations";
import { fixtures, pickFixture } from "@/lib/fixtures";
import { idx } from "./helpers";

describe("starter-pack fixtures", () => {
  it("routes the brief's questions to the intended fixture (first match wins)", () => {
    const id = (q: string) => pickFixture(q).id;
    expect(id("Which markets are at risk this quarter, and why?")).toBe("at-risk");
    expect(id("Why did Germany's revenue dip in March 2026?")).toBe("germany-dip");
    expect(id("Compare APAC and Europe on growth and forecast attainment")).toBe("apac-vs-europe");
    expect(id("What's driving the portfolio's forecast miss?")).toBe("forecast-miss");
    expect(id("What will sales be next year?")).toBe("next-year");
    expect(id("Give me a full portfolio summary")).toBe("summary-long");
    expect(id("force error please")).toBe("error");
    expect(id("tell me a joke")).toBe("default");
  });

  it("covers every awkward case the brief asks for", () => {
    const kinds = new Set(fixtures.fixtures.map((f) => f.kind));
    expect([...kinds].sort()).toEqual(["abstain", "error", "low_confidence", "normal"]);
    expect(Math.max(...fixtures.fixtures.map((f) => f.answer.text.length))).toBeGreaterThan(800);
  });

  it("every citation points at something that exists in data.json", () => {
    for (const f of [fixtures.default, ...fixtures.fixtures])
      for (const c of f.answer.citations) expect(resolveCitation(idx, c).ok, `${f.id}: ${c.label}`).toBe(true);
  });

  it("abstentions carry no citations", () => {
    expect(fixtures.fixtures.find((f) => f.kind === "abstain")?.answer.citations).toEqual([]);
  });
});

describe("resolveCitation", () => {
  it("resolves a product-in-market citation to figures from the dataset", () => {
    const r = resolveCitation(idx, { marketId: "de", productId: "veltrix", period: "2026-03" });
    expect(r).toMatchObject({ ok: true, entityId: "de.veltrix", path: ["Europe", "Germany", "Veltrix · Germany"] });
  });

  it("flags dangling references instead of trusting them", () => {
    expect(resolveCitation(idx, { marketId: "xx", period: "2026-03" }).ok).toBe(false);
    expect(resolveCitation(idx, { marketId: "de", period: "1999-01" }).ok).toBe(false);
  });
});
