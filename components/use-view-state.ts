"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { Index } from "@/lib/domain";
import { parseViewState, serializeViewState, type ViewState } from "@/lib/url-state";

export function useViewState(idx: Index) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const state = useMemo(() => parseViewState(new URLSearchParams(params.toString()), idx), [params, idx]);

  const update = useCallback(
    (patch: Partial<ViewState>, how: "push" | "replace" = "push") => {
      const qs = serializeViewState({ ...state, ...patch }, idx);
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (how === "push") router.push(url, { scroll: false });
      else router.replace(url, { scroll: false });
    },
    [state, idx, pathname, router],
  );

  return [state, update] as const;
}
