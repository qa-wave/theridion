import { useEffect, useRef, useState } from "react";
import { ChevronDown, Layers, Settings2 } from "lucide-react";
import type { EnvironmentSummary } from "../lib/sidecar";

interface Props {
  environments: EnvironmentSummary[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onManage: () => void;
}

/** Chip-style env selector, designed to live on the right of the tab bar. */
export function EnvDropdown({ environments, activeId, onSelect, onManage }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = environments.find((e) => e.id === activeId) ?? null;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(
      () => window.addEventListener("mousedown", onClick),
      0,
    );
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
      window.clearTimeout(t);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] transition ${
          active
            ? "border-emerald-700/60 bg-emerald-950/40 text-emerald-300 hover:border-emerald-700"
            : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
        }`}
        title={active ? `Active environment: ${active.name}` : "No environment"}
      >
        <Layers className="h-3 w-3" />
        <span className="max-w-[110px] truncate">
          {active ? active.name : "No env"}
        </span>
        <ChevronDown className="h-3 w-3 opacity-70" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-56 rounded-lg border border-neutral-700 bg-neutral-925 shadow-xl shadow-black/40"
        >
          <div className="border-b border-neutral-800 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            Environment
          </div>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setOpen(false);
            }}
            className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition ${
              activeId === null
                ? "bg-neutral-800/60 text-neutral-100"
                : "text-neutral-300 hover:bg-neutral-800/60"
            }`}
          >
            <span>None</span>
            {activeId === null && <span className="text-emerald-400">●</span>}
          </button>
          {environments.length > 0 && (
            <div className="max-h-56 overflow-y-auto border-t border-neutral-800/60">
              {environments.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    onSelect(e.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition ${
                    activeId === e.id
                      ? "bg-emerald-950/40 text-emerald-200"
                      : "text-neutral-300 hover:bg-neutral-800/60"
                  }`}
                >
                  <span className="truncate">{e.name}</span>
                  <span className="ml-2 shrink-0 text-[10px] text-neutral-500">
                    {e.variable_count} vars
                  </span>
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              onManage();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 border-t border-neutral-800 px-3 py-2 text-left text-xs text-neutral-300 transition hover:bg-neutral-800/60"
          >
            <Settings2 className="h-3 w-3" />
            Manage environments…
          </button>
        </div>
      )}
    </div>
  );
}
