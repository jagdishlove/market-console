import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatPanel } from "@/components/chat/chat-panel";
import { idx, LATEST } from "./helpers";

const enc = new TextEncoder();

function mockStream(parts: string[], { hang = false } = {}) {
  vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => {
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        parts.forEach((p) => c.enqueue(enc.encode(p)));
        if (!hang) c.close();
        init.signal?.addEventListener("abort", () => c.error(new DOMException("aborted", "AbortError")));
      },
    });
    return Promise.resolve(new Response(stream, { headers: { "Content-Type": "text/event-stream" } }));
  }));
}

const setup = () => {
  render(<ChatPanel idx={idx} onClose={() => undefined} onShow={() => undefined} />);
  return userEvent.setup();
};
const ask = async (u: ReturnType<typeof userEvent.setup>, q: string) => {
  await u.type(screen.getByLabelText("Ask a question"), q);
  await u.click(screen.getByRole("button", { name: "Send" }));
};

afterEach(() => vi.unstubAllGlobals());

const sse = (o: unknown) => `data: ${JSON.stringify(o)}\n\n`;
const token = (value: string) => sse({ type: "token", value });
const done = (kind: string, confidence: string, citations: unknown[] = []) => sse({ type: "done", kind, confidence, citations });

describe("ChatPanel", () => {
  it("streams text, then shows confidence and sources read from the dataset", async () => {
    mockStream([token("Germany is "), token("below forecast."), done("normal", "high", [{ marketId: "de", period: LATEST, label: "Germany, latest period" }])]);
    const u = setup();
    await ask(u, "How is Germany?");
    expect(await screen.findByText(/High confidence/)).toBeInTheDocument();
    expect(screen.getByText(/Germany is below forecast/)).toBeInTheDocument();
    const sources = screen.getByRole("region", { name: "Source data" });
    expect(sources).toHaveTextContent("Germany, latest period");
    expect(sources).toHaveTextContent("Europe › Germany");
    expect(sources).toHaveTextContent("Off track");
    expect(screen.getByText(/AI-generated/)).toBeInTheDocument();
  });

  it("flags a citation that points at nothing in the dataset", async () => {
    mockStream([token("Atlantis is booming."), done("normal", "medium", [{ marketId: "xx", period: LATEST, label: "Atlantis" }])]);
    const u = setup();
    await ask(u, "Atlantis?");
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be verified/);
  });

  it("renders an abstention distinctly", async () => {
    mockStream([token("I can't answer that."), done("abstain", "low")]);
    const u = setup();
    await ask(u, "next year?");
    expect(await screen.findByText("Can’t answer from this data")).toBeInTheDocument();
    expect(screen.getByText(/Low confidence/)).toBeInTheDocument();
  });

  it("shows the error event's message and offers retry", async () => {
    mockStream([sse({ type: "error", message: "Simulated upstream failure." })]);
    const u = setup();
    await ask(u, "force error");
    expect(await screen.findByRole("alert")).toHaveTextContent("Simulated upstream failure.");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("keeps partial text when the stream dies mid-answer", async () => {
    mockStream([token("Partial answer ")]);
    const u = setup();
    await ask(u, "Anything");
    expect(await screen.findByRole("alert")).toHaveTextContent(/ended unexpectedly/);
    expect(screen.getByText(/Partial answer/)).toBeInTheDocument();
  });

  it("lets the user stop a generation and marks the partial answer unverified", async () => {
    mockStream([token("Working on ")], { hang: true });
    const u = setup();
    await ask(u, "Long one");
    await u.click(await screen.findByRole("button", { name: "Stop generating" }));
    await waitFor(() => expect(screen.getByText(/Stopped\. This partial answer has no sources/)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("never renders model output as HTML", async () => {
    mockStream([token("<img src=x onerror=alert(1)> done"), done("normal", "low")]);
    const u = setup();
    await ask(u, "xss");
    await screen.findByText(/Low confidence/);
    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByText(/<img src=x/)).toBeInTheDocument();
  });
});
