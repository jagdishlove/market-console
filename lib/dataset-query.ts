import { DatasetSchema } from "./schema";

export const datasetQuery = {
  queryKey: ["dataset"],
  queryFn: async () => DatasetSchema.parse(await (await fetch("/api/data")).json()),
  staleTime: Infinity,
} as const;
