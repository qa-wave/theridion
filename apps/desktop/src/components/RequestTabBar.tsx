import { Globe, Plus, X } from "lucide-react";
import { HTTP_METHOD_COLOR, isDirty } from "../state/types";
import type { RequestTab } from "../state/types";
import type { EnvironmentSummary } from "../lib/sidecar";
import { EnvDropdown } from "./EnvDropdown";

interface Props {
  tabs: RequestTab[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
  onOpenSoap: () => void;
  environments: EnvironmentSummary[];
  activeEnvId: string | null;
  onSelectEnv: (id: string | null) => void;
  onManageEnv: () => void;
}

export function RequestTabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
  onNew,
  onOpenSoap,
  environments,
  activeEnvId,
  onSelectEnv,
  onManageEnv,
}: Props) {
  return (
    <div className="flex items-stretch gap-px border-b border-neutral-800 bg-neutral-925 pl-2">
      <div className="flex flex-1 items-stretch gap-px overflow-x-auto">
        {tabs.map((t) => {
          const active = t.id === activeId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className={`group relative flex max-w-[260px] items-center gap-2 px-3 py-2 text-xs transition ${
                active
                  ? "bg-neutral-900 text-neutral-100"
                  : "text-neutral-400 hover:bg-neutral-900/50 hover:text-neutral-200"
              }`}
            >
              <span
                className={`shrink-0 font-mono text-[10px] font-bold ${HTTP_METHOD_COLOR[t.method]}`}
              >
                {t.method}
              </span>
              <span className="truncate">{t.name}</span>
              {isDirty(t) && (
                <span
                  aria-label="unsaved"
                  className="h-1.5 w-1.5 rounded-full bg-sky-400"
                />
              )}
              <span
                role="button"
                aria-label="Close tab"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(t.id);
                }}
                className="ml-1 rounded p-0.5 text-neutral-500 opacity-0 transition hover:bg-neutral-800 hover:text-neutral-200 group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </span>
              {active && (
                <span className="absolute inset-x-0 bottom-0 h-px bg-emerald-500" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onNew}
        className="px-3 text-neutral-500 transition hover:bg-neutral-900/50 hover:text-neutral-100"
        title="New request"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onOpenSoap}
        title="SOAP / WSDL"
        className="inline-flex items-center gap-1 px-2 text-[11px] text-neutral-500 transition hover:bg-neutral-900/50 hover:text-neutral-100"
      >
        <Globe className="h-3.5 w-3.5" />
        SOAP
      </button>
      <div className="flex items-center pr-2">
        <EnvDropdown
          environments={environments}
          activeId={activeEnvId}
          onSelect={onSelectEnv}
          onManage={onManageEnv}
        />
      </div>
    </div>
  );
}
