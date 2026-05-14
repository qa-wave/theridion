import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, ClipboardCopy, Loader2, Save, Send } from "lucide-react";
import { HTTP_METHOD_COLOR, METHODS } from "../state/types";
import type { Method } from "../state/types";
import { sidecar } from "../lib/sidecar";

/** Built-in template functions available in {{...}} expressions. */
const BUILTIN_VARS: { name: string; label: string }[] = [
  { name: "$timestamp", label: "Unix timestamp" },
  { name: "$uuid", label: "UUID v4" },
  { name: "$isoDate", label: "ISO 8601 date" },
  { name: "$randomInt", label: "Random integer" },
];

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
  activeEnvId?: string | null;
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
  activeEnvId,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [autocompleteItems, setAutocompleteItems] = useState<{ name: string; label: string }[]>([]);
  const [autocompleteIdx, setAutocompleteIdx] = useState(0);
  const [varPrefix, setVarPrefix] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [envVars, setEnvVars] = useState<{ name: string; value: string }[]>([]);
  const [globalVars, setGlobalVars] = useState<{ name: string; value: string }[]>([]);

  // Load env and global variables on mount and when env changes.
  useEffect(() => {
    sidecar.getGlobals().then((r) => setGlobalVars(r.variables.filter(v => v.enabled).map(v => ({ name: v.name, value: v.value })))).catch(() => {});
    if (activeEnvId) {
      sidecar.getEnvironment(activeEnvId).then((env) => setEnvVars(env.variables.filter(v => v.enabled).map(v => ({ name: v.name, value: v.value })))).catch(() => {});
    } else {
      setEnvVars([]);
    }
  }, [activeEnvId]);

  const allVars = useCallback(() => {
    const items: { name: string; label: string }[] = [];
    for (const g of globalVars) items.push({ name: g.name, label: `global: ${g.value}` });
    for (const e of envVars) items.push({ name: e.name, label: `env: ${e.value}` });
    for (const b of BUILTIN_VARS) items.push(b);
    return items;
  }, [globalVars, envVars]);

  function checkAutocomplete(value: string, cursorPos: number) {
    // Check if cursor is after "{{" and before "}}"
    const before = value.slice(0, cursorPos);
    const lastOpen = before.lastIndexOf("{{");
    if (lastOpen === -1) { setAutocompleteOpen(false); return; }
    const afterOpen = before.slice(lastOpen + 2);
    if (afterOpen.includes("}}")) { setAutocompleteOpen(false); return; }
    // We have an open {{ without closing }}
    const prefix = afterOpen.toLowerCase();
    setVarPrefix(afterOpen);
    const items = allVars().filter(v => v.name.toLowerCase().includes(prefix));
    if (items.length > 0) {
      setAutocompleteItems(items);
      setAutocompleteIdx(0);
      setAutocompleteOpen(true);
    } else {
      setAutocompleteOpen(false);
    }
  }

  function insertAutocomplete(varName: string) {
    const el = inputRef.current;
    if (!el) return;
    const cursorPos = el.selectionStart ?? url.length;
    const before = url.slice(0, cursorPos);
    const lastOpen = before.lastIndexOf("{{");
    if (lastOpen === -1) return;
    const after = url.slice(cursorPos);
    const closeIdx = after.indexOf("}}");
    const newUrl = url.slice(0, lastOpen) + "{{" + varName + "}}" + (closeIdx >= 0 ? after.slice(closeIdx + 2) : after);
    onUrlChange(newUrl);
    setAutocompleteOpen(false);
    // Restore focus
    setTimeout(() => { el.focus(); el.setSelectionRange(lastOpen + varName.length + 4, lastOpen + varName.length + 4); }, 0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (autocompleteOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAutocompleteIdx((i) => Math.min(i + 1, autocompleteItems.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setAutocompleteIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (autocompleteItems[autocompleteIdx]) {
          insertAutocomplete(autocompleteItems[autocompleteIdx].name);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setAutocompleteOpen(false);
        return;
      }
    }
    if (e.key === "Enter" && canSend) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="flex items-stretch gap-2.5 border-b border-glass bg-neutral-950/80 px-4 py-3">
      {/* Method + URL input group */}
      <div className="flex flex-1 items-stretch overflow-hidden rounded-xl border border-neutral-800/80 bg-neutral-900/60 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-200 focus-within:border-cobweb-500/40 focus-within:shadow-glow-sm">
        <div className="relative">
          <select
            value={method}
            onChange={(e) => onMethodChange(e.target.value as Method)}
            className={`appearance-none bg-transparent py-2.5 pl-3.5 pr-8 font-mono text-xs font-bold tracking-wide focus:outline-none ${HTTP_METHOD_COLOR[method]}`}
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
        <div className="my-1.5 w-px bg-neutral-700/40" />
        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={url}
            onChange={(e) => {
              onUrlChange(e.target.value);
              checkAutocomplete(e.target.value, e.target.selectionStart ?? e.target.value.length);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => setTimeout(() => setAutocompleteOpen(false), 200)}
            placeholder="https://api.example.com/v1/resource"
            className={`w-full bg-transparent px-3 py-2.5 font-mono text-[13px] placeholder-neutral-600 focus:outline-none ${url.includes("{{") ? "text-transparent caret-neutral-100" : "text-neutral-100"}`}
            autoComplete="off"
            spellCheck={false}
            style={url.includes("{{") ? { caretColor: "rgb(245 245 245)" } : undefined}
          />
          {url.includes("{{") && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center px-3 font-mono text-[13px]"
            >
              <span className="truncate">
                {url.split(/(\{\{[^}]*\}\})/).map((part, i) =>
                  /^\{\{[^}]*\}\}$/.test(part) ? (
                    <span key={i} className="rounded-sm bg-cobweb-500/15 px-0.5 text-cobweb-400">{part}</span>
                  ) : (
                    <span key={i} className="text-neutral-100">{part}</span>
                  ),
                )}
              </span>
            </div>
          )}
          {/* Template variable autocomplete dropdown */}
          {autocompleteOpen && autocompleteItems.length > 0 && (
            <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-md border border-neutral-700 bg-neutral-900 py-1 shadow-xl">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Variables {varPrefix && <span className="normal-case text-neutral-600">matching &ldquo;{varPrefix}&rdquo;</span>}
              </p>
              {autocompleteItems.slice(0, 10).map((item, i) => (
                <button
                  key={item.name}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); insertAutocomplete(item.name); }}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition ${
                    i === autocompleteIdx ? "bg-cobweb-600/20 text-cobweb-300" : "text-neutral-300 hover:bg-neutral-800"
                  }`}
                >
                  <span className="font-mono">{`{{${item.name}}}`}</span>
                  <span className="ml-2 truncate text-[10px] text-neutral-500">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
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
        className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold tracking-wide text-white transition-all duration-200 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500 disabled:shadow-none ${
          canSend
            ? "bg-accent-gradient shadow-glow-emerald hover:shadow-glow hover:scale-[1.03] active:scale-[0.97]"
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
