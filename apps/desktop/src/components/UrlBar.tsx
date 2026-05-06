import { Loader2, Send } from "lucide-react";
import { HTTP_METHOD_COLOR, METHODS } from "../state/types";
import type { Method } from "../state/types";

interface Props {
  method: Method;
  url: string;
  busy: boolean;
  canSend: boolean;
  onMethodChange: (m: Method) => void;
  onUrlChange: (u: string) => void;
  onSend: () => void;
}

export function UrlBar({
  method,
  url,
  busy,
  canSend,
  onMethodChange,
  onUrlChange,
  onSend,
}: Props) {
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && canSend) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="flex items-stretch gap-2 border-b border-neutral-800 bg-neutral-950 px-4 py-2.5">
      <div className="flex flex-1 items-stretch overflow-hidden rounded-md border border-neutral-800 bg-neutral-900 transition focus-within:border-neutral-600">
        <div className="relative">
          <select
            value={method}
            onChange={(e) => onMethodChange(e.target.value as Method)}
            className={`appearance-none border-r border-neutral-800 bg-transparent py-1.5 pl-3 pr-7 font-mono text-xs font-bold focus:outline-none ${HTTP_METHOD_COLOR[method]}`}
          >
            {METHODS.map((m) => (
              <option key={m} value={m} className="bg-neutral-900">
                {m}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500">▾</span>
        </div>
        <input
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="https://api.example.com/v1/things"
          className="flex-1 bg-transparent px-3 py-1.5 font-mono text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <button
        type="button"
        onClick={onSend}
        disabled={!canSend}
        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Send className="h-3.5 w-3.5" />
        )}
        {busy ? "Sending" : "Send"}
      </button>
    </div>
  );
}
