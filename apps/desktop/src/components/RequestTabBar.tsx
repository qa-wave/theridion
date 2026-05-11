import { Braces, Clock, Database, Globe, Plus, Terminal, Wifi, X } from "lucide-react";
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
  onImportCurl: () => void;
  onOpenGraphQL: () => void;
  onOpenWebSocket: () => void;
  onOpenKafka: () => void;
  onToggleHistory: () => void;
  historyOpen: boolean;
  historyCount: number;
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
  onImportCurl,
  onOpenGraphQL,
  onOpenWebSocket,
  onOpenKafka,
  onToggleHistory,
  historyOpen,
  historyCount,
  environments,
  activeEnvId,
  onSelectEnv,
  onManageEnv,
}: Props) {
  return (
    <div className="flex items-stretch gap-px border-b border-glass bg-neutral-925/80 pl-1">
      <div className="flex flex-1 items-stretch gap-0.5 overflow-x-auto py-1 pl-1">
        {tabs.map((t) => {
          const active = t.id === activeId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className={`group relative flex max-w-[240px] items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-all duration-150 ${
                active
                  ? "bg-neutral-800/70 text-neutral-100 shadow-inner-glow"
                  : "text-neutral-500 hover:bg-neutral-800/40 hover:text-neutral-300"
              }`}
            >
              <span
                className={`shrink-0 font-mono text-[10px] font-bold tracking-wide ${HTTP_METHOD_COLOR[t.method]}`}
              >
                {t.method}
              </span>
              <span className="truncate">{t.name}</span>
              {isDirty(t) && (
                <span
                  aria-label="unsaved"
                  className="h-1.5 w-1.5 rounded-full bg-cobweb-400 shadow-[0_0_4px_rgba(34,211,238,0.4)]"
                />
              )}
              <span
                role="button"
                aria-label="Close tab"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(t.id);
                }}
                className="ml-0.5 rounded p-0.5 text-neutral-600 opacity-0 transition hover:bg-neutral-700/60 hover:text-neutral-300 group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </span>
            </button>
          );
        })}
      </div>

      {/* Action buttons — right side */}
      <div className="flex items-center gap-0.5 px-1">
        <BarButton onClick={onNew} title="New request (⌘T)">
          <Plus className="h-3.5 w-3.5" />
        </BarButton>
        <BarButton onClick={onImportCurl} title="Import cURL">
          <Terminal className="h-3.5 w-3.5" />
          <span className="text-[11px]">cURL</span>
        </BarButton>
        <BarButton onClick={onOpenGraphQL} title="GraphQL">
          <Braces className="h-3.5 w-3.5" />
          <span className="text-[11px]">GraphQL</span>
        </BarButton>
        <BarButton onClick={onOpenWebSocket} title="WebSocket">
          <Wifi className="h-3.5 w-3.5" />
          <span className="text-[11px]">WS</span>
        </BarButton>
        <BarButton onClick={onOpenKafka} title="Kafka">
          <Database className="h-3.5 w-3.5" />
          <span className="text-[11px]">Kafka</span>
        </BarButton>
        <BarButton onClick={onOpenSoap} title="SOAP / WSDL">
          <Globe className="h-3.5 w-3.5" />
          <span className="text-[11px]">SOAP</span>
        </BarButton>
        <BarButton
          onClick={onToggleHistory}
          title="Toggle history"
          active={historyOpen}
        >
          <Clock className="h-3.5 w-3.5" />
          <span className="text-[11px]">
            History
            {historyCount > 0 && (
              <span className="ml-1 text-neutral-600">{historyCount}</span>
            )}
          </span>
        </BarButton>
        <div className="ml-1 flex items-center border-l border-neutral-800/40 pl-2 pr-1">
          <EnvDropdown
            environments={environments}
            activeId={activeEnvId}
            onSelect={onSelectEnv}
            onManage={onManageEnv}
          />
        </div>
      </div>
    </div>
  );
}

function BarButton({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 transition-all duration-150 hover:bg-neutral-800/50 ${
        active
          ? "text-cobweb-400"
          : "text-neutral-500 hover:text-neutral-300"
      }`}
    >
      {children}
    </button>
  );
}
