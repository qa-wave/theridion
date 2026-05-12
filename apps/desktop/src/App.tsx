import { useCallback, useEffect, useState } from "react";
import { useModals } from "./hooks/useModals";
import {
  sidecar,
  type CollectionItem,
  type EnvironmentSummary,
  type ExecuteRequestInput,
  type HealthResponse,
  type ParsedCurl,
  type StoredCollection,
} from "./lib/sidecar";
import {
  isDirty,
  newRequestTab,
  parseHeadersText,
  signatureOf,
  tabFromSaved,
  type RequestTab,
} from "./state/types";
import { Sidebar } from "./components/Sidebar";
import { RequestTabBar } from "./components/RequestTabBar";
import { UrlBar } from "./components/UrlBar";
import { RequestPanel } from "./components/RequestPanel";
import { ResponsePanel, type ConsoleEntry } from "./components/ResponsePanel";
import { StatusBar } from "./components/StatusBar";
import { SavePopover } from "./components/SavePopover";
import { EnvManagerModal } from "./components/EnvManagerModal";
import { CodegenModal } from "./components/CodegenModal";
import { CurlImportModal } from "./components/CurlImportModal";
import { TestGenModal } from "./components/TestGenModal";
import { DiffModal } from "./components/DiffModal";
import { GraphQLModal } from "./components/GraphQLModal";
import { GrpcModal } from "./components/GrpcModal";
import { ImportModal } from "./components/ImportModal";
import { KafkaModal } from "./components/KafkaModal";
import { LoadTestModal } from "./components/LoadTestModal";
import { MockServerModal } from "./components/MockServerModal";
import { ProxyRecorderModal } from "./components/ProxyRecorderModal";
import { ServiceMapModal } from "./components/ServiceMapModal";
import { SwaggerBrowserModal } from "./components/SwaggerBrowserModal";
import { SettingsModal } from "./components/SettingsModal";
import { WebSocketModal } from "./components/WebSocketModal";
import { HistoryPanel, type HistoryEntry } from "./components/HistoryPanel";
import { SoapModal } from "./components/SoapModal";
import { CommandPalette, useDefaultActions } from "./components/CommandPalette";
import { ContextMenu, buildSidebarActions, type ContextMenuAction } from "./components/ContextMenu";
import { JwtInspectorModal } from "./components/JwtInspectorModal";
import { BatchRunnerModal } from "./components/BatchRunnerModal";
import { MonitorsModal } from "./components/MonitorsModal";
import { SecurityScannerModal } from "./components/SecurityScannerModal";
import { CollectionVarsModal } from "./components/CollectionVarsModal";
import { SecretsVaultModal } from "./components/SecretsVaultModal";
import { WebhooksModal } from "./components/WebhooksModal";
import { MultiEnvModal } from "./components/MultiEnvModal";
import { FlowEditorModal } from "./components/FlowEditorModal";
import { PerformanceDashboardModal } from "./components/PerformanceDashboardModal";

const APP_VERSION = "0.0.1";
const ACTIVE_ENV_KEY = "theridion.activeEnvironmentId";

type SidecarStatus =
  | { state: "checking" }
  | { state: "ok"; info: HealthResponse }
  | { state: "down"; error: string };

