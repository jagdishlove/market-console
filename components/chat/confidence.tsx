import type { Confidence, Kind } from "@/lib/schema";

const META = {
  high: { label: "High confidence", filled: 3, cls: "text-good", note: "Directly supported by the cited data" },
  medium: { label: "Medium confidence", filled: 2, cls: "text-warn", note: "Partly interpretation; check the sources" },
  low: { label: "Low confidence", filled: 1, cls: "text-bad", note: "Directional only; verify before acting" },
} as const;

export function ConfidenceBadge({ confidence, kind }: { confidence: Confidence; kind: Kind }) {
  const m = META[confidence];
  return (
    <div className="text-xs">
      <span className={`inline-flex items-center gap-1.5 font-medium ${m.cls}`}>
        <span aria-hidden="true" className="inline-flex gap-0.5">
          {[0, 1, 2].map((i) => <span key={i} className={`h-2.5 w-1.5 rounded-sm border border-current ${i < m.filled ? "bg-current" : ""}`} />)}
        </span>
        {m.label}
      </span>
      <span className="text-muted"> · {kind === "abstain" ? "No supporting data" : m.note}</span>
    </div>
  );
}
