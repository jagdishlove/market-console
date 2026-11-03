import { describe, expect, it } from "vitest";
import { createSseParser } from "@/lib/sse";
import type { StreamEvent } from "@/lib/schema";

const run = (chunks: string[]) => {
  const out: StreamEvent[] = [];
  const p = createSseParser((e) => out.push(e));
  chunks.forEach((c) => p.push(c));
  return out;
};
const ev = (o: unknown) => `data: ${JSON.stringify(o)}\n\n`;

describe("SSE parser (starter-pack contract)", () => {
  it("parses token, done and error events", () => {
    const events = run([
      ev({ type: "token", value: "Hi " }),
      ev({ type: "done", kind: "normal", citations: [{ marketId: "de" }], confidence: "high" }),
      ev({ type: "error", message: "boom" }),
    ]);
    expect(events.map((e) => e.type)).toEqual(["token", "done", "error"]);
  });

  it("reassembles events split across chunk boundaries", () => {
    expect(run(['data: {"type":"tok', 'en","value":"a"}\n', "\n"])).toEqual([{ type: "token", value: "a" }]);
  });

  it("concatenating token values reconstructs the text exactly", () => {
    const text = run(["Three ", "markets "].map((value) => ev({ type: "token", value }))).map((e) => (e.type === "token" ? e.value : "")).join("");
    expect(text).toBe("Three markets ");
  });

  it("drops malformed or contract-violating events instead of throwing", () => {
    expect(run(["data: {nope\n\n", ev({ type: "token" }), ev({ type: "done", kind: "weird", citations: [], confidence: "high" }), ev({ type: "ping" })])).toEqual([]);
  });
});
