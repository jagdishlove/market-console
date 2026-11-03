import { describe, expect, it } from "vitest";
import { parseViewState, serializeViewState } from "@/lib/url-state";
import { idx } from "./helpers";

const parse = (qs: string) => parseViewState(new URLSearchParams(qs), idx);

describe("URL state", () => {
  it("uses defaults for an empty URL and serialises to an empty string", () => {
    const s = parse("");
    expect(s.sel).toBe("portfolio");
    expect(s.mode).toBe("exec");
    expect(serializeViewState(s, idx)).toBe("");
  });

  it("round-trips a complex view", () => {
    const qs = "focus=de.veltrix&period=2026-03&mode=analyst&map=attainment&compare=de,fr&growth=-5..10&share=5..20&assistant=open";
    const s = parse(qs);
    expect(s).toMatchObject({ sel: "de.veltrix", period: "2026-03", mode: "analyst", kpi: "attainment", cmp: ["de", "fr"], chat: true });
    expect(s.brush).toEqual({ growth: [-5, 10], share: [5, 20] });
    expect(serializeViewState(s, idx)).toBe(qs);
    expect(parse(serializeViewState(s, idx))).toEqual(s);
  });

  it("recovers from invalid values rather than crashing", () => {
    const s = parse("focus=ZZ&period=1999-01&mode=weird&map=nope&compare=ZZ,de&growth=a..b&share=1");
    expect(s).toMatchObject({ sel: "portfolio", mode: "exec", kpi: "growth", cmp: ["de"], brush: null });
    expect(s.period).toBe(idx.data.meta.latestPeriod);
  });
});
