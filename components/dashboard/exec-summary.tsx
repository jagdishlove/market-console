import type { AlertRule } from "@/lib/schema";
import { breachesRule, type Index } from "@/lib/domain";
import { fmtPct, fmtSignedPct } from "@/lib/format";
import { StatusBadge } from "../ui/status";

interface Props { idx: Index; marketIds: string[]; period: string; rules: AlertRule[]; onSelect: (id: string) => void }

export function ExecSummary({ idx, marketIds, period, rules, onSelect }: Props) {
  const rows = marketIds.map((id) => ({ id, name: idx.node(id).name, region: idx.node(id).parentId!, k: idx.kpis(id, period) }));
  const risks = rows.filter((r) => r.k.status !== "on_track").sort((a, b) => a.k.attainment - b.k.attainment);
  const byGrowth = [...rows].sort((a, b) => b.k.growth - a.k.growth);
  const up = byGrowth.slice(0, 3), down = byGrowth.slice(-3).reverse();
  const link = (id: string, name: string) => <button className="font-medium text-accent hover:underline" onClick={() => onSelect(id)}>{name}</button>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <section className="card p-4" aria-labelledby="top-risks">
        <h2 id="top-risks" className="text-sm font-semibold">Top risks</h2>
        {risks.length === 0 ? <p className="mt-2 text-sm text-muted">No markets at risk.</p> : (
          <ul className="mt-2 divide-y divide-line">
            {risks.map((r) => {
              const breached = rules.filter((rule) => breachesRule(rule, r.k, r.region));
              return (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span>{link(r.id, r.name)} <span className="text-muted">attainment {fmtPct(r.k.attainment)}</span>{breached.length > 0 && <span className="ml-2 rounded bg-bad/10 px-1.5 py-0.5 text-xs text-bad">Alert: {breached[0]!.name}</span>}</span>
                  <StatusBadge status={r.k.status} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section className="card p-4" aria-labelledby="top-movers">
        <h2 id="top-movers" className="text-sm font-semibold">Top movers (growth vs prior year)</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
          {[["Up", up], ["Down", down]].map(([label, list]) => (
            <div key={label as string}>
              <h3 className="text-xs font-medium text-muted">{label as string}</h3>
              <ul className="mt-1 space-y-1">
                {(list as typeof up).map((r) => <li key={r.id} className="flex justify-between gap-2">{link(r.id, r.name)}<span>{fmtSignedPct(r.k.growth)}</span></li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
