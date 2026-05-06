import { CircleDot } from "lucide-react";
import type { HealthResponse } from "../lib/sidecar";

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
  const dotClass = ok
    ? "text-emerald-500"
    : checking
    ? "text-neutral-500"
    : "text-rose-500";
  const label = ok
    ? `sidecar v${sidecarStatus.info.version}`
    : checking
    ? "connecting…"
    : "sidecar offline";
  const title = sidecarStatus.state === "down" ? sidecarStatus.error : undefined;

  return (
    <footer className="flex shrink-0 items-center gap-4 border-t border-neutral-800 bg-neutral-925 px-3 py-1.5 text-[11px] text-neutral-500">
      <span className="inline-flex items-center gap-1.5" title={title}>
        <CircleDot className={`h-3 w-3 ${dotClass}`} />
        <span>{label}</span>
      </span>
      <span className="ml-auto text-neutral-600">Theridion v{appVersion}</span>
    </footer>
  );
}
