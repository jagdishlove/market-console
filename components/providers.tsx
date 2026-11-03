"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useReportWebVitals } from "next/web-vitals";
import { useState, type ReactNode } from "react";
import { report } from "@/lib/telemetry";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }));
  useReportWebVitals((m) => report("web-vital", { name: m.name, value: m.value, rating: m.rating }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
