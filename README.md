# Market Operations Console

A dashboard over a 12-market, 4-product portfolio, plus a streaming assistant that answers questions about it with checkable sources.

> **Status of this README.** The architecture and decision sections describe what is in the repo. Sections marked **✎ yours** (AI workflow, opinions, "differently") are drafted from what was actually done, but they must be rewritten in your own voice before you submit. The brief asks for your thinking, not a model's.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 36 unit/component tests (Vitest + Testing Library)
npm run test:e2e     # Playwright happy paths (builds and serves on :3100)
npm run typecheck && npm run lint
```

Node 20+. No env vars needed. `CHAT_TOKEN_DELAY_MS` (default 35) slows or speeds the fake stream.

Try in the UI: `?mode=analyst`, open **Assistant**, and use the suggested prompts. They hit the pack's fixtures: normal answers, a low-confidence one (forecast miss), an abstention ("next year"), a long answer ("full portfolio summary"), and an error ("force error").

## The starter pack, and how it is used here

The brief ships four things. This is what each is and where it lives in this repo.

| Pack file | What it is | How this app uses it |
| --- | --- | --- |
| `data.json` → `data/data.json` | Source of truth. `meta` (periods 2024-06…2026-05), 4 `regions`, 5 `products`, 13 `markets` with latest-period `kpis` (revenue, growth %, share %, attainment %, status, anomalies), and `series`: 1,560 rows, one per market × product × month (`actual`, `forecast`, `units`, `priorYear`). | Validated by `DatasetSchema` (`lib/schema.ts`), then indexed by `buildIndex` (`lib/domain.ts`). Region/portfolio totals are sums over `series`, as the pack describes. From the market `kpis` I take `status`, `sharePct` and `anomalies`; everything else is recomputed from `series` so every level and period uses one definition. |
| `fixtures.json` → `data/fixtures.json` | The mock model: a `default` plus fixtures with `keywords`, a `kind` (`normal`, `low_confidence`, `abstain`, `error`), and an answer `{ text, citations, confidence }`. | Parsed by `FixturesSchema`; `lib/fixtures.ts` picks one with the pack's rule (case-insensitive substring, first match wins). |
| `reference/chat-route.ts` → `app/api/chat/route.ts` | ~40-line SSE endpoint that streams a fixture token by token. | Re-implemented with the same behaviour, plus request validation, abort handling and a simulated time-to-first-token. |
| `CONTRACT.md` → `CONTRACT.md` | The wire format: `data: {"type":"token","value"}`, then `{"type":"done","kind","citations","confidence"}`, or `{"type":"error","message"}`. | Typed once as `StreamEventSchema`; the same schema validates events on the client (`lib/sse.ts`) and builds them on the server. |

Things worth knowing about the pack:
- **KPIs are for the latest month only** (`growthPct` equals latest actual vs prior year). So this app's KPI strip is a single month, and the period selector moves it.
- **Share exists per market only** and not per month. Region/portfolio share is the revenue-weighted average of their markets; at product level it is shown as "—" rather than invented.
- **Its precomputed `revenue` and `forecastAttainmentPct` differ slightly from the series** for some markets (growth matches exactly). A test pins the tolerance, and another proves my status rule (`growth < 0` → off track, else attainment < 97% → at risk) reproduces the pack's status for all 13 markets.
- **Citations are pointers** (`marketId` / `regionId` / `productId` / `period` / `label`), not claims with numbers, and the answer text has no inline markers. So I cannot check a number the model "said"; I can check that the pointer resolves, and show the real figures next to it.
- **The error fixture emits one `error` event and no tokens**; I additionally handle a stream that dies after some tokens (keeps the partial text, marks it unverified).
- The pack warns not to build a real backend, so none is built.

## Architecture

```
app/page.tsx (server)        validates dataset → seeds React Query cache → HydrationBoundary
  └─ Dashboard (client)
       ├─ useViewState()     URL ⇄ ViewState (sel, period, mode, kpi, cmp, brush, chat)
       ├─ useIndex()         dataset → buildIndex(): hierarchy, aggregation, KPIs (memoised)
       ├─ charts/*           pure SVG over d3 scales/shapes; each wrapped in ChartFrame (chart ⇄ table)
       ├─ dashboard/*        KPI strip, exec summary, analyst table, alert form
       └─ ChatPanel
            ├─ useChat()     reducer + fetch stream + AbortController
            └─ lib/sse.ts    incremental SSE parser, zod-validated events

app/api/data      GET   dataset (CDN-cacheable)
app/api/chat      POST  SSE stream (pack fixtures)
app/api/alerts    GET/POST  in-memory rules
app/api/telemetry POST  RUM + error sink
```

**One domain model.** Everything is a `Node` (`portfolio`, `eu`, `de`, `de.veltrix`) and `buildIndex` gives `points(id)` and `kpis(id, period)` for any of them. The map, radar, time series, table, KPI strip and the assistant's source cards all call the same functions, so a citation shows exactly what the dashboard shows for that entity and month.

**State split.**

| kind | where | why |
| --- | --- | --- |
| Server data (dataset, alert rules) | TanStack Query | caching, dedupe, optimistic mutations with rollback |
| View state (selection, period, mode, brush, comparison, chat open) | **URL**, parsed by zod | shareable, back/forward works, no second source of truth |
| Ephemeral UI (hover, drag, form fields, chat transcript, draft) | `useState` / `useReducer` / react-hook-form | not worth sharing or persisting |

The dataset is validated on the server and **hydrated** into the client cache, so first paint has data and no spinner. The alert list is fetched on the client.

## Frontend approach and decisions

**Framework: Next.js 15 App Router, React 19, strict TypeScript** (`noUncheckedIndexedAccess`, no `any`). Considered Remix and TanStack Start. Next won on: route handlers for the mock SSE endpoint next to the UI, server-side prefetch + hydration, and a one-click path to Vercel. I would not argue it is better than the alternatives for this app, but it carries the least risk.

**Components and tokens: Tailwind + CSS-variable tokens, no component library.** Tokens (`--ink`, `--accent`, `--ai`, `--good/warn/bad`, …) live in `globals.css` and are mapped in `tailwind.config.ts`; components never use raw colours. I considered shadcn/Radix. For ~10 primitives, hand-written native elements (`<select>`, `<details>`, `<dialog>`-free) gave better accessibility with less code. The cost: no ready-made combobox or popover, so I did not build a command palette.

**Streaming: `fetch` + `ReadableStream` over POST, not `EventSource`.** `EventSource` is GET-only and cannot carry the question/context body. The parser (`lib/sse.ts`) buffers across chunk boundaries and validates each event against the contract, dropping anything malformed. Tokens are batched per animation frame, so a fast stream causes at most one transcript re-render per frame. Stop = `AbortController`; the server also stops on `req.signal`.

**Trust: three separate mechanisms.**
1. *AI vs authoritative.* The AI answer sits in a dashed, violet-tinted card labelled "AI-generated · not source data". The **Source data** block under it is solid-bordered, labelled with the dataset's `generatedAt`, and every figure in it is **read from the dataset**, not from the model's text. Different border, different label, different origin.
2. *Citations are resolved, not trusted.* Each citation pointer is resolved against `data.json` (`lib/citations.ts`) into entity path, month, and that entity's revenue, growth, attainment and status, with "Show on dashboard" to jump there. This puts the claim next to the evidence: the APAC-vs-Europe fixture says Europe is "hovering just below" 100% and the card beside it shows 95.4%, At risk. A pointer that doesn't resolve is flagged in red instead of rendered as if it were evidence (tested against every fixture, and with bad ids).
3. *Confidence is legible and honest.* The pack's high/medium/low is shown as text plus a three-segment meter, never colour alone, with a fixed one-line meaning per level (the pack carries no per-answer reason, and I did not invent any). `abstain` answers get a distinct card and no sources. Stopped and failed answers keep their partial text but are marked unverified, with no sources attached.

The pack gives no per-claim numbers, so I cannot machine-verify a figure inside the prose. That is a limit of the fixtures, and would need a richer contract (claims with values) in a real system.

**Model output is never injected as HTML.** It is split into paragraphs and rendered as React text nodes. A test proves `<img onerror>` is shown as text.

**Data viz: d3 scales/shapes/geo + hand-written SVG, no chart framework.** Considered Recharts, visx, ECharts. The brief needs a choropleth, a radar, a brushable scatter and per-point keyboard/ARIA behaviour, and chart libraries make that last part harder than drawing the SVG. d3 is used for maths only (`d3-scale`, `d3-shape`, `d3-geo`, `d3-scale-chromatic`, `topojson-client`), and the world topology is code-split so it does not weigh on first load. The cost is that I own layout and axes.
- Map: diverging scale for growth/attainment (centred on flat / on-forecast), sequential for revenue/share, status shown as a shape (circle / triangle / diamond) as well as colour.
- Radar: fixed domains per axis (not fitted to data), so a polygon means the same thing as you change selection. Documented in `RADAR_AXES`.
- Time series: actual (solid), forecast (dashed), prior year (dotted), KPI window shaded, anomalies as diamonds.
- Extra chart: growth-vs-share bubble scatter, with a brush.

**Coordinated views and URL state.** `?focus=de&period=2026-03&mode=analyst&map=attainment&compare=de,fr&growth=-5..10&share=5..20&assistant=open`. Drill and period use `push` (back/forward); brush and toggles use `replace` (no history spam). Invalid URL values fall back to defaults instead of crashing (tested). A selection anywhere (map, scatter point, table row, breadcrumb, "Drill into" chip, citation) goes through the same `update({ sel })`. Brushing the scatter narrows the table and dims markets outside the brush. Choosing a period moves the time-series marker and recomputes radar, KPIs, map and table.

**Executive vs analyst** are two compositions of the same components: executive shows KPI strip, top risks, top movers, map and trend; analyst adds radar, scatter, a dense sortable table with flags, and the alert panel opened.

**Forms: react-hook-form + zod.** One schema (`AlertRuleInputSchema`) validates the form and the API. It accepts numeric strings from inputs and numbers from JSON, requires at least one threshold (cross-field refine), and range-checks each. Save is **optimistic** (the rule appears dimmed immediately) and **rolls back** if the server fails; the "Simulate save failure" checkbox exists to demo that. Saved rules feed back into the dashboard as "Alert: …" flags in the risk list and table.

## Accessibility (WCAG 2.1 AA)

Covered: skip link; landmarks; native controls; visible focus ring; every chart has a **Data table** toggle; tooltips on all charts appear on hover and on keyboard focus (they are extra: the same facts are in each element's label and the table); map countries and scatter bubbles are focusable buttons with full labels; the time series is a keyboard group (←/→/Home/End) with an `aria-live` readout; the radar has a table and per-series labels; brush has numeric inputs so it is operable without a pointer; colour is never the only signal (status shapes, dash patterns, text confidence); `aria-sort` on the table; form errors tied by `aria-describedby`; chat log has a polite status region for "thinking / answering / complete" (tokens themselves are not announced, which would be unusable); `prefers-reduced-motion` honoured.

Not done: no automated axe run, no manual screen-reader pass (VoiceOver/NVDA), contrast is by eye against the token palette rather than measured, no high-contrast/dark theme, radar and map keyboard order is simple DOM order rather than a spatial roving grid.

## Testing

- **Unit (domain/data):** my KPIs and status rule against the pack's own market KPIs, hierarchy aggregation consistency, alert evaluation, URL round-trip and bad-input recovery, SSE parsing across split chunks and malformed events, schema validation.
- **Fixtures:** the brief's questions route to the intended fixture, all four kinds exist, every citation in every fixture resolves against `data.json`, abstentions carry no citations.
- **Component/integration:** the chat panel against a mocked streaming `fetch` (stream, confidence + sources, mismatch warning, abstention, error + retry, stop, no-HTML rendering); the alert form (validation, optimistic add, rollback).
- **E2E (Playwright):** drill, back/forward, reload from URL; keyboard map selection; ask → sources → "Show on dashboard" → abstention; save an alert.

Skipped on purpose: pixel/visual regression, chart SVG geometry assertions (brittle, low value), load tests. Not covered: brush drag in E2E (done by hand), cross-browser (Chromium only).

## Productionising

Wired up in this repo:
- **Performance:** server-prefetched data, no client waterfall; first-load JS ≈ 178 kB; map topology code-split; per-frame token batching; memoised index; `Cache-Control` with `stale-while-revalidate` on `/api/data`; system fonts (no font fetch).
- **Observability:** `useReportWebVitals` → `/api/telemetry`; an `error.tsx` route boundary and a per-widget `ErrorBoundary` (one broken chart does not take down the page) both report. The sink only logs; the swap to Sentry/Datadog is one file (`lib/telemetry.ts`).
- **Resilience:** zod validation at every boundary (dataset, stream events, alert API); abort-safe streaming; partial-answer states; retry.
- **CI:** `.github/workflows/ci.yml` runs typecheck, lint, unit/component tests, and Playwright on every PR. Deployment is expected via Vercel's Git integration (preview per PR, production on main).

Would add: real RUM budgets enforced in CI (Lighthouse CI / bundle-size limit), source maps to the error tracker, CSP with nonces, rate limiting and auth on `/api/chat`, a feature flag for the assistant, and an SSE keep-alive/heartbeat for proxies.

## Key technical decisions

1. **Resolve citations against the dataset** and show real figures beside the AI text, since the pack's fixtures cannot be verified numerically.
2. **URL as the single store for view state** instead of a client store (Zustand/Redux). Less code, shareable by construction. The cost is serialising and validating everything, which I do in one file.
3. **One hierarchy abstraction** (`Node` + `Index`) instead of per-level code paths.
4. **Hand-built SVG charts** for accessibility control.
5. **KPIs are one month** (the selected period), matching how the pack's own KPIs are defined. "This quarter" in the fixtures is read as the latest period.

## Engineering standards

Followed: strict TS with no `any`; schemas as the single source of types (`z.infer`); small modules with one job; pure logic separated from components so it is testable without a DOM; tokens over raw colours; native HTML before ARIA; CI gate.

Skipped: Storybook, Prettier/commit hooks (formatter is whatever your editor does; add Prettier + lint-staged), i18n (formatting is `Intl` with a fixed `en-US` locale and USD), feature-folder structure (the app is small enough that `components/<area>` is clearer).

## Known gaps and what I'd do with more time

- **Not done:** heat map (the scatter is the extra chart), live mode, virtualised table (≈50 rows, so not needed at this volume), command palette, Storybook, dark mode, deployed URL, screenshots, video.
- The assistant is not context-aware (stretch goal): the pack's contract sends only the question.
- Currency is shown in USD for every market; the dataset carries only a single `currency`, so there is no per-market currency or FX handling.
- Map is not zoomable and small markets would need an inset.
- Anomalies are the ones recorded in `data.json` (market level only), so none are shown at product level.
- The alert list is in memory on the server and resets on restart.
- I would run axe in CI and do a screen-reader pass first.

## ✎ yours: how I used AI tools

*Rewrite this in your own words. What follows is what happened in this build, so you can be accurate.*

Claude Code scaffolded and wrote the code from the brief. I first built it against a stand-in dataset (the pack wasn't visible to it), then ported it to the real pack, which exposed a few assumptions worth noting: the KPI window, share being per-market, and citations not carrying values. The workflow was: pin the stack and the shared domain model first (schema, hierarchy, URL state), write the pure logic and its tests, then the UI on top, then verify by running type-check, lint, tests, a production build and a real browser pass, fixing what broke (a server/client module boundary bug that failed the build, a form-resolver typing mismatch, a partial-answer loss when a stream ended early). Things worth stating as your own do's and don'ts: have the model write the tests for behaviour you can articulate (citation mismatch, abstention), review the trust-related code by hand, do not let it add libraries you cannot justify, and keep decisions like "URL as store" as your call rather than the model's.
