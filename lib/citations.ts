import type { Index } from "./domain";
import { PORTFOLIO_ID, type Kpis } from "./domain";
import type { Citation } from "./schema";

export type ResolvedCitation =
  | { ok: true; entityId: string; period: string; label: string; kpis: Kpis; path: string[] }
  | { ok: false; label: string; reason: string };

export function resolveCitation(idx: Index, c: Citation): ResolvedCitation {
  const label = c.label ?? "Source";
  const entityId = c.marketId && c.productId ? `${c.marketId}.${c.productId}` : (c.marketId ?? c.regionId ?? PORTFOLIO_ID);
  if (!idx.has(entityId)) return { ok: false, label, reason: `“${entityId}” is not in the dataset` };
  const period = c.period ?? idx.data.meta.latestPeriod;
  if (!idx.periods.includes(period)) return { ok: false, label, reason: `Period ${period} is outside the dataset` };
  return { ok: true, entityId, period, label, kpis: idx.kpis(entityId, period), path: idx.path(entityId).slice(1).map((n) => n.name) };
}
