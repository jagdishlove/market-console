"use client";

import { useMemo } from "react";
import { PORTFOLIO_ID, type Index } from "@/lib/domain";
import { fmtPct, fmtSignedPct } from "@/lib/format";
import { SERIES_COLORS, SERIES_DASH } from "@/lib/scales";
import { TipRow, TipTitle, useChartTip } from "../ui/chart-tooltip";

interface Axis { key: string; label: string; lo: number; hi: number; get: (idx: Index, id: string, period: string) => number; fmt: (v: number) => string }

export const RADAR_AXES: Axis[] = [
  { key: "growth", label: "Growth", lo: -0.15, hi: 0.3, get: (i, id, p) => i.kpis(id, p).growth, fmt: fmtSignedPct },
  { key: "units", label: "Units growth", lo: -0.15, hi: 0.3, get: (i, id, p) => i.kpis(id, p).unitsGrowth, fmt: fmtSignedPct },
  { key: "attain", label: "Attainment", lo: 0.8, hi: 1.15, get: (i, id, p) => i.kpis(id, p).attainment, fmt: fmtPct },
  { key: "share", label: "Share", lo: 0, hi: 0.4, get: (i, id, p) => i.kpis(id, p).share ?? 0, fmt: fmtPct },
  { key: "mix", label: "Portfolio mix", lo: 0, hi: 0.4, get: (i, id, p) => i.kpis(id, p).revenue / i.kpis(PORTFOLIO_ID, p).revenue, fmt: fmtPct },
];

const SIZE = 340, C = SIZE / 2, R = 110;

export function radarRows(idx: Index, ids: string[], period: string) {
  return ids.map((id) => ({ id, name: idx.node(id).name, values: RADAR_AXES.map((a) => a.get(idx, id, period)) }));
}

export function Radar({ idx, ids, period }: { idx: Index; ids: string[]; period: string }) {
  const tip = useChartTip();
  const rows = useMemo(() => radarRows(idx, ids, period), [idx, ids, period]);
  const angle = (i: number) => (Math.PI * 2 * i) / RADAR_AXES.length - Math.PI / 2;
  const pt = (i: number, t: number): [number, number] => [C + Math.cos(angle(i)) * R * t, C + Math.sin(angle(i)) * R * t];
  const norm = (a: Axis, v: number) => Math.min(1, Math.max(0, (v - a.lo) / (a.hi - a.lo)));

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={tip.ref} className="relative w-full max-w-[380px]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full" role="group" aria-label="Radar chart comparing selected entities on five KPIs. Use the data table for exact values.">
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <polygon key={t} points={RADAR_AXES.map((_, i) => pt(i, t).join(",")).join(" ")} fill="none" stroke="rgb(var(--line))" />
        ))}
        {RADAR_AXES.map((a, i) => {
          const [x, y] = pt(i, 1.2);
          const [x2, y2] = pt(i, 1);
          return (
            <g key={a.key}>
              <line x1={C} y1={C} x2={x2} y2={y2} stroke="rgb(var(--line))" />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="rgb(var(--muted))">{a.label}</text>
            </g>
          );
        })}
        {rows.map((r, si) => {
          const color = SERIES_COLORS[si % SERIES_COLORS.length]!;
          const points = r.values.map((v, i) => pt(i, norm(RADAR_AXES[i]!, v)).join(",")).join(" ");
          const summary = `${r.name}: ${RADAR_AXES.map((a, i) => `${a.label} ${a.fmt(r.values[i]!)}`).join(", ")}`;
          const content = (
            <>
              <TipTitle>{r.name}</TipTitle>
              {RADAR_AXES.map((a, i) => <TipRow key={a.key} label={a.label} value={a.fmt(r.values[i]!)} />)}
            </>
          );
          return (
            <g key={r.id} className="chart-point" tabIndex={0} role="img" aria-label={summary} {...tip.onPointer(content)} {...tip.onFocusTip(content)}>
              <polygon points={points} fill={color} fillOpacity={0.12} stroke={color} strokeWidth={2} strokeDasharray={SERIES_DASH[si % SERIES_DASH.length]} />
              {r.values.map((v, i) => { const [x, y] = pt(i, norm(RADAR_AXES[i]!, v)); return <circle key={i} cx={x} cy={y} r={3} fill={color} />; })}
            </g>
          );
        })}
      </svg>
      {tip.bubble}
      </div>
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
        {rows.map((r, si) => (
          <li key={r.id} className="inline-flex items-center gap-1.5">
            <svg width="22" height="8" aria-hidden="true"><line x1="0" y1="4" x2="22" y2="4" stroke={SERIES_COLORS[si % SERIES_COLORS.length]} strokeWidth="2" strokeDasharray={SERIES_DASH[si % SERIES_DASH.length]} /></svg>
            {r.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RadarTable({ idx, ids, period }: { idx: Index; ids: string[]; period: string }) {
  const rows = radarRows(idx, ids, period);
  return (
    <table className="w-full text-left text-xs">
      <caption className="sr-only">Radar values by entity</caption>
      <thead><tr><th scope="col" className="py-1">Entity</th>{RADAR_AXES.map((a) => <th key={a.key} scope="col" className="py-1 text-right">{a.label}</th>)}</tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-line"><th scope="row" className="py-1 font-medium">{r.name}</th>{r.values.map((v, i) => <td key={i} className="py-1 text-right">{RADAR_AXES[i]!.fmt(v)}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}
