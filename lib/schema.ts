import { z } from "zod";


export const StatusSchema = z.enum(["on_track", "at_risk", "off_track"]);

export const DatasetSchema = z.object({
  meta: z.object({
    currency: z.string(),
    periods: z.array(z.string().regex(/^\d{4}-\d{2}$/)),
    latestPeriod: z.string(),
    generatedAt: z.string(),
  }),
  regions: z.array(z.object({ id: z.string(), name: z.string() })),
  products: z.array(z.object({ id: z.string(), name: z.string() })),
  markets: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      iso3: z.string(),
      iso2: z.string(),
      regionId: z.string(),
      kpis: z.object({
        revenue: z.number(),
        growthPct: z.number(),
        sharePct: z.number(),
        forecastAttainmentPct: z.number(),
        status: StatusSchema,
        anomalies: z.array(z.object({ period: z.string(), type: z.string(), note: z.string() })),
      }),
    }),
  ),
  series: z.array(
    z.object({
      marketId: z.string(),
      productId: z.string(),
      period: z.string(),
      actual: z.number(),
      forecast: z.number(),
      units: z.number(),
      priorYear: z.number(),
    }),
  ),
});

export type Dataset = z.infer<typeof DatasetSchema>;


export const ConfidenceSchema = z.enum(["high", "medium", "low"]);
export const KindSchema = z.enum(["normal", "low_confidence", "abstain", "error"]);

export const CitationSchema = z.object({
  marketId: z.string().optional(),
  regionId: z.string().optional(),
  productId: z.string().optional(),
  period: z.string().optional(),
  label: z.string().optional(),
});

export const StreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("token"), value: z.string() }),
  z.object({
    type: z.literal("done"),
    kind: KindSchema,
    citations: z.array(CitationSchema),
    confidence: ConfidenceSchema,
  }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);

export type Citation = z.infer<typeof CitationSchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
export type Kind = z.infer<typeof KindSchema>;
export type StreamEvent = z.infer<typeof StreamEventSchema>;
export type DoneEvent = Extract<StreamEvent, { type: "done" }>;

export const ChatRequestSchema = z.object({ question: z.string().trim().min(1).max(500) });


const AnswerSchema = z.object({ text: z.string(), citations: z.array(CitationSchema), confidence: ConfidenceSchema });
const FixtureSchema = z.object({
  id: z.string(),
  keywords: z.array(z.string()).optional(),
  kind: KindSchema,
  answer: AnswerSchema,
  error: z.string().optional(),
});
export const FixturesSchema = z.object({ default: FixtureSchema, fixtures: z.array(FixtureSchema) });
export type Fixture = z.infer<typeof FixtureSchema>;


const optionalNumber = (min: number, max: number, label: string) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === undefined || v === "" ? undefined : Number(v)))
    .pipe(
      z
        .number({ invalid_type_error: `${label} must be a number` })
        .min(min, `${label} must be ≥ ${min}`)
        .max(max, `${label} must be ≤ ${max}`)
        .optional(),
    );

export const AlertRuleInputSchema = z
  .object({
    name: z.string().trim().min(3, "Name must be at least 3 characters").max(40, "Name must be at most 40 characters"),
    scope: z.string().min(1),
    severity: z.enum(["warning", "critical"]),
    growthBelow: optionalNumber(-50, 100, "Growth"),
    attainmentBelow: optionalNumber(50, 150, "Attainment"),
  })
  .refine((v) => v.growthBelow !== undefined || v.attainmentBelow !== undefined, {
    message: "Set at least one threshold",
    path: ["growthBelow"],
  });

export type AlertRuleInput = z.output<typeof AlertRuleInputSchema>;
export type AlertRuleFormValues = z.input<typeof AlertRuleInputSchema>;

export const AlertRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  scope: z.string(),
  severity: z.enum(["warning", "critical"]),
  growthBelow: z.number().optional(),
  attainmentBelow: z.number().optional(),
});
export type AlertRule = z.infer<typeof AlertRuleSchema>;
