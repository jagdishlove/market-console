import { NextResponse } from "next/server";
import raw from "@/data/data.json";
import { DatasetSchema } from "@/lib/schema";

const dataset = DatasetSchema.parse(raw);

export function GET() {
  return NextResponse.json(dataset, {
    headers: { "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
