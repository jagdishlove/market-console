"use client";

import { useEffect } from "react";
import { report } from "@/lib/telemetry";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => report("error", { message: error.message, digest: error.digest }), [error]);
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="mt-2 text-muted">The console hit an unexpected error. Your data is unaffected.</p>
      <button className="btn btn-primary mt-4" onClick={reset}>Try again</button>
    </main>
  );
}
