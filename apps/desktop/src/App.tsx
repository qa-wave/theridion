import { useEffect, useState } from "react";
import {
  sidecar,
  type ExecuteRequestInput,
  type HealthResponse,
} from "./lib/sidecar";
import {
  newRequestTab,
  type CollectionItem,
  type RequestTab,
} from "./state/types";
import { MOCK_COLLECTIONS } from "./state/mock-collections";
import { Sidebar } from "./components/Sidebar";
import { RequestTabBar } from "./components/RequestTabBar";
import { UrlBar } from "./components/UrlBar";
import { RequestPanel } from "./components/RequestPanel";
import { ResponsePanel } from "./components/ResponsePanel";
import { StatusBar } from "./components/StatusBar";

const APP_VERSION = "0.0.1";

type SidecarStatus =
  | { state: "checking" }
  | { state: "ok"; info: HealthResponse }
  | { state: "down"; error: string };

export default function App() {
  const [sidecarStatus, setSidecarStatus] = useState<SidecarStatus>({ state: "checking" });
  const [tabs, setTabs] = useState<RequestTab[]>([
    newRequestTab({
      name: "Search repos",
      method: "GET",
      url: "https://api.github.com/search/repositories?q=tauri&sort=stars",
    }),
  ]);
  const [activeId, setActiveId] = useState<string>(tabs[0].id);

  // Health-check the sidecar on mount; in production this'll re-fire on
  // disconnect once the Tauri shell is doing supervised spawning.
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
      const next = curr.filter((t) => t.id !== id);
      // Always keep at least one tab open
      const ensured = next.length > 0 ? next : [newRequestTab()];
      if (id === activeId) {
        const fallback = ensured[Math.max(0, curr.findIndex((t) => t.id === id) - 1)];
        setActiveId((fallback ?? ensured[0]).id);
      }
      return ensured;
    });
  }

  function openCollectionItem(item: CollectionItem) {
    // If the same URL+method is already open, focus it; otherwise open new.
    const existing = tabs.find(
      (t) => t.url === item.url && t.method === item.method,
    );
    if (existing) {
      setActiveId(existing.id);
      return;
    }
    newTab({
      name: item.name,
      method: item.method,
      url: item.url,
    });
  }

  async function send() {
    if (!active.url || active.busy) return;
    patchActive({ busy: true, error: null });
    try {
      const headers = parseHeaders(active.headersRaw);
      const input: ExecuteRequestInput = {
        method: active.method,
        url: active.url,
        headers,
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

  return (
    <div className="grid h-full grid-cols-[260px_1fr] grid-rows-[1fr_auto] bg-neutral-950 text-neutral-100">
      <div className="row-span-1 overflow-hidden">
        <Sidebar collections={MOCK_COLLECTIONS} onOpen={openCollectionItem} />
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
          onMethodChange={(method) => patchActive({ method })}
          onUrlChange={(url) => patchActive({ url })}
          onSend={send}
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

function parseHeaders(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    const name = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (name) out[name] = value;
  }
  return out;
}
