"use client";

import { useId, useState, type ReactNode } from "react";

interface Props {
  title: string;
  description: string;
  table: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartFrame({ title, description, table, actions, children, className = "" }: Props) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const id = useId();
  return (
    <section aria-labelledby={`${id}-t`} className={`card flex flex-col ${className}`}>
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h2 id={`${id}-t`} className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-muted">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <div role="group" aria-label={`${title} view`} className="flex overflow-hidden rounded-md border border-line text-xs">
            {(["chart", "table"] as const).map((v) => (
              <button
                key={v}
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`px-2.5 py-1 capitalize ${view === v ? "bg-ink text-white" : "bg-surface hover:bg-canvas"}`}
              >
                {v === "table" ? "Data table" : "Chart"}
              </button>
            ))}
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1 p-3">{view === "chart" ? children : <div className="max-h-[360px] overflow-auto">{table}</div>}</div>
    </section>
  );
}
