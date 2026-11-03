import type { Status } from "@/lib/domain";

const META: Record<Status, { label: string; cls: string }> = {
  "on_track": { label: "On track", cls: "text-good" },
  "at_risk": { label: "At risk", cls: "text-warn" },
  "off_track": { label: "Off track", cls: "text-bad" },
};

export function StatusShape({ status, size = 10 }: { status: Status; size?: number }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 10 10" aria-hidden="true" className={META[status].cls} fill="currentColor">
      {status === "on_track" && <circle cx="5" cy="5" r="4.5" />}
      {status === "at_risk" && <path d="M5 0.5 9.5 9.5H0.5z" />}
      {status === "off_track" && <path d="M5 0 10 5 5 10 0 5z" />}
    </svg>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${META[status].cls}`}>
      <StatusShape status={status} />
      {META[status].label}
    </span>
  );
}

export const statusLabel = (s: Status) => META[s].label;
