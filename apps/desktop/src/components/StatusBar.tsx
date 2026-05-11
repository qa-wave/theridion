import { useEffect, useRef, useState } from "react";
import { Palette } from "lucide-react";
import type { HealthResponse } from "../lib/sidecar";
import { THEMES, applyTheme, loadTheme, type ThemeId } from "../state/theme";

interface Props {
  sidecarStatus:
    | { state: "checking" }
    | { state: "ok"; info: HealthResponse }
    | { state: "down"; error: string };
  appVersion: string;
}

export function StatusBar({ sidecarStatus, appVersion }: Props) {
  const ok = sidecarStatus.state === "ok";
  const checking = sidecarStatus.state === "checking";
  const label = ok
    ? `sidecar v${sidecarStatus.info.version}`
    : checking
    ? "connecting\u2026"
    : "sidecar offline";
  const title = sidecarStatus.state === "down" ? sidecarStatus.error : undefined;

  return (
    <footer className="glass relative flex shrink-0 items-center gap-4 border-t border-glass px-4 py-1.5 text-[11px] tracking-wide">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cobweb-500/20 to-transparent" />
      <span className="inline-flex items-center gap-2" title={title}>
        <span className="relative flex h-2 w-2">
          {ok && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
          )}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              ok
                ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                : checking
                  ? "animate-pulse bg-neutral-500"
                  : "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]"
            }`}
          />
        </span>
        <span className={ok ? "text-neutral-400" : "text-neutral-500"}>{label}</span>
        {ok && (
          <span className="text-neutral-600">
            &middot; uptime {formatUptime(sidecarStatus.info.uptime_seconds)}
          </span>
        )}
      </span>

      <span className="ml-auto flex items-center gap-3">
        <ThemePicker />
        <span className="font-mono text-[10px] text-neutral-600">
          Theridion v{appVersion}
        </span>
      </span>
    </footer>
  );
}

function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<ThemeId>(loadTheme);
  const ref = useRef<HTMLDivElement>(null);

  // Apply theme on mount.
  useEffect(() => { applyTheme(current); }, []);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(id: ThemeId) {
    setCurrent(id);
    applyTheme(id);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-neutral-500 transition hover:bg-white/[0.05] hover:text-neutral-300"
        title="Theme"
      >
        <Palette className="h-3 w-3" />
      </button>
      {open && (
        <div className="glass absolute bottom-full right-0 z-50 mb-1.5 w-48 animate-fade-in rounded-lg border border-glass-light shadow-xl shadow-black/50">
          <div className="border-b border-glass px-3 py-1.5 text-[9px] font-semibold uppercase tracking-widest text-neutral-600">
            Color
          </div>
          <div className="p-1">
            {THEMES.filter((t) => t.group === "color").map((t) => (
              <ThemeRow key={t.id} theme={t} current={current} onPick={pick} />
            ))}
          </div>
          <div className="border-t border-glass px-3 py-1.5 text-[9px] font-semibold uppercase tracking-widest text-neutral-600">
            Style
          </div>
          <div className="p-1">
            {THEMES.filter((t) => t.group === "style").map((t) => (
              <ThemeRow key={t.id} theme={t} current={current} onPick={pick} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ThemeRow({
  theme: t,
  current,
  onPick,
}: {
  theme: import("../state/theme").ThemeDef;
  current: ThemeId;
  onPick: (id: ThemeId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(t.id)}
      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[11px] transition ${
        current === t.id
          ? "bg-white/[0.06] text-neutral-100"
          : "text-neutral-400 hover:bg-white/[0.03] hover:text-neutral-200"
      }`}
    >
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${t.dot} shrink-0`} />
      <span className="truncate">{t.label}</span>
      {current === t.id && (
        <span className="ml-auto shrink-0 text-cobweb-400">&#x2713;</span>
      )}
    </button>
  );
}

function formatUptime(s: number): string {
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}
