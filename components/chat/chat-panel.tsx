"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { Index } from "@/lib/domain";
import { ChatIcon } from "../ui/icons";
import { AssistantMessage, UserMessage } from "./chat-message";
import { useChat } from "./use-chat";

const SUGGESTIONS = [
  "Which markets are at risk this quarter, and why?",
  "Why did Germany's revenue dip in March 2026?",
  "Compare APAC and Europe on growth and forecast attainment",
  "What's driving the portfolio's forecast miss?",
  "What will sales be next year?",
  "Give me a full portfolio summary",
  "Force error",
];

interface Props {
  idx: Index;
  onClose: () => void;
  onShow: (entityId: string, period: string) => void;
}

export function ChatPanel({ idx, onClose, onShow }: Props) {
  const { messages, send, retry, stop, isBusy } = useChat();
  const [draft, setDraft] = useState("");
  const log = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  // auto-scroll unless the user scrolled up
  useEffect(() => {
    const el = log.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!draft.trim() || isBusy) return;
    send(draft);
    setDraft("");
    pinned.current = true;
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) submit(); if (e.key === "Enter" && !e.shiftKey) e.preventDefault(); };

  const last = messages[messages.length - 1];
  const statusText = last?.role === "assistant"
    ? last.status === "pending" ? "Assistant is thinking" : last.status === "streaming" ? "Assistant is answering" : last.status === "done" ? "Answer complete" : last.status === "stopped" ? "Generation stopped" : "Answer failed"
    : "";

  return (
    <aside aria-label="Assistant" className="fixed inset-0 z-30 flex flex-col border-l border-line bg-surface lg:static lg:inset-auto lg:h-screen lg:w-[430px] lg:shrink-0">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold"><span className="text-ai"><ChatIcon /></span> Assistant</h2>
        <button className="btn px-2 py-1" onClick={onClose} aria-label="Close assistant">✕</button>
      </header>

      <div
        ref={log}
        role="log"
        aria-label="Conversation"
        className="flex-1 space-y-3 overflow-y-auto p-4"
        onScroll={(e) => { const el = e.currentTarget; pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40; }}
      >
        {messages.length === 0 ? (
          <div>
            <p className="text-sm text-muted">Ask about performance, risk, or forecast. Answers are AI-generated from the dataset, with sources you can check.</p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {SUGGESTIONS.map((s) => <li key={s}><button className="w-full rounded-md border border-line px-3 py-2 text-left text-sm hover:bg-canvas" onClick={() => send(s)}>{s}</button></li>)}
            </ul>
          </div>
        ) : messages.map((m) =>
          m.role === "user"
            ? <UserMessage key={m.id} message={m} />
            : <AssistantMessage key={m.id} idx={idx} message={m} onShow={onShow} onRetry={() => retry(m.id, m.question ?? "")} />,
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite">{statusText}</p>

      <form onSubmit={submit} className="border-t border-line p-3">
        <div className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">Ask a question</label>
          <textarea
            id="chat-input"
            className="input max-h-32 min-h-[2.5rem] resize-none"
            rows={2}
            maxLength={500}
            placeholder="Ask about the portfolio…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
          />
          {isBusy
            ? <button type="button" className="btn" onClick={stop} aria-label="Stop generating">■ Stop</button>
            : <button type="submit" className="btn btn-primary" disabled={!draft.trim()}>Send</button>}
        </div>
      </form>
    </aside>
  );
}
