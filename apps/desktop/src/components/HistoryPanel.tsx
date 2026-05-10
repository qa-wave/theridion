import { useState } from "react";
import { Clock, Trash2 } from "lucide-react";
import { HTTP_METHOD_COLOR } from "../state/types";
import type { Method } from "../state/types";
export interface HistoryEntry {
  id: string;
  method: Method;
  url: string;
  status: number;
  elapsed_ms: number;
  timestamp: number;
}

interface Props {
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
}

export function HistoryPanel({ entries, onSelect, onClear }: Props) {
  const [filter, setFilter] = useState("");
  const q = filter.toLowerCase();
  const filtered = q
    ? entries.filter(
        (e) =>
          e.url.toLowerCase().includes(q) ||
          e.method.toLowerCase().includes(q),
      )
    : entries;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-glass px-3 py-2">
        <Clock className="h-3.5 w-3.5 text-neutral-500" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          History
        </span>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto rounded p-1 text-neutral-600 transition hover:bg-neutral-800 hover:text-rose-400"
            title="Clear history"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      {entries.length > 5 && (
        <div className="px-3 py-1.5">
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter…"
            className="w-full rounded-md border border-glass bg-neutral-900/50 px-2 py-1 text-xs placeholder-neutral-600 focus:border-cobweb-500/40 focus:outline-none"
          />
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-neutral-600">
            {entries.length === 0 ? "No history yet" : "No matches"}
          </p>
        ) : (
          filtered.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => onSelect(entry)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-neutral-800/60"
            >
              <span
                className={`w-9 shrink-0 font-mono text-[10px] font-bold ${
                  HTTP_METHOD_COLOR[entry.method]
                }`}
              >
                {entry.method}
              </span>
              <span className="flex-1 truncate font-mono text-neutral-300">
                {shortenUrl(entry.url)}
              </span>
              <StatusBadge status={entry.status} />
              <span className="shrink-0 text-[10px] text-neutral-600">
                {formatTime(entry.timestamp)}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: number }) {
  const color =
    status >= 500
      ? "text-rose-400"
      : status >= 400
        ? "text-amber-400"
        : status >= 300
          ? "text-sky-400"
          : "text-emerald-400";
  return (
    <span className={`shrink-0 font-mono text-[10px] font-bold ${color}`}>
      {status}
    </span>
  );
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
