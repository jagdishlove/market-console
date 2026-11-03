import raw from "@/data/data.json";
import { DatasetSchema } from "./schema";

export const dataset = DatasetSchema.parse(raw);
