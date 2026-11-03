import type { Index } from "./domain";
import { PORTFOLIO_ID } from "./domain";

export const MAP_METRICS = ["growth", "attainment", "revenue", "share"] as const;
export type MapMetric = (typeof MAP_METRICS)[number];

export interface Brush {
  growth: [number, number];
  share: [number, number];
}

export interface ViewState {
  sel: string;
  period: string;
  mode: "exec" | "analyst";
  kpi: MapMetric;
  cmp: string[];
  brush: Brush | null;
  chat: boolean;
}

function parseRange(raw: string | null): [number, number] | null {
  const parts = (raw ?? "").split("..").map(Number);
  const [lo, hi] = parts;
  return parts.length === 2 && lo !== undefined && hi !== undefined && Number.isFinite(lo) && Number.isFinite(hi) ? [lo, hi] : null;
}
const fmtRange = ([lo, hi]: [number, number]) => `${+lo.toFixed(1)}..${+hi.toFixed(1)}`;

// e.g. ?focus=de&period=2026-03&mode=analyst&map=attainment&compare=de,fr&growth=-5..10&share=5..20&assistant=open
export function parseViewState(params: URLSearchParams, idx: Index): ViewState {
  const focus = params.get("focus");
  const period = params.get("period");
  const growth = parseRange(params.get("growth"));
  const share = parseRange(params.get("share"));
  return {
    sel: focus && idx.has(focus) ? focus : PORTFOLIO_ID,
    period: period && idx.periods.includes(period) ? period : idx.data.meta.latestPeriod,
    mode: params.get("mode") === "analyst" ? "analyst" : "exec",
    kpi: MAP_METRICS.find((m) => m === params.get("map")) ?? "growth",
    cmp: (params.get("compare") ?? "").split(",").filter((id) => id && idx.has(id)),
    brush: growth && share ? { growth, share } : null,
    chat: params.get("assistant") === "open",
  };
}

export function serializeViewState(s: ViewState, idx: Index): string {
  const p = new URLSearchParams();
  if (s.sel !== PORTFOLIO_ID) p.set("focus", s.sel);
  if (s.period !== idx.data.meta.latestPeriod) p.set("period", s.period);
  if (s.mode !== "exec") p.set("mode", s.mode);
  if (s.kpi !== "growth") p.set("map", s.kpi);
  if (s.cmp.length) p.set("compare", s.cmp.join(","));
  if (s.brush) {
    p.set("growth", fmtRange(s.brush.growth));
    p.set("share", fmtRange(s.brush.share));
  }
  if (s.chat) p.set("assistant", "open");
  // keep commas unescaped
  return p.toString().replace(/%2C/g, ",");
}
