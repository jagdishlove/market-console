import { AlertRuleInputSchema, type AlertRule } from "@/lib/schema";

export const dynamic = "force-dynamic";

// in-memory, resets on restart
const rules: AlertRule[] = [
  { id: "seed-1", name: "Weak forecast attainment", scope: "portfolio", severity: "warning", attainmentBelow: 97 },
];

export function GET() {
  return Response.json(rules);
}

export async function POST(req: Request) {
  // header sent by the form's "simulate failure" checkbox
  if (req.headers.get("x-simulate-failure") === "1") {
    await new Promise((r) => setTimeout(r, 600));
    return Response.json({ error: "Could not save the rule. Try again." }, { status: 503 });
  }
  const parsed = AlertRuleInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid rule", issues: parsed.error.flatten() }, { status: 422 });
  const rule: AlertRule = { id: crypto.randomUUID(), ...parsed.data };
  rules.push(rule);
  return Response.json(rule, { status: 201 });
}
