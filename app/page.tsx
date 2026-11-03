import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard/dashboard";
import { datasetQuery } from "@/lib/dataset-query";
import { dataset } from "@/lib/server-data";

export default function Page() {
  // dataset is prefetched on the server and hydrated into the client cache
  const client = new QueryClient();
  client.setQueryData(datasetQuery.queryKey, dataset);
  return (
    <HydrationBoundary state={dehydrate(client)}>
      <Suspense fallback={<p className="p-6 text-muted">Loading…</p>}>
        <Dashboard />
      </Suspense>
    </HydrationBoundary>
  );
}
