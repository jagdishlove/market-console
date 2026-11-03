"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

interface Tip { x: number; y: number; content: ReactNode }

export function useChartTip() {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  const place = useCallback((clientX: number, clientY: number, content: ReactNode) => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setTip({ x: clientX - r.left, y: clientY - r.top, content });
  }, []);

  const onPointer = (content: ReactNode) => ({
    onPointerMove: (e: React.PointerEvent) => place(e.clientX, e.clientY, content),
    onPointerLeave: () => setTip(null),
  });
  const onFocusTip = (content: ReactNode) => ({
    onFocus: (e: React.FocusEvent<Element>) => {
      const b = e.currentTarget.getBoundingClientRect();
      place(b.left + b.width / 2, b.top, content);
    },
    onBlur: () => setTip(null),
  });

  const width = ref.current?.clientWidth ?? 0;
  const bubble = tip && (
    <div
      role="tooltip"
      style={{ left: Math.min(Math.max(tip.x, 90), Math.max(90, width - 90)), top: tip.y }}
      className="pointer-events-none absolute z-10 -mt-3 w-max max-w-[220px] -translate-x-1/2 -translate-y-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs shadow-lg"
    >
      {tip.content}
    </div>
  );

  return { ref, bubble, onPointer, onFocusTip, hide: () => setTip(null) };
}

export function TipRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export const TipTitle = ({ children }: { children: ReactNode }) => <div className="mb-1 font-semibold">{children}</div>;
