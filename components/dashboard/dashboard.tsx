"use client";

import { useMemo } from "react";
import { metricValue, PORTFOLIO_ID } from "@/lib/domain";
import { fmtMonthName, fmtPeriod, METRIC_LABEL, fmtMetric } from "@/lib/format";
import { MAP_METRICS } from "@/lib/url-state";
import { ChatPanel } from "../chat/chat-panel";
import { Choropleth } from "../charts/choropleth";
import { Radar, RadarTable } from "../charts/radar";
import { inBrush, Scatter, ScatterTable } from "../charts/scatter";
import { TimeSeries, TimeSeriesTable } from "../charts/time-series";
import { ChartFrame } from "../ui/chart-frame";
import { ChatIcon } from "../ui/icons";
import { ErrorBoundary } from "../ui/error-boundary";
import { StatusBadge } from "../ui/status";
import { useIndex } from "../use-dataset";
import { useViewState } from "../use-view-state";
import { AlertPanel } from "./alert-panel";
import { DataTable } from "./data-table";
import { ExecSummary } from "./exec-summary";
import { KpiStrip } from "./kpi-strip";
import { useAlertRules } from "./use-alert-rules";

export function Dashboard() {
  const idx = useIndex();
  const [view, update] = useViewState(idx);
  const rules = useAlertRules().data ?? [];
  const analyst = view.mode === "analyst";

  const path = idx.path(view.sel);
  const node = idx.node(view.sel);
  const scopeMarkets = useMemo(() => new Set(idx.marketIds(view.sel)), [idx, view.sel]);
  const kids = idx.children(view.sel);
  const defaultRadar = (node.level === "portfolio" ? idx.children(PORTFOLIO_ID) : idx.scopeRows(view.sel)).map((n) => n.id).slice(0, 6);
  const radar = view.cmp.length ? view.cmp.slice(0, 6) : defaultRadar;

  const rowIds = idx.scopeRows(view.sel).map((n) => n.id).filter((id) => {
    if (idx.node(id).level !== "market") return true;
    const k = idx.kpis(id, view.period);
    return inBrush(view.brush, k.growth, k.share ?? 0);
  });

  const periodGroups = useMemo(() => {
    const byYear = new Map<string, string[]>();
    for (const p of [...idx.periods].reverse()) byYear.set(p.slice(0, 4), [...(byYear.get(p.slice(0, 4)) ?? []), p]);
    return [...byYear.entries()];
  }, [idx]);

  const select = (sel: string) => update({ sel });
  const toggleCmp = (id: string) => {
    const next = radar.includes(id) ? radar.filter((x) => x !== id) : [...radar, id].slice(0, 6);
    update({ cmp: next }, "replace");
  };

  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:flex-row lg:overflow-hidden">
      <div className="relative flex min-w-0 flex-1 flex-col lg:overflow-y-auto">
        <header className="sticky top-0 z-20 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-base font-semibold">Market Operations Console</h1>
              <nav aria-label="Drill path" className="mt-0.5 flex flex-wrap items-center gap-1 text-sm">
                {path.map((n, i) => (
                  <span key={n.id} className="inline-flex items-center gap-1">
                    {i > 0 && <span aria-hidden="true" className="text-muted">›</span>}
                    <button className={i === path.length - 1 ? "font-semibold" : "text-accent hover:underline"} aria-current={i === path.length - 1 ? "location" : undefined} onClick={() => select(n.id)}>
                      {n.level === "product" ? n.name.split(" · ")[0] : n.name}
                    </button>
                  </span>
                ))}
              </nav>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-muted">
                Period
                <select className="input chev w-auto" value={view.period} onChange={(e) => update({ period: e.target.value })}>
                  {periodGroups.map(([year, periods]) => (
                    <optgroup key={year} label={year}>
                      {periods.map((p) => <option key={p} value={p}>{fmtMonthName(p)}{p === idx.data.meta.latestPeriod ? " (latest)" : ""}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
              <div role="radiogroup" aria-label="Audience mode" className="flex overflow-hidden rounded-md border border-line text-sm">
                {(["exec", "analyst"] as const).map((m) => (
                  <button key={m} role="radio" aria-checked={view.mode === m} onClick={() => update({ mode: m }, "replace")} className={`px-3 py-1.5 ${view.mode === m ? "bg-ink text-white" : "hover:bg-canvas"}`}>
                    {m === "exec" ? "Executive" : "Analyst"}
                  </button>
                ))}
              </div>
              <button className="btn" aria-pressed={view.chat} onClick={() => update({ chat: !view.chat }, "replace")}>
                <ChatIcon /> Assistant
              </button>
            </div>
          </div>
        </header>

        <main id="main" className="flex-1 space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <StatusBadge status={idx.kpis(view.sel, view.period).status} />
            <span className="text-muted">{node.name} · {fmtPeriod(view.period)}</span>
            {kids.length > 0 && (
              <span className="ml-auto flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted">Drill into:</span>
                {kids.map((c) => <button key={c.id} className="btn px-2 py-0.5 text-xs" onClick={() => select(c.id)}>{c.level === "product" ? c.name.split(" · ")[0] : c.name}</button>)}
              </span>
            )}
          </div>

          <KpiStrip idx={idx} entityId={view.sel} period={view.period} detailed={analyst} />

          {!analyst && <ExecSummary idx={idx} marketIds={[...scopeMarkets]} period={view.period} rules={rules} onSelect={select} />}

          <div className={`grid grid-cols-[minmax(0,1fr)] gap-3 ${analyst ? "xl:grid-cols-2" : ""}`}>
            <ErrorBoundary label="Map">
              <ChartFrame
                title="Markets map"
                description="Click a country to drill in."
                actions={
                  <label className="flex items-center gap-1 text-xs text-muted">
                    Colour by
                    <select className="input chev w-auto py-1" value={view.kpi} onChange={(e) => update({ kpi: e.target.value as (typeof MAP_METRICS)[number] }, "replace")}>
                      {MAP_METRICS.map((m) => <option key={m} value={m}>{METRIC_LABEL[m]}</option>)}
                    </select>
                  </label>
                }
                table={
                  <table className="w-full text-left text-xs">
                    <caption className="sr-only">{METRIC_LABEL[view.kpi]} by market</caption>
                    <thead><tr><th scope="col">Market</th><th scope="col" className="text-right">{METRIC_LABEL[view.kpi]}</th><th scope="col">Status</th></tr></thead>
                    <tbody>
                      {idx.data.markets.map((m) => {
                        const k = idx.kpis(m.id, view.period);
                        return <tr key={m.id} className="border-t border-line"><th scope="row" className="py-1"><button className="text-accent hover:underline" onClick={() => select(m.id)}>{m.name}</button></th><td className="text-right">{fmtMetric(view.kpi, metricValue(k, view.kpi))}</td><td><StatusBadge status={k.status} /></td></tr>;
                      })}
                    </tbody>
                  </table>
                }
              >
                <Choropleth idx={idx} metric={view.kpi} period={view.period} selected={view.sel} scopeMarkets={scopeMarkets} onSelect={select} />
              </ChartFrame>
            </ErrorBoundary>

            <ErrorBoundary label="Time series">
              <ChartFrame title={`Revenue: ${node.name}`} description="Actual vs forecast vs prior year. Click or use arrow keys to pick the period." table={<TimeSeriesTable idx={idx} entityId={view.sel} />}>
                <TimeSeries idx={idx} entityId={view.sel} period={view.period} onPeriod={(period) => update({ period }, "replace")} />
              </ChartFrame>
            </ErrorBoundary>

            {analyst && (
              <>
                <ErrorBoundary label="Radar">
                  <ChartFrame
                    title="Compare on KPIs"
                    description={view.cmp.length ? "Custom comparison set." : "Defaults to the current level's peers."}
                    actions={
                      <details className="relative text-xs">
                        <summary className="btn chev cursor-pointer">Compare: {radar.length} of 6 selected</summary>
                        <fieldset className="absolute right-0 z-10 mt-1 max-h-64 w-52 overflow-auto rounded-md border border-line bg-surface p-2 shadow-lg">
                          <legend className="sr-only">Entities to compare</legend>
                          {[...idx.data.regions, ...idx.data.markets].map((e) => (
                            <label key={e.id} className="flex items-center gap-2 py-0.5">
                              <input type="checkbox" checked={radar.includes(e.id)} disabled={!radar.includes(e.id) && radar.length >= 6} onChange={() => toggleCmp(e.id)} /> {e.name}
                            </label>
                          ))}
                        </fieldset>
                      </details>
                    }
                    table={<RadarTable idx={idx} ids={radar} period={view.period} />}
                  >
                    <Radar idx={idx} ids={radar} period={view.period} />
                  </ChartFrame>
                </ErrorBoundary>

                <ErrorBoundary label="Scatter">
                  <ChartFrame
                    title="Growth vs share"
                    description="Bubble size is revenue. Drag to brush; the table below narrows."
                    actions={view.brush && <button className="btn" onClick={() => update({ brush: null }, "replace")}>Clear brush</button>}
                    table={<ScatterTable idx={idx} period={view.period} brush={view.brush} onBrush={(brush) => update({ brush }, "replace")} />}
                  >
                    <Scatter idx={idx} period={view.period} brush={view.brush} scopeMarkets={scopeMarkets} selected={view.sel} onBrush={(brush) => update({ brush }, "replace")} onSelect={select} />
                  </ChartFrame>
                </ErrorBoundary>
              </>
            )}
          </div>

          {analyst && (
            <section className="card" aria-labelledby="table-h">
              <h2 id="table-h" className="border-b border-line px-4 py-3 text-sm font-semibold">
                {node.level === "market" ? "Products" : node.level === "product" ? "Sibling products" : "Markets"}
                {view.brush && <span className="ml-2 font-normal text-muted">filtered by brush ({rowIds.length})</span>}
              </h2>
              <DataTable idx={idx} ids={rowIds} period={view.period} selected={view.sel} rules={rules} onSelect={select} />
            </section>
          )}

          <details open={analyst}>
            <summary className="cursor-pointer text-sm font-medium">Alert thresholds</summary>
            <div className="mt-2"><AlertPanel idx={idx} /></div>
          </details>
        </main>
      </div>

      {view.chat && (
        <ChatPanel
          idx={idx}
          onClose={() => update({ chat: false }, "replace")}
          onShow={(sel, period) => update({ sel, period })}
        />
      )}
    </div>
  );
}
