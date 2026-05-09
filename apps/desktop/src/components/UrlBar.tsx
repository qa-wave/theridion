import { useState } from "react";
import { ChevronDown, ClipboardCopy, Loader2, Save, Send } from "lucide-react";
import { HTTP_METHOD_COLOR, METHODS } from "../state/types";
import type { Method } from "../state/types";

interface Props {
  method: Method;
  url: string;
  busy: boolean;
  canSend: boolean;
  dirty: boolean;
  onMethodChange: (m: Method) => void;
  onUrlChange: (u: string) => void;
  onSend: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onCopyAsCurl: () => void;
}

export function UrlBar({
  method,
  url,
  busy,
  canSend,
  dirty,
  onMethodChange,
  onUrlChange,
  onSend,
  onSave,
  onSaveAs,
  onCopyAsCurl,
}: Props) {
  const [copied, setCopied] = useState(false);
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
      <div className="inline-flex items-stretch overflow-hidden rounded-md border border-neutral-700 bg-neutral-900 transition hover:border-neutral-600 disabled:cursor-not-allowed">
        <button
          type="button"
          onClick={onSave}
          disabled={url.length === 0}
          title={dirty ? "Save (⌘S)" : "Saved"}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition hover:bg-neutral-800 disabled:cursor-not-allowed ${
            dirty && url.length > 0
              ? "text-neutral-200"
              : "text-neutral-500"
          }`}
        >
          <Save className="h-3.5 w-3.5" />
          Save
          {dirty && url.length > 0 && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-sky-400" aria-label="unsaved" />}
        </button>
        <button
          type="button"
          onClick={onSaveAs}
          disabled={url.length === 0}
          title="Save to… (⌘⇧S)"
          className="border-l border-neutral-800 px-1.5 text-neutral-500 transition hover:bg-neutral-800 hover:text-neutral-200 disabled:cursor-not-allowed"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          onCopyAsCurl();
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        disabled={url.length === 0}
        title="Copy as cURL"
        className="inline-flex items-center gap-1 rounded-md border border-neutral-800 px-2.5 py-1.5 text-xs text-neutral-400 transition hover:border-neutral-600 hover:text-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ClipboardCopy className="h-3.5 w-3.5" />
        {copied ? "Copied!" : "cURL"}
      </button>
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
