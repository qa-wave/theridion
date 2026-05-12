import { useEffect } from "react";
import { Settings2 } from "lucide-react";
import type { HealthResponse } from "../lib/sidecar";
import { applyTheme, loadTheme } from "../state/theme";

interface Props {
  sidecarStatus:
    | { state: "checking" }
    | { state: "ok"; info: HealthResponse }
    | { state: "down"; error: string };
  appVersion: string;
  onOpenSettings: () => void;
  requestCount?: number;
  lastStatus?: number | null;
}

export function StatusBar({ sidecarStatus, appVersion, onOpenSettings, requestCount = 0, lastStatus = null }: Props) {
  const ok = sidecarStatus.state === "ok";
  const checking = sidecarStatus.state === "checking";
  const label = ok
    ? `sidecar v${sidecarStatus.info.version}`
    : checking
    ? "connecting\u2026"
    : "sidecar offline";
  const title = sidecarStatus.state === "down" ? sidecarStatus.error : undefined;

  // Apply saved theme on mount.
  useEffect(() => { applyTheme(loadTheme()); }, []);

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

      {requestCount > 0 && (
        <span className="inline-flex items-center gap-2 text-neutral-500">
          <span className="font-mono">{requestCount} request{requestCount !== 1 ? "s" : ""}</span>
          {lastStatus !== null && (
            <span
              className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                lastStatus >= 500
                  ? "border-rose-700/40 bg-rose-500/10 text-rose-400"
                  : lastStatus >= 400
                    ? "border-amber-700/40 bg-amber-500/10 text-amber-400"
                    : lastStatus >= 300
                      ? "border-cobweb-700/40 bg-cobweb-500/10 text-cobweb-400"
                      : "border-emerald-700/40 bg-emerald-500/10 text-emerald-400"
              }`}
            >
              {lastStatus}
            </span>
          )}
        </span>
      )}

      <span className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSettings}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-neutral-500 transition hover:bg-white/[0.05] hover:text-neutral-300"
          title="Settings (⌘,)"
        >
          <Settings2 className="h-3 w-3" />
        </button>
        <span className="font-mono text-[10px] text-neutral-600">
          Theridion v{appVersion}
        </span>
      </span>
    </footer>
  );
}

function formatUptime(s: number): string {
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}
