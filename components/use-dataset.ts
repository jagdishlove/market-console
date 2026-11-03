"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { buildIndex, type Index } from "@/lib/domain";
import { datasetQuery } from "@/lib/dataset-query";

export function useIndex(): Index {
  const { data } = useQuery(datasetQuery);
  if (!data) throw new Error("Dataset not hydrated");
  return useMemo(() => buildIndex(data), [data]);
}
