import type { Metric } from "./domain";

const LOCALE = "en-US";

const usd = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const pct = new Intl.NumberFormat(LOCALE, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
const signedPct = new Intl.NumberFormat(LOCALE, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" });
const monthYear = new Intl.DateTimeFormat(LOCALE, { month: "short", year: "numeric", timeZone: "UTC" });
const monthLong = new Intl.DateTimeFormat(LOCALE, { month: "long", timeZone: "UTC" });
const monthOnly = new Intl.DateTimeFormat(LOCALE, { month: "short", timeZone: "UTC" });

const toDate = (period: string) => new Date(`${period}-01T00:00:00Z`);

export const fmtCurrency = (n: number) => usd.format(n);
export const fmtPct = (n: number | null) => (n === null ? "—" : pct.format(n));
export const fmtSignedPct = (n: number) => signedPct.format(n);
export const fmtPeriod = (p: string) => monthYear.format(toDate(p));
export const fmtMonthName = (p: string) => monthLong.format(toDate(p));
export const fmtMonth = (p: string) => monthOnly.format(toDate(p));
export const fmtSignedCurrency = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${usd.format(Math.abs(n))}`;

export const METRIC_LABEL: Record<Metric, string> = {
  revenue: "Revenue",
  growth: "Growth vs PY",
  attainment: "Forecast attainment",
  share: "Market share",
  forecastGap: "Forecast gap",
};

export function fmtMetric(metric: Metric, v: number | null): string {
  if (v === null) return "—";
  switch (metric) {
    case "revenue": return fmtCurrency(v);
    case "forecastGap": return fmtSignedCurrency(v);
    case "growth": return fmtSignedPct(v);
    case "attainment":
    case "share": return fmtPct(v);
  }
}
