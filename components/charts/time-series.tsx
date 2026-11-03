"use client";

import { line as d3line } from "d3-shape";
import { scaleLinear } from "d3-scale";
import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import { anomaliesIn, type Index } from "@/lib/domain";
import { fmtCurrency, fmtMonth, fmtPeriod, fmtSignedCurrency, fmtSignedPct } from "@/lib/format";
import { TipRow, TipTitle, useChartTip } from "../ui/chart-tooltip";

const W = 720, H = 280, M = { t: 12, r: 12, b: 28, l: 52 };

interface Props { idx: Index; entityId: string; period: string; onPeriod: (p: string) => void }

export function TimeSeries({ idx, entityId, period, onPeriod }: Props) {
  const pts = idx.points(entityId);
  const anomalies = useMemo(() => anomaliesIn(idx, entityId), [idx, entityId]);
  const [hover, setHover] = useState<number | null>(null);
  const liveId = useId();
  const tip = useChartTip();
  const n = pts.length;
  const sel = Math.max(0, idx.periods.indexOf(period));
  const shown = hover ?? sel;

  const x = scaleLinear().domain([0, n - 1]).range([M.l, W - M.r]);
  const maxY = Math.max(...pts.flatMap((p) => [p.actual, p.forecast, p.priorYear]));
  const minY = Math.min(...pts.flatMap((p) => [p.actual, p.forecast, p.priorYear]));
  // y axis doesn't start at zero on purpose
  const y = scaleLinear().domain([minY * 0.8, maxY * 1.05]).range([H - M.b, M.t]).nice();
  const path = (k: "actual" | "forecast" | "priorYear") =>
    d3line<number>().x((i) => x(i)).y((i) => y(pts[i]![k]))(pts.map((_, i) => i)) ?? "";

  const idxFromPointer = (e: Pick<PointerEvent<SVGSVGElement>, "clientX" | "currentTarget">) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    return Math.min(n - 1, Math.max(0, Math.round(x.invert(px))));
  };
  const onKey = (e: KeyboardEvent) => {
    const step = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : e.key === "Home" ? -n : e.key === "End" ? n : 0;
    if (!step) return;
    e.preventDefault();
    onPeriod(idx.periods[Math.min(n - 1, Math.max(0, sel + step))]!);
  };

  const p = pts[shown]!;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span><Key dash="" /> Actual</span>
        <span><Key dash="6 3" light /> Forecast</span>
        <span><Key dash="2 3" muted /> Prior year</span>
      </div>
      <div ref={tip.ref} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-crosshair touch-none rounded"
        tabIndex={0}
        role="group"
        aria-label="Time series of actual, forecast and prior-year revenue. Use left and right arrow keys to change the period."
        aria-describedby={liveId}
        onKeyDown={onKey}
        onPointerMove={(e) => {
          const i = idxFromPointer(e);
          setHover(i);
          const q = pts[i]!;
          tip.onPointer(
            <>
              <TipTitle>{fmtPeriod(q.period)}</TipTitle>
              <TipRow label="Actual" value={fmtCurrency(q.actual)} />
              <TipRow label="Forecast" value={fmtCurrency(q.forecast)} />
              <TipRow label="Prior year" value={fmtCurrency(q.priorYear)} />
              <TipRow label="vs forecast" value={fmtSignedCurrency(q.actual - q.forecast)} />
              <TipRow label="vs prior year" value={fmtSignedPct(q.actual / q.priorYear - 1)} />
            </>,
          ).onPointerMove(e);
        }}
        onPointerLeave={() => { setHover(null); tip.hide(); }}
        onClick={(e) => onPeriod(idx.periods[idxFromPointer(e)]!)}
      >
        {y.ticks(4).map((t) => (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="rgb(var(--line))" />
            <text x={M.l - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="rgb(var(--muted))">{fmtCurrency(t)}</text>
          </g>
        ))}
        {pts.map((q, i) => (i % 3 === 0 ? <text key={q.period} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="rgb(var(--muted))">{fmtMonth(q.period)}{q.period.endsWith("-01") ? ` ’${q.period.slice(2, 4)}` : ""}</text> : null))}
        <path d={path("priorYear")} fill="none" stroke="rgb(var(--muted))" strokeWidth={1.5} strokeDasharray="2 3" />
        <path d={path("forecast")} fill="none" stroke="rgb(var(--ink))" strokeOpacity={0.55} strokeWidth={1.75} strokeDasharray="6 3" />
        <path d={path("actual")} fill="none" stroke="rgb(var(--accent))" strokeWidth={2.5} />
        <line x1={x(shown)} x2={x(shown)} y1={M.t} y2={H - M.b} stroke="rgb(var(--ink))" strokeWidth={1} />
        <circle cx={x(shown)} cy={y(p.actual)} r={4} fill="rgb(var(--accent))" stroke="white" strokeWidth={1.5} />
        {anomalies.map((a) => {
          const i = idx.periods.indexOf(a.period);
          return (
            <g key={`${a.marketId}${a.period}`} transform={`translate(${x(i)},${y(pts[i]!.actual) + 14})`}>
              <path d="M0 -6 6 0 0 6 -6 0z" fill="rgb(var(--bad))" stroke="white"><title>{`${idx.node(a.marketId).name}, ${fmtPeriod(a.period)}: ${a.note}`}</title></path>
            </g>
          );
        })}
      </svg>
      {tip.bubble}
      </div>
      <p id={liveId} className="sr-only" aria-live="polite">
        {fmtPeriod(pts[sel]!.period)}: actual {fmtCurrency(pts[sel]!.actual)}, forecast {fmtCurrency(pts[sel]!.forecast)}, prior year {fmtCurrency(pts[sel]!.priorYear)}.
      </p>
      {anomalies.length > 0 && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
          <svg width="10" height="10" viewBox="-6 -6 12 12" aria-hidden="true"><path d="M0 -6 6 0 0 6 -6 0z" fill="rgb(var(--bad))" /></svg>
          Anomaly flagged in data.json ({anomalies.map((a) => `${idx.node(a.marketId).name}, ${fmtPeriod(a.period)}: ${a.note}`).join("; ")})
        </p>
      )}
    </div>
  );
}

function Key({ dash, light, muted }: { dash: string; light?: boolean; muted?: boolean }) {
  const stroke = muted ? "rgb(var(--muted))" : light ? "rgb(var(--ink) / 0.55)" : "rgb(var(--accent))";
  return <svg width="20" height="8" className="inline" aria-hidden="true"><line x1="0" x2="20" y1="4" y2="4" stroke={stroke} strokeWidth="2" strokeDasharray={dash} /></svg>;
}

export function TimeSeriesTable({ idx, entityId }: { idx: Index; entityId: string }) {
  return (
    <table className="w-full text-left text-xs">
      <caption className="sr-only">Monthly revenue: actual, forecast and prior year</caption>
      <thead><tr><th scope="col" className="py-1">Period</th><th scope="col" className="text-right">Actual</th><th scope="col" className="text-right">Forecast</th><th scope="col" className="text-right">Prior year</th></tr></thead>
      <tbody>
        {idx.points(entityId).map((p) => (
          <tr key={p.period} className="border-t border-line"><th scope="row" className="py-1 font-normal">{fmtPeriod(p.period)}</th><td className="text-right">{fmtCurrency(p.actual)}</td><td className="text-right">{fmtCurrency(p.forecast)}</td><td className="text-right">{fmtCurrency(p.priorYear)}</td></tr>
        ))}
      </tbody>
    </table>
  );
}
