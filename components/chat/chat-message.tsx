import type { Index } from "@/lib/domain";
import { ConfidenceBadge } from "./confidence";
import { RichText } from "./rich-text";
import { Sources } from "./sources";
import type { ChatMessage } from "./use-chat";

interface Props {
  idx: Index;
  message: ChatMessage;
  onRetry: () => void;
  onShow: (entityId: string, period: string) => void;
}

export function UserMessage({ message }: { message: ChatMessage }) {
  return <div className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-lg bg-ink px-3 py-2 text-sm text-white">{message.text}</div>;
}

export function AssistantMessage({ idx, message: m, onRetry, onShow }: Props) {
  const done = m.done;
  const abstained = done?.kind === "abstain";

  return (
    <article
      aria-label="Assistant answer"
      aria-busy={m.status === "pending" || m.status === "streaming"}
      className={`max-w-full rounded-lg border border-dashed p-3 text-sm ${abstained ? "border-warn bg-warn/5" : "border-ai/50 bg-ai-soft"}`}
    >
      <header className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ai">
        <span aria-hidden="true" className="rounded border border-ai/60 px-1 text-[10px] font-bold leading-4">AI</span> AI-generated
        <span className="font-normal text-muted">· not source data</span>
      </header>

      {abstained && <p className="mb-2 inline-block rounded bg-warn/15 px-2 py-0.5 text-xs font-semibold text-warn">Can’t answer from this data</p>}

      {m.status === "pending" && (
        <div role="status" className="space-y-2" aria-label="Assistant is thinking">
          <div className="h-3 w-3/4 animate-pulse rounded bg-ai/15" /><div className="h-3 w-1/2 animate-pulse rounded bg-ai/15" />
        </div>
      )}

      {m.text && (
        <div className="space-y-2 leading-relaxed">
          <RichText text={m.text} />
          {m.status === "streaming" && <span aria-hidden="true" className="caret ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 bg-ai" />}
        </div>
      )}

      {m.status === "stopped" && <p className="mt-2 text-xs text-muted">Stopped. This partial answer has no sources and is unverified.</p>}

      {m.status === "error" && m.error && (
        <div role="alert" className="mt-2 rounded border border-bad/40 bg-bad/5 p-2 text-xs text-bad">
          <p className="font-medium">{m.error}</p>
          {m.text && <p className="mt-0.5 text-muted">The text above is incomplete and unverified.</p>}
          <button className="btn mt-2 text-ink" onClick={onRetry}>Retry</button>
        </div>
      )}

      {done && (
        <div className="mt-2 border-t border-ai/20 pt-2">
          <ConfidenceBadge confidence={done.confidence} kind={done.kind} />
          <Sources idx={idx} citations={done.citations} onShow={onShow} />
        </div>
      )}
    </article>
  );
}
