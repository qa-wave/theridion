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
    <div className="flex items-stretch gap-2.5 border-b border-glass bg-neutral-950/80 px-4 py-3">
      {/* Method + URL input group */}
      <div className="flex flex-1 items-stretch overflow-hidden rounded-lg border border-neutral-800/80 bg-neutral-900/60 shadow-inner-glow transition-all duration-200 focus-within:border-cobweb-500/40 focus-within:shadow-glow-sm">
        <div className="relative">
          <select
            value={method}
            onChange={(e) => onMethodChange(e.target.value as Method)}
            className={`appearance-none border-r border-neutral-800/60 bg-transparent py-2 pl-3.5 pr-8 font-mono text-xs font-bold tracking-wide focus:outline-none ${HTTP_METHOD_COLOR[method]}`}
          >
            {METHODS.map((m) => (
              <option key={m} value={m} className="bg-neutral-900">
                {m}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-600">
            &#x25BE;
          </span>
        </div>
        <input
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="https://api.example.com/v1/resource"
          className="flex-1 bg-transparent px-3 py-2 font-mono text-[13px] text-neutral-100 placeholder-neutral-600 focus:outline-none"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {/* Save button group */}
      <div className="inline-flex items-stretch overflow-hidden rounded-lg border border-neutral-800/60 bg-neutral-900/40 shadow-inner-glow">
        <button
          type="button"
          onClick={onSave}
          disabled={url.length === 0}
          title={dirty ? "Save (⌘S)" : "Saved"}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40 ${
            dirty && url.length > 0
              ? "text-neutral-200"
              : "text-neutral-500"
          }`}
        >
          <Save className="h-3.5 w-3.5" />
          Save
          {dirty && url.length > 0 && (
            <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-cobweb-400 shadow-[0_0_4px_rgba(34,211,238,0.5)]" aria-label="unsaved" />
          )}
        </button>
        <button
          type="button"
          onClick={onSaveAs}
          disabled={url.length === 0}
          title="Save to\u2026 (\u2318\u21E7S)"
          className="border-l border-neutral-800/60 px-1.5 text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Copy as cURL */}
      <button
        type="button"
        onClick={() => {
          onCopyAsCurl();
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        disabled={url.length === 0}
        title="Copy as cURL"
        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-800/60 bg-neutral-900/40 px-3 py-1.5 text-xs text-neutral-400 shadow-inner-glow hover:border-neutral-700 hover:text-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ClipboardCopy className="h-3.5 w-3.5" />
        {copied ? "Copied!" : "cURL"}
      </button>

      {/* Send button — hero action */}
      <button
        type="button"
        onClick={onSend}
        disabled={!canSend}
        className={`inline-flex items-center gap-2 rounded-lg px-5 py-1.5 text-sm font-semibold tracking-wide text-white transition-all duration-200 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500 disabled:shadow-none ${
          canSend
            ? "bg-gradient-to-r from-emerald-600 to-cobweb-600 shadow-glow-emerald hover:from-emerald-500 hover:to-cobweb-500 hover:shadow-glow active:scale-[0.97]"
            : ""
        }`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {busy ? "Sending" : "Send"}
      </button>
    </div>
  );
}
