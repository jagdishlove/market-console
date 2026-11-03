import type { AlertRule, Dataset } from "./schema";

export type Level = "portfolio" | "region" | "market" | "product";
export type Status = "on_track" | "at_risk" | "off_track";
export type Metric = "revenue" | "growth" | "attainment" | "share" | "forecastGap";

export interface Point {
  period: string;
  actual: number;
  forecast: number;
  priorYear: number;
  units: number;
}

export interface Node {
  id: string;
  level: Level;
  name: string;
  parentId: string | null;
}

export interface Kpis {
  revenue: number;
  growth: number;
  unitsGrowth: number;
  attainment: number;
  share: number | null;
  forecastGap: number;
  status: Status;
}

export const PORTFOLIO_ID = "portfolio";

// matches the status labels in data.json
export function statusOf(attainment: number, growth: number): Status {
  if (growth < 0) return "off_track";
  if (attainment < 0.97) return "at_risk";
  return "on_track";
}

const sumPoints = (lists: Point[][]): Point[] =>
  (lists[0] ?? []).map((p, i) => {
    const total: Point = { period: p.period, actual: 0, forecast: 0, priorYear: 0, units: 0 };
    for (const l of lists) {
      const q = l[i]!;
      total.actual += q.actual; total.forecast += q.forecast; total.priorYear += q.priorYear; total.units += q.units;
    }
    return total;
  });

export interface Index {
  data: Dataset;
  periods: string[];
  node(id: string): Node;
  children(id: string): Node[];
  path(id: string): Node[];
  marketIds(id: string): string[];
  points(id: string): Point[];
  kpis(id: string, period: string): Kpis;
  scopeRows(id: string): Node[];
  has(id: string): boolean;
}

export function buildIndex(data: Dataset): Index {
  const nodes = new Map<string, Node>();
  nodes.set(PORTFOLIO_ID, { id: PORTFOLIO_ID, level: "portfolio", name: "Portfolio", parentId: null });
  for (const r of data.regions) nodes.set(r.id, { id: r.id, level: "region", name: r.name, parentId: PORTFOLIO_ID });
  for (const m of data.markets) nodes.set(m.id, { id: m.id, level: "market", name: m.name, parentId: m.regionId });
  for (const m of data.markets)
    for (const p of data.products) {
      const id = `${m.id}.${p.id}`;
      nodes.set(id, { id, level: "product", name: `${p.name} · ${m.name}`, parentId: m.id });
    }

  const periods = data.meta.periods;
  const leaf = new Map<string, Point[]>();
  for (const row of [...data.series].sort((a, b) => a.period.localeCompare(b.period))) {
    const key = `${row.marketId}.${row.productId}`;
    const list = leaf.get(key) ?? [];
    list.push({ period: row.period, actual: row.actual, forecast: row.forecast, priorYear: row.priorYear, units: row.units });
    leaf.set(key, list);
  }
  const marketShare = new Map(data.markets.map((m) => [m.id, m.kpis.sharePct / 100]));

  const node = (id: string) => nodes.get(id) ?? nodes.get(PORTFOLIO_ID)!;
  const marketIds = (id: string): string[] => {
    const n = node(id);
    if (n.level === "portfolio") return data.markets.map((m) => m.id);
    if (n.level === "region") return data.markets.filter((m) => m.regionId === n.id).map((m) => m.id);
    return [n.id.split(".")[0]!];
  };
  const leavesOf = (id: string) =>
    node(id).level === "product" ? [node(id).id] : marketIds(id).flatMap((m) => data.products.map((p) => `${m}.${p.id}`));

  const pointsCache = new Map<string, Point[]>();
  const kpiCache = new Map<string, Kpis>();
  const points = (id: string): Point[] => {
    const key = node(id).id;
    let hit = pointsCache.get(key);
    if (!hit) pointsCache.set(key, (hit = sumPoints(leavesOf(key).map((l) => leaf.get(l) ?? []))));
    return hit;
  };
  const children = (id: string): Node[] => {
    const n = node(id);
    if (n.level === "portfolio") return data.regions.map((r) => node(r.id));
    if (n.level === "region") return data.markets.filter((m) => m.regionId === n.id).map((m) => node(m.id));
    if (n.level === "market") return data.products.map((p) => node(`${n.id}.${p.id}`));
    return [];
  };

  // share is per market only; groups use a revenue-weighted average
  const shareOf = (id: string, period: string): number | null => {
    const n = node(id);
    if (n.level === "product") return null;
    if (n.level === "market") return marketShare.get(n.id) ?? null;
    const ms = marketIds(id);
    const weights = ms.map((m) => points(m).find((p) => p.period === period)?.actual ?? 0);
    const total = weights.reduce((a, b) => a + b, 0);
    return total ? ms.reduce((a, m, i) => a + (marketShare.get(m) ?? 0) * weights[i]!, 0) / total : null;
  };

  return {
    data, periods, node, children, marketIds, points,
    has: (id) => nodes.has(id),
    path(id) {
      const out: Node[] = [];
      for (let n: Node | undefined = node(id); n; n = n.parentId ? nodes.get(n.parentId) : undefined) out.unshift(n);
      return out;
    },
    kpis(id, period) {
      const key = `${node(id).id}@${period}`;
      let hit = kpiCache.get(key);
      if (!hit) {
        const p = points(id).find((q) => q.period === period) ?? points(id).at(-1)!;
        const growth = p.actual / p.priorYear - 1;
        const attainment = p.actual / p.forecast;
        hit = {
          revenue: p.actual,
          growth,
          unitsGrowth: p.units / (p.units * (p.priorYear / p.actual)) - 1,
          attainment,
          share: shareOf(id, p.period),
          forecastGap: p.actual - p.forecast,
          status: statusOf(attainment, growth),
        };
        kpiCache.set(key, hit);
      }
      return hit;
    },
    scopeRows(id) {
      const n = node(id);
      if (n.level === "product") return children(n.parentId!);
      if (n.level === "market") return children(n.id);
      return marketIds(id).map((m) => node(m));
    },
  };
}

export function metricValue(k: Kpis, metric: Metric): number {
  return (metric === "revenue" ? k.revenue : metric === "share" ? k.share : k[metric]) ?? 0;
}

export function breachesRule(rule: AlertRule, k: Kpis, regionId: string): boolean {
  if (rule.scope !== PORTFOLIO_ID && rule.scope !== regionId) return false;
  return (
    (rule.growthBelow !== undefined && k.growth * 100 < rule.growthBelow) ||
    (rule.attainmentBelow !== undefined && k.attainment * 100 < rule.attainmentBelow)
  );
}

export function anomaliesIn(idx: Index, id: string) {
  if (idx.node(id).level === "product") return [];
  const markets = new Set(idx.marketIds(id));
  return idx.data.markets.filter((m) => markets.has(m.id)).flatMap((m) => m.kpis.anomalies.map((a) => ({ ...a, marketId: m.id })));
}
