"use client";

import { useMemo, useState } from "react";
import { anomaliesIn, breachesRule, type Index, type Kpis } from "@/lib/domain";
import { fmtCurrency, fmtPct, fmtSignedPct } from "@/lib/format";
import type { AlertRule } from "@/lib/schema";
import { StatusBadge } from "../ui/status";

type SortKey = "name" | "revenue" | "growth" | "attainment" | "share" | "status";
const STATUS_RANK = { "off_track": 0, "at_risk": 1, "on_track": 2 } as const;

interface Props { idx: Index; ids: string[]; period: string; selected: string; rules: AlertRule[]; onSelect: (id: string) => void }

export function DataTable({ idx, ids, period, selected, rules, onSelect }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "attainment", dir: 1 });
  const rows = useMemo(() => {
    const base = ids.map((id) => ({ id, node: idx.node(id), k: idx.kpis(id, period) }));
    const val = (r: (typeof base)[number]): number | string =>
      sort.key === "name" ? r.node.name : sort.key === "status" ? STATUS_RANK[r.k.status] : (r.k[sort.key as keyof Kpis] as number | null) ?? -1;
    return base.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir);
  }, [idx, ids, period, sort]);

  const th = (key: SortKey, label: string, right = true) => (
    <th scope="col" aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className={`px-2 py-1.5 ${right ? "text-right" : ""}`}>
      <button className="font-semibold hover:underline" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (-s.dir as 1 | -1) : 1 }))}>
        {label}{sort.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
      </button>
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <caption className="sr-only">KPIs by entity; select a name to drill in</caption>
        <thead className="border-b border-line text-muted">
          <tr>{th("name", "Name", false)}{th("revenue", "Revenue")}{th("growth", "Growth")}{th("attainment", "Attainment")}{th("share", "Share")}{th("status", "Status", false)}<th scope="col" className="px-2 py-1.5">Flags</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted">No rows match the current brush.</td></tr>}
          {rows.map(({ id, node, k }) => {
            const region = idx.path(id).find((n) => n.level === "region")?.id ?? "";
            const breaches = rules.filter((r) => breachesRule(r, k, region));
            const anomalies = anomaliesIn(idx, id).length;
            return (
              <tr key={id} className={`border-b border-line/60 ${selected === id ? "bg-accent/5" : ""}`}>
                <th scope="row" className="px-2 py-1.5"><button className="font-medium text-accent hover:underline" onClick={() => onSelect(id)} aria-current={selected === id}>{node.name}</button></th>
                <td className="px-2 text-right">{fmtCurrency(k.revenue)}</td>
                <td className="px-2 text-right">{fmtSignedPct(k.growth)}</td>
                <td className="px-2 text-right">{fmtPct(k.attainment)}</td>
                <td className="px-2 text-right">{fmtPct(k.share)}</td>
                <td className="px-2"><StatusBadge status={k.status} /></td>
                <td className="px-2 text-muted">{[breaches.length ? `Alert: ${breaches.map((b) => b.name).join(", ")}` : "", anomalies ? `${anomalies} anomaly` : ""].filter(Boolean).join(" · ") || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
