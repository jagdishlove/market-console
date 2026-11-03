import { StreamEventSchema, type StreamEvent } from "./schema";

// buffer until a blank line; malformed events are dropped
export function createSseParser(onEvent: (e: StreamEvent) => void) {
  let buffer = "";
  const dispatch = (block: string) => {
    const data = block
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).replace(/^ /, ""))
      .join("\n");
    if (!data) return;
    let json: unknown;
    try { json = JSON.parse(data); } catch { return; }
    const event = StreamEventSchema.safeParse(json);
    if (event.success) onEvent(event.data);
  };
  return {
    push(chunk: string) {
      buffer += chunk.replace(/\r\n/g, "\n");
      let i: number;
      while ((i = buffer.indexOf("\n\n")) >= 0) {
        dispatch(buffer.slice(0, i));
        buffer = buffer.slice(i + 2);
      }
    },
  };
}
