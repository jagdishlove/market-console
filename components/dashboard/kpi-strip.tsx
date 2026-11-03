import type { Index } from "@/lib/domain";
import { fmtCurrency, fmtPct, fmtSignedCurrency, fmtSignedPct } from "@/lib/format";
import { StatusBadge } from "../ui/status";

function Card({ label, value, note, children }: { label: string; value: string; note?: string; children?: React.ReactNode }) {
  return (
    <div className="card px-4 py-3">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tracking-tight xl:text-2xl">{value}</dd>
      {note && <dd className="mt-0.5 text-xs text-muted">{note}</dd>}
      {children}
    </div>
  );
}

export function KpiStrip({ idx, entityId, period, detailed }: { idx: Index; entityId: string; period: string; detailed: boolean }) {
  const k = idx.kpis(entityId, period);
  const markets = idx.marketIds(entityId);
  const atRisk = markets.filter((m) => idx.kpis(m, period).status !== "on_track").length;
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Card label="Revenue (month)" value={fmtCurrency(k.revenue)} note={detailed ? `Units growth ${fmtSignedPct(k.unitsGrowth)}` : undefined} />
      <Card label="Growth vs prior year" value={fmtSignedPct(k.growth)} />
      <Card label="Forecast attainment" value={fmtPct(k.attainment)} note={detailed ? `Gap ${fmtSignedCurrency(k.forecastGap)}` : undefined}>
        <dd className="mt-1"><StatusBadge status={k.status} /></dd>
      </Card>
      <Card label="Market share" value={fmtPct(k.share)} />
      <Card label="Markets at risk" value={`${atRisk} of ${markets.length}`} note={atRisk ? "At risk or off track" : "All on track"} />
    </dl>
  );
}
