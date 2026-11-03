import { pickFixture } from "@/lib/fixtures";
import { ChatRequestSchema, type StreamEvent } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_DELAY_MS = Number(process.env.CHAT_TOKEN_DELAY_MS ?? 35);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  const parsed = ChatRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  const fixture = pickFixture(parsed.data.question);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: StreamEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      await sleep(350); // fake latency

      if (fixture.kind === "error") {
        send({ type: "error", message: fixture.error ?? "Something went wrong." });
        return controller.close();
      }
      for (const value of fixture.answer.text.match(/\S+\s*/g) ?? []) {
        if (req.signal.aborted) return controller.close();
        send({ type: "token", value });
        await sleep(TOKEN_DELAY_MS);
      }
      send({ type: "done", kind: fixture.kind, citations: fixture.answer.citations, confidence: fixture.answer.confidence });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
