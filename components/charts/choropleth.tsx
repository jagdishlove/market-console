"use client";

import { geoCentroid, geoNaturalEarth1, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { useEffect, useMemo, useState } from "react";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { metricValue, type Index } from "@/lib/domain";
import { ISO3_TO_NUMERIC } from "@/lib/geo";
import { fmtMetric, METRIC_LABEL } from "@/lib/format";
import { colourScale } from "@/lib/scales";
import type { MapMetric } from "@/lib/url-state";
import { anomaliesIn } from "@/lib/domain";
import { fmtCurrency, fmtPct, fmtSignedPct } from "@/lib/format";
import { TipRow, TipTitle, useChartTip } from "../ui/chart-tooltip";
import { StatusBadge, StatusShape, statusLabel } from "../ui/status";

type Countries = FeatureCollection<Geometry, { name: string }>;
const W = 960, H = 460;

async function loadCountries(): Promise<Countries> {
  const topo = (await import("world-atlas/countries-110m.json")).default as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
  const fc = feature(topo, topo.objects.countries);
  return { ...fc, features: fc.features.filter((f) => f.id !== "010") }; // drop Antarctica
}

interface Props {
  idx: Index;
  metric: MapMetric;
  period: string;
  selected: string;
  scopeMarkets: Set<string>;
  onSelect: (marketId: string) => void;
}

export function Choropleth({ idx, metric, period, selected, scopeMarkets, onSelect }: Props) {
  const tip = useChartTip();
  const [countries, setCountries] = useState<Countries | null>(null);
  useEffect(() => { void loadCountries().then(setCountries); }, []);

  const byIso = useMemo(() => new Map(idx.data.markets.map((m) => [ISO3_TO_NUMERIC[m.iso3], m])), [idx]);
  const { paths, scale, values } = useMemo(() => {
    const values = new Map(idx.data.markets.map((m) => [m.id, idx.kpis(m.id, period)]));
    const maxRev = Math.max(...[...values.values()].map((k) => k.revenue));
    const scale = colourScale(metric, maxRev);
    if (!countries) return { paths: [], scale, values };
    const projection = geoNaturalEarth1().fitSize([W, H], countries);
    const path = geoPath(projection);
    const paths = countries.features.map((f: Feature<Geometry, { name: string }>) => {
      const market = byIso.get(String(f.id).padStart(3, "0"));
      const c = market ? path.centroid(f) : null;
      return { f, d: path(f) ?? "", market, centroid: c ?? ([0, 0] as [number, number]), geo: market ? geoCentroid(f) : null };
    });
    return { paths, scale, values };
  }, [countries, idx, metric, period, byIso]);

  if (!countries) return <div className="h-[300px] animate-pulse rounded bg-canvas" role="status" aria-label="Loading map" />;

  const metricOf = (id: string) => {
    const k = values.get(id)!;
    return metricValue(k, metric);
  };
  const dimmed = (id: string) => !scopeMarkets.has(id);

  return (
    <div ref={tip.ref} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="map w-full" role="group" aria-label={`World map coloured by ${METRIC_LABEL[metric]}. ${idx.data.markets.length} markets are interactive.`}>
        {paths.map(({ f, d, market, centroid }) => {
          if (!market) return <path key={String(f.id)} d={d} fill="rgb(var(--line))" stroke="rgb(var(--surface))" strokeWidth={0.4} />;
          const k = values.get(market.id)!;
          const label = `${market.name}: ${METRIC_LABEL[metric]} ${fmtMetric(metric, metricOf(market.id))}, ${statusLabel(k.status)}`;
          const activate = () => onSelect(market.id);
          const note = anomaliesIn(idx, market.id)[0]?.note;
          const content = (
            <>
              <TipTitle>{market.name}</TipTitle>
              <TipRow label="Revenue" value={fmtCurrency(k.revenue)} />
              <TipRow label="Growth" value={fmtSignedPct(k.growth)} />
              <TipRow label="Attainment" value={fmtPct(k.attainment)} />
              <TipRow label="Share" value={fmtPct(k.share)} />
              <div className="mt-1"><StatusBadge status={k.status} /></div>
              {note && <div className="mt-1 text-muted">{note}</div>}
            </>
          );
          return (
            <g key={market.id} opacity={dimmed(market.id) ? 0.35 : 1}>
              <path
                {...tip.onPointer(content)}
                {...tip.onFocusTip(content)}
                d={d}
                fill={scale.color(metricOf(market.id))}
                stroke={selected === market.id ? "rgb(var(--ink))" : "rgb(var(--surface))"}
                strokeWidth={selected === market.id ? 1.5 : 0.8}
                tabIndex={0}
                role="button"
                aria-label={label}
                aria-pressed={selected === market.id}
                className="map-country cursor-pointer"
                onClick={activate}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } }}
              
              />
              <g transform={`translate(${centroid[0] - 6},${centroid[1] - 6})`} pointerEvents="none">
                <rect x={-2} y={-2} width={16} height={16} rx={8} fill="rgb(var(--surface))" opacity={0.9} />
                <g transform="translate(1,1)"><StatusShape status={k.status} size={10} /></g>
              </g>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5">
          {scale.ticks[0] !== undefined && fmtMetric(metric, scale.ticks[0])}
          <span className="inline-block h-2.5 w-32 rounded" style={{ background: `linear-gradient(90deg, ${Array.from({ length: 9 }, (_, i) => { const t = scale.ticks; const lo = t[0]!, hi = t[t.length - 1]!; return scale.color(lo + ((hi - lo) * i) / 8); }).join(",")})` }} />
          {fmtMetric(metric, scale.ticks[scale.ticks.length - 1]!)}
        </span>
        <span className="inline-flex items-center gap-1"><StatusShape status="on_track" /> On track</span>
        <span className="inline-flex items-center gap-1"><StatusShape status="at_risk" /> At risk</span>
        <span className="inline-flex items-center gap-1"><StatusShape status="off_track" /> Off track</span>
      </div>
      {tip.bubble}
    </div>
  );
}
