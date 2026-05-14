import { Activity, GitBranch, Radio, Zap } from "lucide-react";

export type AppMode = "requests" | "flows" | "traffic" | "monitors";

interface Props {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  networkEntryCount?: number;
}

const modes: { id: AppMode; icon: typeof Zap; label: string }[] = [
  { id: "requests", icon: Zap, label: "Requests" },
  { id: "flows", icon: GitBranch, label: "Flows" },
  { id: "traffic", icon: Radio, label: "Traffic" },
  { id: "monitors", icon: Activity, label: "Monitors" },
];

export function ActivityBar({ mode, onModeChange, networkEntryCount = 0 }: Props) {
  return (
    <div className="flex h-full w-10 flex-col items-center border-r border-white/[0.06] bg-neutral-950 py-2 gap-1">
      {modes.map((m) => {
        const active = mode === m.id;
        const Icon = m.icon;
        const hasContent = m.id === "traffic" && networkEntryCount > 0;
        return (
          <button
            key={m.id}
            onClick={() => onModeChange(m.id)}
            className={`group relative flex h-10 w-10 items-center justify-center transition-colors ${
              active
                ? "bg-white/[0.06] border-l-2 border-emerald-500"
                : "border-l-2 border-transparent hover:bg-white/[0.04]"
            }`}
          >
            {/* Subtle glow behind icon on hover */}
            <span className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-[radial-gradient(circle,rgb(var(--accent-500)/0.12)_0%,transparent_70%)]" />
            <Icon size={18} className={`relative z-10 ${active ? "text-neutral-100" : "text-neutral-500"}`} />
            {/* Content dot indicator */}
            {hasContent && !active && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            )}
            {/* Badge for traffic count */}
            {m.id === "traffic" && networkEntryCount > 0 && active && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
                {networkEntryCount > 99 ? "99+" : networkEntryCount}
              </span>
            )}
            {/* Styled tooltip on hover */}
            <span className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded-md bg-neutral-800 px-2.5 py-1.5 text-xs font-medium text-neutral-100 shadow-lg group-hover:block z-50">
              {m.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