export default function App() {
  const [sidecarStatus, setSidecarStatus] = useState<SidecarStatus>({ state: "checking" });

  const [collections, setCollections] = useState<StoredCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);

  const [tabs, setTabs] = useState<RequestTab[]>([newRequestTab()]);
  const [activeId, setActiveId] = useState<string>(tabs[0].id);
  const [savePopoverOpen, setSavePopoverOpen] = useState(false);

  const [environments, setEnvironments] = useState<EnvironmentSummary[]>([]);
  const [activeEnvId, setActiveEnvId] = useState<string | null>(() =>
    typeof window !== "undefined"
      ? window.localStorage.getItem(ACTIVE_ENV_KEY)
      : null,
  );
  const modals = useModals();
  const [previousResponse, setPreviousResponse] = useState<import("./lib/sidecar").ExecuteResponse | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [lastStatus, setLastStatus] = useState<number | null>(null);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [ctxMenu, setCtxMenu] = useState<{ open: boolean; x: number; y: number; actions: ContextMenuAction[] }>({ open: false, x: 0, y: 0, actions: [] });

  // ---- sidecar health polling ---------------------------------------------
  useEffect(() => {
    let alive = true;
    const tick = () =>
      sidecar
        .health()
        .then((info) => alive && setSidecarStatus({ state: "ok", info }))
        .catch((e: unknown) =>
          alive &&
          setSidecarStatus({
            state: "down",
            error: e instanceof Error ? e.message : String(e),
          }),
        );
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // ---- load collections on mount and after sidecar comes back -------------
  const refreshCollections = useCallback(async () => {
    setCollectionsLoading(true);
    try {
      const summaries = await sidecar.listCollections();
      const full = await Promise.all(
        summaries.map((s) => sidecar.getCollection(s.id)),
      );
      // Sort newest-first by name for now; later we'll persist ordering.
      full.sort((a, b) => a.name.localeCompare(b.name));
      setCollections(full);
    } catch (e) {
      console.error("failed to load collections", e);
    } finally {
      setCollectionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sidecarStatus.state === "ok") {
      void refreshCollections();
      void refreshEnvironments();
    }
  }, [sidecarStatus.state, refreshCollections]);

  const refreshEnvironments = useCallback(async () => {
    try {
      const list = await sidecar.listEnvironments();
      setEnvironments(list);
      // If the persisted active env no longer exists, clear it.
      setActiveEnvId((curr) =>
        curr && list.some((e) => e.id === curr) ? curr : null,
      );
    } catch (e) {
      console.error("failed to load environments", e);
    }
  }, []);

  // Persist the active environment so it survives reloads.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeEnvId) {
      window.localStorage.setItem(ACTIVE_ENV_KEY, activeEnvId);
    } else {
      window.localStorage.removeItem(ACTIVE_ENV_KEY);
    }
  }, [activeEnvId]);

  // ---- tab helpers --------------------------------------------------------
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  function patchActive(patch: Partial<RequestTab>) {
    setTabs((curr) =>
      curr.map((t) => (t.id === activeId ? { ...t, ...patch } : t)),
    );
  }

  function newTab(seed?: Partial<RequestTab>) {
    const t = newRequestTab(seed);
    setTabs((curr) => [...curr, t]);
    setActiveId(t.id);
  }

  function closeTab(id: string) {
    setTabs((curr) => {
      const idx = curr.findIndex((t) => t.id === id);
      const next = curr.filter((t) => t.id !== id);
      const ensured = next.length > 0 ? next : [newRequestTab()];
      if (id === activeId) {
        const fallback = ensured[Math.max(0, idx - 1)] ?? ensured[0];
        setActiveId(fallback.id);
      }
      return ensured;
    });
  }

  function openSaved(collectionId: string, item: CollectionItem) {
    // Sidebar can also fire onOpen for folders (when, e.g., the user
    // clicks the row); ignore those — only requests open in tabs.
    if (item.is_folder) return;
    const existing = tabs.find(
      (t) =>
        t.savedAs?.collectionId === collectionId &&
        t.savedAs?.requestId === item.id,
    );
    if (existing) {
      setActiveId(existing.id);
      return;
    }
    const tab = tabFromSaved(collectionId, item);
    setTabs((curr) => [...curr, tab]);
    setActiveId(tab.id);
  }

  // ---- send + save --------------------------------------------------------
  async function send() {
    if (!active.url || active.busy) return;
    patchActive({ busy: true, error: null });
    setConsoleEntries([]);
    try {
      const input: ExecuteRequestInput = {
        method: active.method,
        url: active.url,
        headers: parseHeadersText(active.headersRaw),
        body: active.body.length > 0 ? active.body : null,
        auth: active.auth.type !== "none" ? active.auth : null,
        environment_id: activeEnvId,
        collection_id: active.savedAs?.collectionId ?? null,
      };
      const response = await sidecar.execute(input);
      setPreviousResponse(active.response);
      patchActive({ busy: false, response, error: null, lastRunAt: Date.now() });
      setRequestCount((c) => c + 1);
      setLastStatus(response.status);
      // Evaluate assertions if any exist.
      if (active.assertions.length > 0) {
        try {
          const evalResult = await sidecar.evaluateAssertions({
            assertions: active.assertions,
            response: {
              status: response.status,
              headers: response.headers,
              body: response.body,
              elapsed_ms: response.elapsed_ms,
            },
          });
          patchActive({ assertionResults: evalResult.results });
        } catch {
          // Non-critical — don't fail the request over assertion errors.
        }
      } else {
        patchActive({ assertionResults: null });
      }
      setHistory((prev) => [
        {
          id: crypto.randomUUID(),
          method: active.method,
          url: active.url,
          status: response.status,
          elapsed_ms: response.elapsed_ms,
          timestamp: Date.now(),
        },
        ...prev,
      ].slice(0, 100));
    } catch (e: unknown) {
      patchActive({
        busy: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  /**
   * Persist the active tab. If `target` is given, save to that collection
   * with that name (used by the popover). Otherwise: if the tab is already
   * bound to a saved request, save in place; if not, open the popover so
   * the user can pick.
   */
  async function save(target?: { collectionId: string; name: string }) {
    if (!active.url) return;
    if (sidecarStatus.state !== "ok") return;

    if (!target && !active.savedAs) {
      setSavePopoverOpen(true);
      return;
    }

    const collectionId = target?.collectionId ?? active.savedAs!.collectionId;
    const name =
      target?.name ??
      (active.name && active.name !== "Untitled"
        ? active.name
        : deriveNameFromUrl(active.url));

    const updated = await sidecar.saveRequest(collectionId, {
      id: active.savedAs?.requestId,
      name,
      method: active.method,
      url: active.url,
      headers: parseHeadersText(active.headersRaw),
      body: active.body.length > 0 ? active.body : null,
      auth: active.auth.type !== "none" ? active.auth : null,
      assertions: active.assertions,
      pre_request_script: active.preRequestScript || null,
    });

    // Find the saved record we just wrote. If we passed an id, look it up;
    // otherwise it's the newly-appended last item.
    const matched =
      (active.savedAs?.requestId &&
        updated.items.find((r) => r.id === active.savedAs!.requestId)) ||
      updated.items[updated.items.length - 1];

    patchActive({
      name: matched.name,
      savedAs: { collectionId, requestId: matched.id },
      cleanSignature: signatureOf({
        name: matched.name,
        method: active.method,
        url: active.url,
        headersRaw: active.headersRaw,
        body: active.body,
        auth: active.auth,
        assertions: active.assertions,
        preRequestScript: active.preRequestScript,
      }),
    });

    await refreshCollections();
  }

  // ---- cURL import / export -----------------------------------------------
  function importCurl(parsed: ParsedCurl) {
    newTab({
      method: parsed.method,
      url: parsed.url,
      headersRaw: Object.entries(parsed.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n"),
      body: parsed.body ?? "",
      auth: parsed.auth ?? { type: "none" },
    });
  }

  async function copyAsCurl() {
    try {
      const result = await sidecar.generateCurl({
        method: active.method,
        url: active.url,
        headers: parseHeadersText(active.headersRaw),
        body: active.body.length > 0 ? active.body : null,
        auth: active.auth.type !== "none" ? active.auth : null,
      });
      await navigator.clipboard.writeText(result.curl);
    } catch (e) {
      console.error("failed to copy as cURL", e);
    }
  }

  // ---- collection ops -----------------------------------------------------
  async function newCollection() {
    const name = prompt("Collection name:", "New collection");
    if (!name) return;
    await sidecar.createCollection(name);
    await refreshCollections();
  }

  /** Used by the save popover. Returns the freshly-created collection so
   * the popover can immediately bind the save to it. */
  async function newCollectionFromPopover(name: string) {
    const created = await sidecar.createCollection(name);
    await refreshCollections();
    return created;
  }

  async function deleteCollection(id: string) {
    await sidecar.deleteCollection(id);
    await refreshCollections();
    // Detach any open tabs that pointed at this collection.
    setTabs((curr) =>
      curr.map((t) =>
        t.savedAs?.collectionId === id ? { ...t, savedAs: null } : t,
      ),
    );
  }

  async function deleteRequest(collectionId: string, requestId: string) {
    await sidecar.deleteRequest(collectionId, requestId);
    await refreshCollections();
    setTabs((curr) =>
      curr.map((t) =>
        t.savedAs?.collectionId === collectionId &&
        t.savedAs?.requestId === requestId
          ? { ...t, savedAs: null }
          : t,
      ),
    );
  }

  async function newFolder(collectionId: string, parentFolderId: string | null) {
    const name = prompt(
      parentFolderId ? "Subfolder name:" : "Folder name:",
      "New folder",
    );
    if (!name) return;
    await sidecar.createFolder(collectionId, {
      name,
      parent_folder_id: parentFolderId,
    });
    await refreshCollections();
  }

  async function renameCollection(id: string, name: string) {
    await sidecar.renameCollection(id, name);
    await refreshCollections();
  }

  async function renameItem(collectionId: string, itemId: string, name: string) {
    await sidecar.renameItem(collectionId, itemId, name);
    await refreshCollections();
    // Update name in any open tab pointing at this request.
    setTabs((curr) =>
      curr.map((t) =>
        t.savedAs?.collectionId === collectionId && t.savedAs?.requestId === itemId
          ? { ...t, name }
          : t,
      ),
    );
  }

  async function deleteFolder(collectionId: string, folderId: string) {
    await sidecar.deleteFolder(collectionId, folderId);
    await refreshCollections();
    // Detach any open tabs whose saved request lived under that folder —
    // we don't track folder ancestry on the tab, but we do detach all tabs
    // bound to this collection's items that no longer exist after the
    // delete. That refresh happens in refreshCollections; we conservatively
    // null out tabs that lost their backing request.
  }

  // ---- command palette actions ----------------------------------------------
  const cmdActions = useDefaultActions({
    newTab: () => newTab(),
    importCurl: () => modals.open("curlImport"),
    openGraphQL: () => modals.open("graphql"),
    openWebSocket: () => modals.open("webSocket"),
    openKafka: () => modals.open("kafka"),
    openSoap: () => modals.open("soap"),
    manageEnvs: () => modals.open("envManager"),
    openCodegen: () => modals.open("codegen"),
    openGrpc: () => modals.open("grpc"),
    openMock: () => modals.open("mock"),
    openLoadTest: () => modals.open("loadTest"),
    openSettings: () => modals.open("settings"),
    importCollection: () => modals.open("import"),
    openServiceMap: () => modals.open("serviceMap"),
    openProxy: () => modals.open("proxy"),
    openSwagger: () => modals.open("swagger"),
    openJwt: () => modals.open("jwt"),
    openBatch: () => modals.open("batch"),
    openMonitors: () => modals.open("monitors"),
    openSecurity: () => modals.open("security"),
    openCollVars: () => modals.open("collVars"),
    openSecrets: () => modals.open("secrets"),
    openWebhooks: () => modals.open("webhooks"),
    openMultiEnv: () => modals.open("multiEnv"),
    openFlowEditor: () => modals.open("flowEditor"),
    openPerfDash: () => modals.open("perfDash"),
    collections,
    onOpenRequest: openSaved,
  });

  // ---- keyboard shortcuts -------------------------------------------------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key === "k") {
        e.preventDefault();
        setCmdPaletteOpen((o) => !o);
      } else if (cmd && e.key === ",") {
        e.preventDefault();
        modals.open("settings");
      } else if (cmd && e.key === "s") {
        e.preventDefault();
        // Cmd+Shift+S = always show picker (Save As); Cmd+S alone = save in
        // place when bound, otherwise open picker.
        if (e.shiftKey) {
          setSavePopoverOpen(true);
        } else {
          void save();
        }
      } else if (cmd && e.key === "t") {
        e.preventDefault();
        newTab();
      } else if (cmd && e.key === "w") {
        e.preventDefault();
        closeTab(activeId);
      } else if (cmd && e.key === "Enter") {
        e.preventDefault();
        void send();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, activeId, collections, sidecarStatus.state]);

  return (
    <div className="grid h-full grid-cols-[260px_1fr] grid-rows-[1fr_auto] bg-neutral-950 bg-mesh-gradient text-neutral-100">
      <div className="row-span-1 overflow-hidden">
        <Sidebar
          collections={collections}
          loading={collectionsLoading}
          onOpen={openSaved}
          onNewCollection={newCollection}
          onGenerateTests={() => modals.open("testGen")}
          onNewFolder={newFolder}
          onDeleteCollection={deleteCollection}
          onDeleteRequest={deleteRequest}
          onDeleteFolder={deleteFolder}
          onRenameCollection={renameCollection}
          onRenameItem={renameItem}
          onRefresh={refreshCollections}
          onContextMenu={(e, collectionId, item) => {
            e.preventDefault();
            setCtxMenu({
              open: true,
              x: e.clientX,
              y: e.clientY,
              actions: buildSidebarActions({
                onRename: () => {
                  const name = prompt("Rename:", item.name);
                  if (name) void renameItem(collectionId, item.id, name);
                },
                onDuplicate: () => {
                  void sidecar.duplicateRequest(collectionId, item.id).then(() => refreshCollections());
                },
                onDelete: () => {
                  if (confirm(`Delete "${item.name}"?`)) void deleteRequest(collectionId, item.id);
                },
                onCopyAsCurl: item.url ? () => {
                  void sidecar.generateCurl({
                    method: item.method ?? "GET",
                    url: item.url ?? "",
                    headers: item.headers,
                    body: item.body,
                  }).then((r) => navigator.clipboard.writeText(r.curl));
                } : undefined,
              }),
            });
          }}
        />
      </div>

      <main className="flex min-h-0 flex-col overflow-hidden">
        <RequestTabBar
          tabs={tabs}
          activeId={activeId}
          onSelect={setActiveId}
          onClose={closeTab}
          onNew={() => newTab()}
          onImportCurl={() => modals.open("curlImport")}
          onOpenGraphQL={() => modals.open("graphql")}
          onOpenWebSocket={() => modals.open("webSocket")}
          onOpenKafka={() => modals.open("kafka")}
          onOpenGrpc={() => modals.open("grpc")}
          onOpenMock={() => modals.open("mock")}
          onOpenLoadTest={() => modals.open("loadTest")}
          onOpenSwagger={() => modals.open("swagger")}
          onToggleHistory={() => setHistoryOpen((o) => !o)}
          historyOpen={historyOpen}
          historyCount={history.length}
          onOpenSoap={() => modals.open("soap")}
          environments={environments}
          activeEnvId={activeEnvId}
          onSelectEnv={setActiveEnvId}
          onManageEnv={() => modals.open("envManager")}
        />
        <div className="relative">
          <UrlBar
            method={active.method}
            url={active.url}
            busy={active.busy}
            canSend={active.url.length > 0 && !active.busy}
            dirty={isDirty(active)}
            onMethodChange={(method) => patchActive({ method })}
            onUrlChange={(url) => patchActive({ url })}
            onSend={send}
            onSave={() => save()}
            onSaveAs={() => setSavePopoverOpen(true)}
            onCopyAsCurl={copyAsCurl}
          />
          <SavePopover
            open={savePopoverOpen}
            collections={collections}
            defaultName={
              active.name && active.name !== "Untitled"
                ? active.name
                : deriveNameFromUrl(active.url)
            }
            onClose={() => setSavePopoverOpen(false)}
            onSave={(t) => save(t)}
            onCreateCollection={newCollectionFromPopover}
          />
        </div>
        <div className={`grid min-h-0 flex-1 ${historyOpen ? "grid-cols-[1fr_1fr_240px]" : "grid-cols-2"}`}>
          <div className="min-h-0 overflow-hidden border-r border-neutral-800">
            <RequestPanel
              url={active.url}
              headersRaw={active.headersRaw}
              body={active.body}
              auth={active.auth}
              assertions={active.assertions}
              assertionResults={active.assertionResults}
              onUrlChange={(url) => patchActive({ url })}
              onHeadersChange={(headersRaw) => patchActive({ headersRaw })}
              onBodyChange={(body) => patchActive({ body })}
              onAuthChange={(auth) => patchActive({ auth })}
              onAssertionsChange={(assertions) => patchActive({ assertions, assertionResults: null })}
              preRequestScript={active.preRequestScript}
              onPreRequestScriptChange={(preRequestScript) => patchActive({ preRequestScript })}
              savedAs={active.savedAs}
              method={active.method}
              onMethodChange={(method) => patchActive({ method })}
              response={active.response}
            />
          </div>
          <div className="min-h-0 overflow-hidden">
            <ResponsePanel
              busy={active.busy}
              response={active.response}
              error={active.error}
              onDiff={() => modals.open("diff")}
              onCodegen={() => modals.open("codegen")}
              consoleEntries={consoleEntries}
            />
          </div>
          {historyOpen && (
            <div className="min-h-0 overflow-hidden border-l border-neutral-800 bg-neutral-925">
              <HistoryPanel
                entries={history}
                onSelect={(entry) => {
                  newTab({ method: entry.method, url: entry.url });
                }}
                onClear={() => setHistory([])}
              />
            </div>
          )}
        </div>
      </main>

      <div className="col-span-2">
        <StatusBar sidecarStatus={sidecarStatus} appVersion={APP_VERSION} onOpenSettings={() => modals.open("settings")} requestCount={requestCount} lastStatus={lastStatus} />
      </div>

      <EnvManagerModal
        open={modals.isOpen("envManager")}
        onClose={modals.close}
        onChanged={refreshEnvironments}
      />
      <CurlImportModal
        open={modals.isOpen("curlImport")}
        onClose={modals.close}
        onImport={importCurl}
      />
      <GraphQLModal open={modals.isOpen("graphql")} onClose={modals.close} activeEnvId={activeEnvId} />
      <WebSocketModal open={modals.isOpen("webSocket")} onClose={modals.close} />
      <KafkaModal open={modals.isOpen("kafka")} onClose={modals.close} />
      <CodegenModal
        open={modals.isOpen("codegen")}
        onClose={modals.close}
        method={active.method}
        url={active.url}
        headers={parseHeadersText(active.headersRaw)}
        body={active.body || null}
      />
      <DiffModal
        open={modals.isOpen("diff")}
        onClose={modals.close}
        currentResponse={active.response}
        previousResponse={previousResponse}
      />
      <GrpcModal open={modals.isOpen("grpc")} onClose={modals.close} />
      <MockServerModal open={modals.isOpen("mock")} onClose={modals.close} />
      <LoadTestModal
        open={modals.isOpen("loadTest")}
        onClose={modals.close}
        method={active.method}
        url={active.url}
        headers={parseHeadersText(active.headersRaw)}
        body={active.body || null}
      />
      <SettingsModal open={modals.isOpen("settings")} onClose={modals.close} />
      <ImportModal open={modals.isOpen("import")} onClose={modals.close} onImported={refreshCollections} />
      <ServiceMapModal open={modals.isOpen("serviceMap")} onClose={modals.close} />
      <ProxyRecorderModal open={modals.isOpen("proxy")} onClose={modals.close} />
      <SwaggerBrowserModal
        open={modals.isOpen("swagger")}
        onClose={modals.close}
        onTryEndpoint={(method, url, headers, body) => {
          newTab({
            method: method as import("./state/types").Method,
            url,
            headersRaw: Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join("\n"),
            body: body || "",
          });
        }}
      />
      <SoapModal open={modals.isOpen("soap")} onClose={modals.close} />
      <TestGenModal
        open={modals.isOpen("testGen")}
        onClose={modals.close}
        onCreated={() => {
          void refreshCollections();
        }}
      />
      <CommandPalette
        open={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        actions={cmdActions}
      />
      <ContextMenu
        open={ctxMenu.open}
        x={ctxMenu.x}
        y={ctxMenu.y}
        actions={ctxMenu.actions}
        onClose={() => setCtxMenu((c) => ({ ...c, open: false }))}
      />
      <JwtInspectorModal open={modals.isOpen("jwt")} onClose={modals.close} />
      <BatchRunnerModal open={modals.isOpen("batch")} onClose={modals.close} />
      <MonitorsModal open={modals.isOpen("monitors")} onClose={modals.close} />
      <SecurityScannerModal open={modals.isOpen("security")} onClose={modals.close} />
      <CollectionVarsModal open={modals.isOpen("collVars")} onClose={modals.close} />
      <SecretsVaultModal open={modals.isOpen("secrets")} onClose={modals.close} />
      <WebhooksModal open={modals.isOpen("webhooks")} onClose={modals.close} />
      <MultiEnvModal open={modals.isOpen("multiEnv")} onClose={modals.close} />
      <FlowEditorModal open={modals.isOpen("flowEditor")} onClose={modals.close} />
      <PerformanceDashboardModal open={modals.isOpen("perfDash")} onClose={modals.close} />
    </div>
  );
}

function deriveNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop();
    if (last) return last;
    return u.host;
  } catch {
    return url.slice(0, 40);
  }
}
