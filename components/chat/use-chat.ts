"use client";

import { useCallback, useReducer, useRef } from "react";
import { createSseParser } from "@/lib/sse";
import type { DoneEvent, StreamEvent } from "@/lib/schema";

export type MessageStatus = "pending" | "streaming" | "done" | "stopped" | "error";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  status: MessageStatus;
  question?: string;
  done?: DoneEvent;
  error?: string;
}

type Action =
  | { type: "send"; user: ChatMessage; assistant: ChatMessage }
  | { type: "retry"; id: string }
  | { type: "tokens"; id: string; text: string }
  | { type: "done"; id: string; done: DoneEvent }
  | { type: "error"; id: string; error: string }
  | { type: "stop"; id: string };

const patch = (state: ChatMessage[], id: string, f: (m: ChatMessage) => ChatMessage) => state.map((m) => (m.id === id ? f(m) : m));

function reducer(state: ChatMessage[], a: Action): ChatMessage[] {
  switch (a.type) {
    case "send": return [...state, a.user, a.assistant];
    case "retry": return patch(state, a.id, (m) => ({ ...m, text: "", status: "pending", error: undefined, done: undefined }));
    case "tokens": return patch(state, a.id, (m) => ({ ...m, text: m.text + a.text, status: "streaming" }));
    case "done": return patch(state, a.id, (m) => ({ ...m, status: "done", done: a.done }));
    case "error": return patch(state, a.id, (m) => ({ ...m, status: "error", error: a.error }));
    case "stop": return patch(state, a.id, (m) => ({ ...m, status: m.status === "pending" || m.status === "streaming" ? "stopped" : m.status }));
  }
}

let counter = 0;
const nextId = () => `m${++counter}`;

export function useChat() {
  const [messages, dispatch] = useReducer(reducer, []);
  const abort = useRef<AbortController | null>(null);
  const activeId = useRef<string | null>(null);

  const run = useCallback(async (id: string, question: string) => {
    const controller = new AbortController();
    abort.current = controller;
    activeId.current = id;

    // batch tokens: one state update per frame
    let buffered = "";
    let frame = 0;
    let terminal = false;
    const flush = () => { frame = 0; if (buffered) { dispatch({ type: "tokens", id, text: buffered }); buffered = ""; } };

    const handle = (e: StreamEvent) => {
      if (e.type === "token") { buffered += e.value; frame ||= requestAnimationFrame(flush); }
      else { terminal = true; cancelAnimationFrame(frame); flush(); dispatch(e.type === "done" ? { type: "done", id, done: e } : { type: "error", id, error: e.message }); }
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const parser = createSseParser(handle);
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.push(value);
      }
      // stream closed without done/error
      if (!terminal) { cancelAnimationFrame(frame); flush(); }
      if (!terminal) dispatch({ type: "error", id, error: "The response ended unexpectedly." });
    } catch (err) {
      cancelAnimationFrame(frame);
      flush();
      if ((err as Error).name === "AbortError") dispatch({ type: "stop", id });
      else dispatch({ type: "error", id, error: "Couldn't reach the assistant." });
    } finally {
      if (activeId.current === id) { abort.current = null; activeId.current = null; }
    }
  }, []);

  const send = useCallback((question: string) => {
    const q = question.trim();
    if (!q || activeId.current) return;
    const assistantId = nextId();
    dispatch({
      type: "send",
      user: { id: nextId(), role: "user", text: q, status: "done" },
      assistant: { id: assistantId, role: "assistant", text: "", status: "pending", question: q },
    });
    void run(assistantId, q);
  }, [run]);

  const retry = useCallback((id: string, question: string) => {
    if (activeId.current) return;
    dispatch({ type: "retry", id });
    void run(id, question);
  }, [run]);

  const stop = useCallback(() => abort.current?.abort(), []);
  const isBusy = messages.some((m) => m.status === "pending" || m.status === "streaming");
  return { messages, send, retry, stop, isBusy };
}
