import { resolveCitation } from "@/lib/citations";
import type { Index } from "@/lib/domain";
import { fmtCurrency, fmtPct, fmtPeriod, fmtSignedPct } from "@/lib/format";
import type { Citation } from "@/lib/schema";
import { StatusBadge } from "../ui/status";

interface Props { idx: Index; citations: Citation[]; onShow: (entityId: string, period: string) => void }

export function Sources({ idx, citations, onShow }: Props) {
  if (!citations.length) return null;
  return (
    <section aria-label="Source data" className="mt-2 rounded-md border-2 border-ink/80 bg-surface">
      <h4 className="flex items-center gap-1.5 border-b border-line bg-canvas px-3 py-1.5 text-xs font-semibold">
        <span aria-hidden="true">▤</span> Source data <span className="font-normal text-muted">· read from data.json ({idx.data.meta.generatedAt})</span>
      </h4>
      <ol className="divide-y divide-line">
        {citations.map((c, i) => {
          const r = resolveCitation(idx, c);
          return (
            <li key={i} className="px-3 py-2 text-xs">
              {r.ok ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold">{i + 1}. {r.label}</span>
                      <div className="text-muted">{r.path.join(" › ")} · {fmtPeriod(r.period)}</div>
                    </div>
                    <button className="btn px-2 py-1 text-xs" onClick={() => onShow(r.entityId, r.period)}>Show on dashboard</button>
                  </div>
                  <dl className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5">
                    <div><dt className="inline text-muted">Revenue </dt><dd className="inline font-medium">{fmtCurrency(r.kpis.revenue)}</dd></div>
                    <div><dt className="inline text-muted">Growth </dt><dd className="inline font-medium">{fmtSignedPct(r.kpis.growth)}</dd></div>
                    <div><dt className="inline text-muted">Attainment </dt><dd className="inline font-medium">{fmtPct(r.kpis.attainment)}</dd></div>
                    <StatusBadge status={r.kpis.status} />
                  </dl>
                </>
              ) : (
                <p role="alert" className="text-bad"><span className="font-semibold">{i + 1}. {r.label}</span>: ⚠ reference could not be verified. {r.reason}.</p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
