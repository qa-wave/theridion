import { useCallback, useEffect, useState } from "react";
import {
  sidecar,
  type ExecuteRequestInput,
  type HealthResponse,
  type SavedRequest,
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
import { ResponsePanel } from "./components/ResponsePanel";
import { StatusBar } from "./components/StatusBar";

const APP_VERSION = "0.0.1";
/** Auto-created on first save when the user hasn't picked a collection. */
const DEFAULT_COLLECTION_NAME = "My requests";

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
    }
  }, [sidecarStatus.state, refreshCollections]);

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

  function openSaved(collectionId: string, req: SavedRequest) {
    // If this exact saved request is already open, focus it. Otherwise open
    // a fresh tab from disk.
    const existing = tabs.find(
      (t) =>
        t.savedAs?.collectionId === collectionId &&
        t.savedAs?.requestId === req.id,
    );
    if (existing) {
      setActiveId(existing.id);
      return;
    }
    const tab = tabFromSaved(collectionId, req);
    setTabs((curr) => [...curr, tab]);
    setActiveId(tab.id);
  }

  // ---- send + save --------------------------------------------------------
  async function send() {
    if (!active.url || active.busy) return;
    patchActive({ busy: true, error: null });
    try {
      const input: ExecuteRequestInput = {
        method: active.method,
        url: active.url,
        headers: parseHeadersText(active.headersRaw),
        body: active.body.length > 0 ? active.body : null,
      };
      const response = await sidecar.execute(input);
      patchActive({ busy: false, response, error: null, lastRunAt: Date.now() });
    } catch (e: unknown) {
      patchActive({
        busy: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async function save() {
    if (!active.url) return;
    if (sidecarStatus.state !== "ok") return;

    // Pick (or create) a target collection. Right now: always use the first
    // available collection, or auto-create "My requests" if none exists. The
    // explicit "save to…" picker is a follow-up.
    let collectionId = active.savedAs?.collectionId;
    if (!collectionId) {
      const existing = collections[0];
      if (existing) {
        collectionId = existing.id;
      } else {
        const created = await sidecar.createCollection(DEFAULT_COLLECTION_NAME);
        collectionId = created.id;
      }
    }

    // Derive a sensible name from the URL when the user hasn't set one yet.
    const name =
      active.name && active.name !== "Untitled"
        ? active.name
        : deriveNameFromUrl(active.url);

    const updated = await sidecar.saveRequest(collectionId, {
      id: active.savedAs?.requestId,
      name,
      method: active.method,
      url: active.url,
      headers: parseHeadersText(active.headersRaw),
      body: active.body.length > 0 ? active.body : null,
    });

    // Record the new clean signature so the dirty bit clears, and remember
    // which saved request this tab is bound to.
    const savedItem = updated.items[updated.items.length - 1];
    const matched =
      updated.items.find((r) => r.id === active.savedAs?.requestId) ??
      savedItem;
    patchActive({
      name: matched.name,
      savedAs: { collectionId, requestId: matched.id },
      cleanSignature: signatureOf({
        name: matched.name,
        method: active.method,
        url: active.url,
        headersRaw: active.headersRaw,
        body: active.body,
      }),
    });

    await refreshCollections();
  }

  // ---- collection ops -----------------------------------------------------
  async function newCollection() {
    const name = prompt("Collection name:", "New collection");
    if (!name) return;
    await sidecar.createCollection(name);
    await refreshCollections();
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

  // ---- keyboard shortcuts -------------------------------------------------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key === "s") {
        e.preventDefault();
        void save();
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
    <div className="grid h-full grid-cols-[260px_1fr] grid-rows-[1fr_auto] bg-neutral-950 text-neutral-100">
      <div className="row-span-1 overflow-hidden">
        <Sidebar
          collections={collections}
          loading={collectionsLoading}
          onOpen={openSaved}
          onNewCollection={newCollection}
          onDeleteCollection={deleteCollection}
          onDeleteRequest={deleteRequest}
          onRefresh={refreshCollections}
        />
      </div>

      <main className="flex min-h-0 flex-col overflow-hidden">
        <RequestTabBar
          tabs={tabs}
          activeId={activeId}
          onSelect={setActiveId}
          onClose={closeTab}
          onNew={() => newTab()}
        />
        <UrlBar
          method={active.method}
          url={active.url}
          busy={active.busy}
          canSend={active.url.length > 0 && !active.busy}
          dirty={isDirty(active)}
          onMethodChange={(method) => patchActive({ method })}
          onUrlChange={(url) => patchActive({ url })}
          onSend={send}
          onSave={save}
        />
        <div className="grid min-h-0 flex-1 grid-cols-2">
          <div className="min-h-0 overflow-hidden border-r border-neutral-800">
            <RequestPanel
              url={active.url}
              headersRaw={active.headersRaw}
              body={active.body}
              onUrlChange={(url) => patchActive({ url })}
              onHeadersChange={(headersRaw) => patchActive({ headersRaw })}
              onBodyChange={(body) => patchActive({ body })}
            />
          </div>
          <div className="min-h-0 overflow-hidden">
            <ResponsePanel
              busy={active.busy}
              response={active.response}
              error={active.error}
            />
          </div>
        </div>
      </main>

      <div className="col-span-2">
        <StatusBar sidecarStatus={sidecarStatus} appVersion={APP_VERSION} />
      </div>
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
