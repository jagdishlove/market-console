import raw from "@/data/data.json";
import { buildIndex } from "@/lib/domain";
import { DatasetSchema } from "@/lib/schema";

export const idx = buildIndex(DatasetSchema.parse(raw));
export const LATEST = idx.data.meta.latestPeriod;
