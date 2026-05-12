import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Plus,
  Upload,
  Globe,
  Radio,
  Zap,
  Settings,
  FileCode,
  Beaker,
  Search,
  Key,
  Database,
  Clock,
  Shield,
  Layers,
  Lock,
  GitCompare,
  GitBranch,
} from "lucide-react";
import type { StoredCollection, CollectionItem } from "../lib/sidecar";
import { HTTP_METHOD_COLOR, type Method } from "../state/types";

export interface CommandAction {
  id: string;
  label: string;
  shortcut?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  actions: CommandAction[];
}

export function CommandPalette({ open, onClose, actions }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = useMemo(() => {
    if (!query.trim()) return actions;
    const q = query.toLowerCase();
    return actions.filter((a) => a.label.toLowerCase().includes(q));
  }, [actions, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      // Focus after the modal renders.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        filtered[selectedIndex].onSelect();
        onClose();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [filtered, selectedIndex, onClose],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg rounded-lg border border-neutral-700 bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-neutral-700 px-4 py-3">
          <Search size={16} className="text-neutral-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-sm text-neutral-100 outline-none placeholder:text-neutral-500"
          />
          <kbd className="rounded border border-neutral-600 px-1.5 py-0.5 text-[10px] text-neutral-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-neutral-500">
              No matching commands
            </div>
          ) : (
            filtered.map((action, idx) => (
              <button
                key={action.id}
                className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm ${
                  idx === selectedIndex
                    ? "bg-emerald-600/20 text-emerald-400"
                    : "text-neutral-300 hover:bg-neutral-800"
                }`}
                onClick={() => {
                  action.onSelect();
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                {action.icon && (
                  <span className="flex-shrink-0 text-neutral-400">
                    {action.icon}
                  </span>
                )}
                <span className="flex-1">{action.label}</span>
                {action.shortcut && (
                  <kbd className="rounded border border-neutral-600 px-1.5 py-0.5 text-[10px] text-neutral-500">
                    {action.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/** Flatten all collection items into a list of request actions. */
function flattenCollectionRequests(
  collections: StoredCollection[],
  onOpen: (collectionId: string, item: CollectionItem) => void,
): CommandAction[] {
  const results: CommandAction[] = [];
  function walk(collectionId: string, collectionName: string, items: CollectionItem[]) {
    for (const item of items) {
      if (item.is_folder) {
        if (item.items) walk(collectionId, collectionName, item.items);
      } else {
        const method = (item.method ?? "GET") as Method;
        results.push({
          id: `req-${collectionId}-${item.id}`,
          label: `${method} ${item.name}`,
          shortcut: collectionName,
          icon: (
            <span className={`text-[11px] font-bold ${HTTP_METHOD_COLOR[method] ?? "text-neutral-400"}`}>
              {method.slice(0, 3)}
            </span>
          ),
          onSelect: () => onOpen(collectionId, item),
        });
      }
    }
  }
  for (const col of collections) {
    walk(col.id, col.name, col.items);
  }
  return results;
}

/** Default set of command palette actions. Callers should pass callbacks. */
export function useDefaultActions(callbacks: {
  newTab: () => void;
  importCurl: () => void;
  openGraphQL: () => void;
  openWebSocket: () => void;
  openKafka: () => void;
  openSoap: () => void;
  manageEnvs: () => void;
  openCodegen: () => void;
  openGrpc?: () => void;
  openMock?: () => void;
  openLoadTest?: () => void;
  openSettings?: () => void;
  importCollection?: () => void;
  openServiceMap?: () => void;
  openProxy?: () => void;
  openSwagger?: () => void;
  openJwt?: () => void;
  openBatch?: () => void;
  openMonitors?: () => void;
  openSecurity?: () => void;
  openCollVars?: () => void;
  openSecrets?: () => void;
  openWebhooks?: () => void;
  openMultiEnv?: () => void;
  openFlowEditor?: () => void;
  openPerfDash?: () => void;
  collections?: StoredCollection[];
  onOpenRequest?: (collectionId: string, item: CollectionItem) => void;
}): CommandAction[] {
  const requestActions = useMemo(
    () =>
      callbacks.collections && callbacks.onOpenRequest
        ? flattenCollectionRequests(callbacks.collections, callbacks.onOpenRequest)
        : [],
    [callbacks.collections, callbacks.onOpenRequest],
  );

  return useMemo(
    () => [
      {
        id: "new-tab",
        label: "New Request Tab",
        shortcut: "Cmd+T",
        icon: <Plus size={14} />,
        onSelect: callbacks.newTab,
      },
      {
        id: "import-curl",
        label: "Import cURL",
        icon: <Upload size={14} />,
        onSelect: callbacks.importCurl,
      },
      {
        id: "open-graphql",
        label: "Open GraphQL",
        icon: <Globe size={14} />,
        onSelect: callbacks.openGraphQL,
      },
      {
        id: "open-websocket",
        label: "Open WebSocket",
        icon: <Radio size={14} />,
        onSelect: callbacks.openWebSocket,
      },
      {
        id: "open-kafka",
        label: "Open Kafka",
        icon: <Zap size={14} />,
        onSelect: callbacks.openKafka,
      },
      {
        id: "open-soap",
        label: "Open SOAP / WSDL",
        icon: <FileCode size={14} />,
        onSelect: callbacks.openSoap,
      },
      {
        id: "manage-envs",
        label: "Manage Environments",
        icon: <Settings size={14} />,
        onSelect: callbacks.manageEnvs,
      },
      {
        id: "codegen",
        label: "Generate Code Snippet",
        icon: <Beaker size={14} />,
        onSelect: callbacks.openCodegen,
      },
      ...(callbacks.openGrpc ? [{
        id: "open-grpc", label: "Open gRPC", icon: <Zap size={14} />, onSelect: callbacks.openGrpc,
      }] : []),
      ...(callbacks.openMock ? [{
        id: "open-mock", label: "Mock Server", icon: <Globe size={14} />, onSelect: callbacks.openMock,
      }] : []),
      ...(callbacks.openLoadTest ? [{
        id: "load-test", label: "Load Test", icon: <Zap size={14} />, onSelect: callbacks.openLoadTest,
      }] : []),
      ...(callbacks.openSettings ? [{
        id: "settings", label: "Settings", shortcut: "Cmd+,", icon: <Settings size={14} />, onSelect: callbacks.openSettings,
      }] : []),
      ...(callbacks.importCollection ? [{
        id: "import-collection", label: "Import Collection (Postman/Insomnia)", icon: <Upload size={14} />, onSelect: callbacks.importCollection,
      }] : []),
      ...(callbacks.openServiceMap ? [{
        id: "service-map", label: "Service Dependency Map", icon: <Globe size={14} />, onSelect: callbacks.openServiceMap,
      }] : []),
      ...(callbacks.openProxy ? [{
        id: "proxy-recorder", label: "Proxy Recorder (capture traffic)", icon: <Radio size={14} />, onSelect: callbacks.openProxy,
      }] : []),
      ...(callbacks.openSwagger ? [{
        id: "swagger-browser", label: "Swagger / OpenAPI Browser", icon: <FileCode size={14} />, onSelect: callbacks.openSwagger,
      }] : []),
      ...(callbacks.openJwt ? [{
        id: "jwt-inspector", label: "JWT Inspector", icon: <Key size={14} />, onSelect: callbacks.openJwt,
      }] : []),
      ...(callbacks.openBatch ? [{
        id: "batch-runner", label: "Batch Runner", icon: <Database size={14} />, onSelect: callbacks.openBatch,
      }] : []),
      ...(callbacks.openMonitors ? [{
        id: "monitors", label: "Monitors (Scheduled Runs)", icon: <Clock size={14} />, onSelect: callbacks.openMonitors,
      }] : []),
      ...(callbacks.openSecurity ? [{
        id: "security-scanner", label: "Security Scanner", icon: <Shield size={14} />, onSelect: callbacks.openSecurity,
      }] : []),
      ...(callbacks.openCollVars ? [{
        id: "collection-vars", label: "Collection Variables", icon: <Layers size={14} />, onSelect: callbacks.openCollVars,
      }] : []),
      ...(callbacks.openSecrets ? [{
        id: "secrets-vault", label: "Secrets Vault", icon: <Lock size={14} />, onSelect: callbacks.openSecrets,
      }] : []),
      ...(callbacks.openWebhooks ? [{
        id: "webhooks", label: "Webhooks", icon: <Globe size={14} />, onSelect: callbacks.openWebhooks,
      }] : []),
      ...(callbacks.openMultiEnv ? [{
        id: "multi-env", label: "Multi-Environment Runner", icon: <GitCompare size={14} />, onSelect: callbacks.openMultiEnv,
      }] : []),
      ...(callbacks.openFlowEditor ? [{
        id: "flow-editor", label: "Flow Editor", icon: <GitBranch size={14} />, onSelect: callbacks.openFlowEditor,
      }] : []),
      ...(callbacks.openPerfDash ? [{
        id: "perf-dashboard", label: "Performance Dashboard", icon: <BarChart3 size={14} />, onSelect: callbacks.openPerfDash,
      }] : []),
      ...requestActions,
    ],
    [callbacks, requestActions],
  );
}
