"use client";

import { scaleLinear, scaleSqrt } from "d3-scale";
import { useRef, useState, type PointerEvent } from "react";
import type { Index } from "@/lib/domain";
import { fmtCurrency, fmtPct, fmtSignedPct } from "@/lib/format";
import type { Brush } from "@/lib/url-state";
import { TipRow, TipTitle, useChartTip } from "../ui/chart-tooltip";
import { StatusBadge, statusLabel } from "../ui/status";

const W = 520, H = 320, M = { t: 14, r: 16, b: 38, l: 48 };

export const inBrush = (b: Brush | null, growth: number, share: number) =>
  !b || (growth * 100 >= b.growth[0] && growth * 100 <= b.growth[1] && share * 100 >= b.share[0] && share * 100 <= b.share[1]);

interface Props {
  idx: Index;
  period: string;
  brush: Brush | null;
  scopeMarkets: Set<string>;
  selected: string;
  onBrush: (b: Brush | null) => void;
  onSelect: (marketId: string) => void;
}

export function Scatter({ idx, period, brush, scopeMarkets, selected, onBrush, onSelect }: Props) {
  const rows = idx.data.markets.map((m) => ({ m, k: idx.kpis(m.id, period) }));
  const x = scaleLinear().domain([0, Math.max(...rows.map((r) => r.k.share ?? 0)) * 1.15 * 100]).range([M.l, W - M.r]).nice();
  const gs = rows.map((r) => r.k.growth * 100);
  const y = scaleLinear().domain([Math.min(...gs, 0) - 2, Math.max(...gs) + 2]).range([H - M.b, M.t]).nice();
  const r = scaleSqrt().domain([0, Math.max(...rows.map((q) => q.k.revenue))]).range([4, 20]);

  const tip = useChartTip();
  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const local = (e: PointerEvent): [number, number] => {
    const b = svg.current!.getBoundingClientRect();
    return [((e.clientX - b.left) / b.width) * W, ((e.clientY - b.top) / b.height) * H];
  };
  const commit = (d: NonNullable<typeof drag>) => {
    if (Math.abs(d.x1 - d.x0) < 6 && Math.abs(d.y1 - d.y0) < 6) return onBrush(null);
    const [sx0, sx1] = [x.invert(Math.min(d.x0, d.x1)), x.invert(Math.max(d.x0, d.x1))];
    const [gy0, gy1] = [y.invert(Math.max(d.y0, d.y1)), y.invert(Math.min(d.y0, d.y1))];
    onBrush({ share: [sx0, sx1], growth: [gy0, gy1] });
  };

  const rect = drag
    ? { x: Math.min(drag.x0, drag.x1), y: Math.min(drag.y0, drag.y1), w: Math.abs(drag.x1 - drag.x0), h: Math.abs(drag.y1 - drag.y0) }
    : brush
      ? { x: x(brush.share[0]), y: y(brush.growth[1]), w: x(brush.share[1]) - x(brush.share[0]), h: y(brush.growth[0]) - y(brush.growth[1]) }
      : null;

  return (
    <div ref={tip.ref} className="relative">
    <svg
      ref={svg}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full touch-none"
      role="group"
      aria-label="Scatter plot of growth against market share, bubble size is revenue. Drag to brush a region; use the data table for keyboard brushing."
    >
      {y.ticks(5).map((t) => (
        <g key={t}>
          <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? "rgb(var(--ink) / 0.4)" : "rgb(var(--line))"} />
          <text x={M.l - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="rgb(var(--muted))">{t}%</text>
        </g>
      ))}
      {x.ticks(5).map((t) => <text key={t} x={x(t)} y={H - M.b + 14} textAnchor="middle" fontSize="10" fill="rgb(var(--muted))">{t}%</text>)}
      <text x={(M.l + W - M.r) / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="rgb(var(--muted))">Market share</text>
      <text transform={`translate(12,${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle" fontSize="11" fill="rgb(var(--muted))">Growth vs prior year</text>
      <rect
        x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} fill="transparent" className="cursor-crosshair"
        onPointerDown={(e) => { svg.current?.setPointerCapture(e.pointerId); const [px, py] = local(e); setDrag({ x0: px, y0: py, x1: px, y1: py }); }}
        onPointerMove={(e) => { if (drag) { const [px, py] = local(e); setDrag({ ...drag, x1: px, y1: py }); } }}
        onPointerUp={() => { if (drag) { commit(drag); setDrag(null); } }}
      />
      {rect && <rect {...{ x: rect.x, y: rect.y, width: rect.w, height: rect.h }} fill="rgb(var(--accent))" fillOpacity={0.1} stroke="rgb(var(--accent))" strokeDasharray="4 3" pointerEvents="none" />}
      {rows.map(({ m, k }) => {
        const active = inBrush(brush, k.growth, k.share ?? 0) && scopeMarkets.has(m.id);
        const cx = x((k.share ?? 0) * 100), cy = y(k.growth * 100), rad = r(k.revenue);
        const stroke = k.status === "off_track" ? "rgb(var(--bad))" : k.status === "at_risk" ? "rgb(var(--warn))" : "rgb(var(--good))";
        const label = `${m.name}: share ${fmtPct(k.share)}, growth ${fmtSignedPct(k.growth)}, revenue ${fmtCurrency(k.revenue)}, ${statusLabel(k.status)}`;
        const content = (
          <>
            <TipTitle>{m.name}</TipTitle>
            <TipRow label="Share" value={fmtPct(k.share)} />
            <TipRow label="Growth" value={fmtSignedPct(k.growth)} />
            <TipRow label="Revenue" value={fmtCurrency(k.revenue)} />
            <div className="mt-1"><StatusBadge status={k.status} /></div>
          </>
        );
        return (
          <g
            {...tip.onPointer(content)} {...tip.onFocusTip(content)}
            key={m.id} tabIndex={0} role="button" aria-label={label} aria-pressed={selected === m.id} opacity={active ? 1 : 0.25} className="chart-point cursor-pointer"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onSelect(m.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(m.id); } }}
          >
            <circle cx={cx} cy={cy} r={rad} fill={stroke} fillOpacity={0.2} stroke={stroke} strokeWidth={selected === m.id ? 3 : 1.5} strokeDasharray={k.status === "on_track" ? "" : k.status === "at_risk" ? "4 2" : "1.5 2"} />
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="600" fill="rgb(var(--ink))" pointerEvents="none">{m.id}</text>
          </g>
        );
      })}
    </svg>
    {tip.bubble}
    </div>
  );
}

export function ScatterTable({ idx, period, brush, onBrush }: { idx: Index; period: string; brush: Brush | null; onBrush: (b: Brush | null) => void }) {
  const b = brush ?? { growth: [-100, 100], share: [0, 100] };
  const set = (path: "growth" | "share", i: 0 | 1, v: string) => {
    const n = Number(v);
    if (v === "" || Number.isNaN(n)) return;
    const next = { growth: [...b.growth], share: [...b.share] } as Brush;
    next[path][i] = n;
    onBrush(next);
  };
  const field = (label: string, path: "growth" | "share", i: 0 | 1) => (
    <label className="text-xs">
      <span className="label">{label}</span>
      <input className="input w-20" type="number" step="0.5" value={+b[path][i].toFixed(1)} onChange={(e) => set(path, i, e.target.value)} />
    </label>
  );
  return (
    <div>
      <fieldset className="mb-3 flex flex-wrap items-end gap-3">
        <legend className="mb-1 text-xs font-medium">Brush by value (percent)</legend>
        {field("Growth min", "growth", 0)}{field("Growth max", "growth", 1)}{field("Share min", "share", 0)}{field("Share max", "share", 1)}
        <button className="btn" onClick={() => onBrush(null)} disabled={!brush}>Clear brush</button>
      </fieldset>
      <table className="w-full text-left text-xs">
        <caption className="sr-only">Growth, share and revenue by market</caption>
        <thead><tr><th scope="col">Market</th><th scope="col" className="text-right">Share</th><th scope="col" className="text-right">Growth</th><th scope="col" className="text-right">Revenue</th><th scope="col">In brush</th></tr></thead>
        <tbody>
          {idx.data.markets.map((m) => {
            const k = idx.kpis(m.id, period);
            return <tr key={m.id} className="border-t border-line"><th scope="row" className="py-1 font-medium">{m.name}</th><td className="text-right">{fmtPct(k.share)}</td><td className="text-right">{fmtSignedPct(k.growth)}</td><td className="text-right">{fmtCurrency(k.revenue)}</td><td>{inBrush(brush, k.growth, k.share ?? 0) ? "Yes" : "No"}</td></tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}
