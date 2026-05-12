import { useEffect, useState } from "react";
import { Loader2, Play, Plus, Server, Square, Trash2, X } from "lucide-react";
import { sidecar, type MockRoute } from "../lib/sidecar";

interface Props { open: boolean; onClose: () => void; }

export function MockServerModal({ open, onClose }: Props) {
  const [routes, setRoutes] = useState<MockRoute[]>([
    { path: "/health", method: "GET", status: 200, body: '{"status":"ok"}', content_type: "application/json" },
  ]);
  const [servers, setServers] = useState<Array<{ port: number; route_count: number }>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (open) refreshStatus(); }, [open]);

  async function refreshStatus() {
    try {
      const s = await sidecar.mockStatus();
      setServers(s.servers);
    } catch { /* ignore */ }
  }

  async function start() {
    setBusy(true); setError(null);
    try {
      await sidecar.mockStart({ routes });
      await refreshStatus();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function stop(port: number) {
    try { await sidecar.mockStop(port); await refreshStatus(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
  }

  function addRoute() {
    setRoutes((r) => [...r, { path: "/new", method: "GET", status: 200, body: "", content_type: "application/json" }]);
  }
  function updateRoute(i: number, patch: Partial<MockRoute>) {
    setRoutes((r) => r.map((rt, j) => j === i ? { ...rt, ...patch } : rt));
  }
  function removeRoute(i: number) { setRoutes((r) => r.filter((_, j) => j !== i)); }

  if (!open) return null;

  const inputClass = "w-full rounded-md border border-glass bg-neutral-900/50 px-2 py-1 font-mono text-xs text-neutral-100 placeholder-neutral-600 focus:border-cobweb-500/40 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="glass flex h-[600px] w-[800px] max-h-[90vh] max-w-[95vw] animate-slide-in flex-col overflow-hidden rounded-xl border border-glass-light shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-glass px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-100">
            <Server className="h-4 w-4 text-cobweb-400" /> Mock Server
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-neutral-500 transition hover:bg-white/[0.05] hover:text-neutral-200"><X className="h-4 w-4" /></button>
        </div>

        {/* Running servers */}
        {servers.length > 0 && (
          <div className="flex items-center gap-2 border-b border-glass px-4 py-2 text-xs">
            <span className="text-neutral-500">Running:</span>
            {servers.map((s) => (
              <span key={s.port} className="inline-flex items-center gap-1 rounded-md border border-emerald-800/30 bg-emerald-950/20 px-2 py-0.5 text-emerald-400">
                :{s.port} ({s.route_count} routes)
                <button type="button" onClick={() => stop(s.port)} className="ml-1 text-rose-400 hover:text-rose-300"><Square className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}

        {error && <div className="border-b border-rose-800/30 bg-rose-950/20 px-4 py-2 text-xs text-rose-400">{error}</div>}

        {/* Routes editor */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500">Routes</p>
            <button type="button" onClick={addRoute} className="inline-flex items-center gap-1 text-xs text-cobweb-400 hover:text-cobweb-300">
              <Plus className="h-3 w-3" /> Add route
            </button>
          </div>
          <div className="space-y-2">
            {routes.map((r, i) => (
              <div key={i} className="rounded-lg border border-glass p-3">
                <div className="flex items-center gap-2">
                  <select value={r.method ?? "GET"} onChange={(e) => updateRoute(i, { method: e.target.value })}
                    className="shrink-0 rounded-md border border-glass bg-neutral-900/50 px-2 py-1 text-xs text-neutral-100 focus:outline-none">
                    {["GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS"].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <input value={r.path} onChange={(e) => updateRoute(i, { path: e.target.value })} placeholder="/api/resource" className={inputClass} />
                  <input type="number" value={r.status ?? 200} onChange={(e) => updateRoute(i, { status: Number(e.target.value) })}
                    className="w-16 shrink-0 rounded-md border border-glass bg-neutral-900/50 px-2 py-1 text-xs text-neutral-100 focus:outline-none" />
                  <button type="button" onClick={() => removeRoute(i)} className="shrink-0 rounded-md p-1 text-neutral-500 hover:bg-white/[0.05] hover:text-rose-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <textarea value={r.body ?? ""} onChange={(e) => updateRoute(i, { body: e.target.value })} placeholder='{"message": "mocked"}'
                  rows={2} className="mt-2 w-full rounded-md border border-glass bg-neutral-900/50 px-2 py-1 font-mono text-xs text-neutral-100 placeholder-neutral-600 focus:border-cobweb-500/40 focus:outline-none" spellCheck={false} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-glass px-4 py-3">
          <button type="button" onClick={start} disabled={busy || routes.length === 0}
            className="bg-accent-gradient inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium text-white shadow-glow-sm transition disabled:opacity-40 disabled:shadow-none">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Start Server
          </button>
        </div>
      </div>
    </div>
  );
}
