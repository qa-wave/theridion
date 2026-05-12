import { Activity, BookOpen, Braces, Clock, Command, Database, Globe, MoreHorizontal, Plus, Server, Terminal, Wifi, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
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
  onOpenGrpc: () => void;
  onOpenMock: () => void;
  onOpenLoadTest: () => void;
  onOpenSwagger: () => void;
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
  onOpenGrpc,
  onOpenMock,
  onOpenLoadTest,
  onOpenSwagger,
  onToggleHistory,
  historyOpen,
  historyCount,
  environments,
  activeEnvId,
  onSelectEnv,
  onManageEnv,
}: Props) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  // Close overflow menu on outside click.
  useEffect(() => {
    if (!overflowOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [overflowOpen]);

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

      {/* Action buttons -- right side */}
      <div className="flex items-center gap-0.5 px-1">
        <BarButton onClick={onNew} title="New request (Cmd+T)">
          <Plus className="h-3.5 w-3.5" />
        </BarButton>

        {/* Command palette hint */}
        <BarButton onClick={() => { /* Cmd+K is handled globally */ const e = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }); window.dispatchEvent(e); }} title="Command palette (Cmd+K)">
          <Command className="h-3.5 w-3.5" />
          <span className="text-[11px]">Cmd+K</span>
        </BarButton>

        {/* Overflow menu for protocol/tool buttons */}
        <div className="relative" ref={overflowRef}>
          <BarButton onClick={() => setOverflowOpen((o) => !o)} title="More tools" active={overflowOpen}>
            <MoreHorizontal className="h-3.5 w-3.5" />
            <span className="text-[11px]">More</span>
          </BarButton>
          {overflowOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-neutral-800 bg-neutral-900 py-1 shadow-xl">
              <OverflowItem icon={<Terminal className="h-3.5 w-3.5" />} label="cURL import" onClick={() => { onImportCurl(); setOverflowOpen(false); }} />
              <OverflowItem icon={<BookOpen className="h-3.5 w-3.5" />} label="Swagger / OpenAPI" onClick={() => { onOpenSwagger(); setOverflowOpen(false); }} />
              <OverflowItem icon={<Braces className="h-3.5 w-3.5" />} label="GraphQL" onClick={() => { onOpenGraphQL(); setOverflowOpen(false); }} />
              <OverflowItem icon={<Wifi className="h-3.5 w-3.5" />} label="WebSocket" onClick={() => { onOpenWebSocket(); setOverflowOpen(false); }} />
              <OverflowItem icon={<Database className="h-3.5 w-3.5" />} label="Kafka" onClick={() => { onOpenKafka(); setOverflowOpen(false); }} />
              <OverflowItem icon={<Server className="h-3.5 w-3.5" />} label="gRPC" onClick={() => { onOpenGrpc(); setOverflowOpen(false); }} />
              <OverflowItem icon={<Server className="h-3.5 w-3.5" />} label="Mock Server" onClick={() => { onOpenMock(); setOverflowOpen(false); }} />
              <OverflowItem icon={<Activity className="h-3.5 w-3.5" />} label="Load Test" onClick={() => { onOpenLoadTest(); setOverflowOpen(false); }} />
              <OverflowItem icon={<Globe className="h-3.5 w-3.5" />} label="SOAP / WSDL" onClick={() => { onOpenSoap(); setOverflowOpen(false); }} />
            </div>
          )}
        </div>

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

function OverflowItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs text-neutral-400 transition hover:bg-neutral-800/60 hover:text-neutral-200"
    >
      {icon}
      <span>{label}</span>
    </button>
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
