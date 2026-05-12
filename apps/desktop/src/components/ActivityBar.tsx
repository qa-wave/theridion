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
        return (
          <button
            key={m.id}
            onClick={() => onModeChange(m.id)}
            title={m.label}
            className={`relative flex h-10 w-10 items-center justify-center transition-colors ${
              active
                ? "bg-white/[0.06] border-l-2 border-emerald-500"
                : "border-l-2 border-transparent hover:bg-white/[0.04]"
            }`}
          >
            <Icon size={18} className={active ? "text-neutral-100" : "text-neutral-500"} />
            {m.id === "traffic" && networkEntryCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
                {networkEntryCount > 99 ? "99+" : networkEntryCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
