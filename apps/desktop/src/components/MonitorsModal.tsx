import { useEffect, useState } from "react";
import { Clock, Loader2, Plus, Trash2, X } from "lucide-react";
import { sidecar, type MonitorConfig, type CollectionSummary, type EnvironmentSummary } from "../lib/sidecar";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MonitorsModal({ open, onClose }: Props) {
  const [monitors, setMonitors] = useState<MonitorConfig[]>([]);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [environments, setEnvironments] = useState<EnvironmentSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formCollectionId, setFormCollectionId] = useState("");
  const [formEnvId, setFormEnvId] = useState("");
  const [formCron, setFormCron] = useState("*/5 * * * *");
  const [formEnabled, setFormEnabled] = useState(true);

  useEffect(() => {
    if (!open) return;
    loadAll();
  }, [open]);

  async function loadAll() {
    try {
      const [m, c, e] = await Promise.all([
        sidecar.listMonitors(),
        sidecar.listCollections(),
        sidecar.listEnvironments(),
      ]);
      setMonitors(m.monitors);
      setCollections(c);
      setEnvironments(e);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function create() {
    if (!formCollectionId) return;
    setBusy(true); setError(null);
    try {
      await sidecar.createMonitor({
        collection_id: formCollectionId,
        environment_id: formEnvId || null,
        cron: formCron,
        enabled: formEnabled,
      });
      setShowForm(false);
      await loadAll();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this monitor?")) return;
    try {
      await sidecar.deleteMonitor(id);
      await loadAll();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
  }

  if (!open) return null;

  const inputClass = "w-full rounded-md border border-glass bg-neutral-900/50 px-3 py-1.5 text-xs text-neutral-100 focus:border-cobweb-500/40 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="glass flex h-[520px] w-[600px] max-h-[90vh] max-w-[95vw] animate-slide-in flex-col overflow-hidden rounded-xl border border-glass-light shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-glass px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-100">
            <Clock className="h-4 w-4 text-cobweb-400" /> Monitors
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setShowForm(true)} className="rounded-md p-1 text-neutral-500 transition hover:bg-white/[0.05] hover:text-neutral-200" title="New monitor"><Plus className="h-4 w-4" /></button>
            <button type="button" onClick={onClose} className="rounded-md p-1 text-neutral-500 transition hover:bg-white/[0.05] hover:text-neutral-200"><X className="h-4 w-4" /></button>
          </div>
        </div>

        {error && <div className="border-b border-rose-800/30 bg-rose-950/20 px-4 py-2 text-xs text-rose-400">{error}</div>}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {showForm && (
            <div className="rounded-lg border border-glass p-3 space-y-3 bg-neutral-900/30">
              <p className="text-[11px] uppercase tracking-wider text-neutral-500">New Monitor</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] text-neutral-500">Collection</label>
                  <select value={formCollectionId} onChange={(e) => setFormCollectionId(e.target.value)} className={inputClass}>
                    <option value="">Select...</option>
                    {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-neutral-500">Environment</label>
                  <select value={formEnvId} onChange={(e) => setFormEnvId(e.target.value)} className={inputClass}>
                    <option value="">None</option>
                    {environments.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] text-neutral-500">Cron expression</label>
                  <input value={formCron} onChange={(e) => setFormCron(e.target.value)} className={inputClass} placeholder="*/5 * * * *" />
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 text-xs text-neutral-300">
                    <input type="checkbox" checked={formEnabled} onChange={(e) => setFormEnabled(e.target.checked)} className="rounded" />
                    Enabled
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={create} disabled={busy || !formCollectionId} className="inline-flex items-center gap-1 rounded-md bg-cobweb-600/20 px-3 py-1.5 text-xs font-medium text-cobweb-400 transition hover:bg-cobweb-600/30 disabled:opacity-50">
                  {busy && <Loader2 className="h-3 w-3 animate-spin" />} Create
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="rounded-md px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200">Cancel</button>
              </div>
            </div>
          )}

          {monitors.length === 0 && !showForm && (
            <p className="py-8 text-center text-xs text-neutral-600">No monitors configured yet.</p>
          )}

          {monitors.map((m) => {
            const coll = collections.find((c) => c.id === m.collection_id);
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-glass px-3 py-2">
                <span className={`h-2 w-2 rounded-full ${m.enabled ? "bg-emerald-500" : "bg-neutral-600"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-neutral-200 truncate">{coll?.name ?? m.collection_id}</p>
                  <p className="text-[11px] text-neutral-500">cron: {m.cron ?? "not set"} {m.last_status && <span className="ml-2">Last: {m.last_status}</span>}</p>
                </div>
                <button type="button" onClick={() => m.id && remove(m.id)} className="rounded p-1 text-neutral-600 transition hover:bg-neutral-800 hover:text-rose-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
