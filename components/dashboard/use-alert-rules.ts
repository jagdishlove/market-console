"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { AlertRuleSchema, type AlertRule, type AlertRuleInput } from "@/lib/schema";

const KEY = ["alert-rules"] as const;

async function request(init?: RequestInit) {
  const res = await fetch("/api/alerts", init);
  if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Request failed");
  return res;
}

export function useAlertRules() {
  return useQuery({ queryKey: KEY, queryFn: async () => z.array(AlertRuleSchema).parse(await (await request()).json()) });
}

export function useCreateRule(simulateFailure: boolean) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AlertRuleInput) =>
      AlertRuleSchema.parse(
        await (await request({ method: "POST", headers: { "Content-Type": "application/json", ...(simulateFailure ? { "x-simulate-failure": "1" } : {}) }, body: JSON.stringify(input) })).json(),
      ),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData<AlertRule[]>(KEY) ?? [];
      qc.setQueryData<AlertRule[]>(KEY, [...previous, { id: `optimistic-${Date.now()}`, ...input }]);
      return { previous };
    },
    onError: (_e, _i, ctx) => { if (ctx) qc.setQueryData(KEY, ctx.previous); },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
