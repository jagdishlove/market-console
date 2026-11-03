"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { PORTFOLIO_ID, type Index } from "@/lib/domain";
import { AlertRuleInputSchema, type AlertRuleFormValues, type AlertRuleInput } from "@/lib/schema";
import { useAlertRules, useCreateRule } from "./use-alert-rules";

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-bad">{error}</p>}
    </div>
  );
}

export function AlertPanel({ idx }: { idx: Index }) {
  const [simulateFailure, setSimulateFailure] = useState(false);
  const rules = useAlertRules();
  const create = useCreateRule(simulateFailure);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AlertRuleFormValues, unknown, AlertRuleInput>({
    resolver: zodResolver(AlertRuleInputSchema),
    defaultValues: { name: "", scope: PORTFOLIO_ID, severity: "warning", growthBelow: "", attainmentBelow: "" },
  });

  const aria = (name: keyof AlertRuleFormValues) => ({ "aria-invalid": errors[name] ? true : undefined, "aria-describedby": errors[name] ? `${name}-err` : undefined });
  const onSubmit = (values: AlertRuleInput) => create.mutate(values, { onSuccess: () => reset() });

  return (
    <section className="card p-4" aria-labelledby="alerts-h">
      <h2 id="alerts-h" className="text-sm font-semibold">Alert thresholds</h2>
      <p className="text-xs text-muted">Flag any market whose growth or forecast attainment falls below a threshold.</p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field id="name" label="Rule name" error={errors.name?.message}>
          <input id="name" className="input" {...register("name")} {...aria("name")} />
        </Field>
        <Field id="scope" label="Applies to">
          <select id="scope" className="input chev" {...register("scope")}>
            <option value={PORTFOLIO_ID}>Whole portfolio</option>
            {idx.data.regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field id="severity" label="Severity">
          <select id="severity" className="input chev" {...register("severity")}><option value="warning">Warning</option><option value="critical">Critical</option></select>
        </Field>
        <Field id="growthBelow" label="Growth below (%)" error={errors.growthBelow?.message}>
          <input id="growthBelow" inputMode="decimal" className="input" placeholder="e.g. 0" {...register("growthBelow")} {...aria("growthBelow")} />
        </Field>
        <Field id="attainmentBelow" label="Attainment below (%)" error={errors.attainmentBelow?.message}>
          <input id="attainmentBelow" inputMode="decimal" className="input" placeholder="e.g. 95" {...register("attainmentBelow")} {...aria("attainmentBelow")} />
        </Field>
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={simulateFailure} onChange={(e) => setSimulateFailure(e.target.checked)} /> Simulate save failure (demo rollback)</label>
          <button type="submit" className="btn btn-primary justify-center" disabled={create.isPending}>{create.isPending ? "Saving…" : "Save rule"}</button>
        </div>
      </form>
      <div aria-live="polite" className="mt-2 min-h-5 text-xs">
        {create.isError && <p role="alert" className="text-bad">{create.error.message} The rule was removed from the list.</p>}
        {create.isSuccess && <p className="text-good">Rule saved.</p>}
      </div>
      <h3 className="mt-2 text-xs font-medium text-muted">Active rules</h3>
      {rules.isPending ? <p className="text-xs text-muted">Loading…</p> : rules.isError ? <p role="alert" className="text-xs text-bad">Couldn’t load rules.</p> : rules.data.length === 0 ? <p className="text-xs text-muted">No rules yet.</p> : (
        <ul className="mt-1 divide-y divide-line text-sm">
          {rules.data.map((r) => (
            <li key={r.id} className={`py-1.5 ${r.id.startsWith("optimistic") ? "opacity-60" : ""}`}>
              <span>
                <strong className="font-medium">{r.name}</strong>{" "}
                <span className="text-xs text-muted">
                  {r.severity} · {r.scope === PORTFOLIO_ID ? "portfolio" : idx.node(r.scope).name}
                  {r.growthBelow !== undefined && ` · growth < ${r.growthBelow}%`}
                  {r.attainmentBelow !== undefined && ` · attainment < ${r.attainmentBelow}%`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
