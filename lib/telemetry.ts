export function report(kind: "web-vital" | "error", payload: Record<string, unknown>) {
  if (typeof navigator === "undefined") return;
  const body = JSON.stringify({ kind, ...payload, url: location.pathname });
  if (!navigator.sendBeacon?.("/api/telemetry", body)) {
    void fetch("/api/telemetry", { method: "POST", body, keepalive: true }).catch(() => undefined);
  }
}
