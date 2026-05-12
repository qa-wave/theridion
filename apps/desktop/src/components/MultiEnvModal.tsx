import { useEffect, useState } from "react";
import { GitCompare, Loader2, Play, X } from "lucide-react";
import { sidecar, type CollectionSummary, type EnvironmentSummary, type MultiEnvResult } from "../lib/sidecar";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MultiEnvModal({ open, onClose }: Props) {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [environments, setEnvironments] = useState<EnvironmentSummary[]>([]);
  const [collectionId, setCollectionId] = useState("");
  const [selectedEnvs, setSelectedEnvs] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<MultiEnvResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    Promise.all([sidecar.listCollections(), sidecar.listEnvironments()])
      .then(([c, e]) => { setCollections(c); setEnvironments(e); })
      .catch(() => {});
  }, [open]);

  function toggleEnv(id: string) {
    setSelectedEnvs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function run() {
    if (!collectionId || selectedEnvs.size === 0) return;
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await sidecar.multiEnvRun({
        collection_id: collectionId,
        environment_ids: Array.from(selectedEnvs),
      });
      setResult(res);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  if (!open) return null;

  const inputClass = "w-full rounded-md border border-glass bg-neutral-900/50 px-3 py-1.5 text-xs text-neutral-100 focus:border-cobweb-500/40 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="glass flex h-[560px] w-[700px] max-h-[90vh] max-w-[95vw] animate-slide-in flex-col overflow-hidden rounded-xl border border-glass-light shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-glass px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-100">
            <GitCompare className="h-4 w-4 text-cobweb-400" /> Multi-Environment Runner
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-neutral-500 transition hover:bg-white/[0.05] hover:text-neutral-200"><X className="h-4 w-4" /></button>
        </div>

        {error && <div className="border-b border-rose-800/30 bg-rose-950/20 px-4 py-2 text-xs text-rose-400">{error}</div>}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!result ? (
            <>
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-wider text-neutral-500">Collection</p>
                <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className={inputClass}>
                  <option value="">Select collection...</option>
                  {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <p className="mb-2 text-[11px] uppercase tracking-wider text-neutral-500">Environments</p>
                <div className="space-y-1">
                  {environments.map((env) => (
                    <label key={env.id} className="flex items-center gap-2 rounded px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800/40 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEnvs.has(env.id)}
                        onChange={() => toggleEnv(env.id)}
                        className="rounded"
                      />
                      {env.name}
                      <span className="text-neutral-600 ml-auto">{env.variable_count} vars</span>
                    </label>
                  ))}
                  {environments.length === 0 && <p className="text-xs text-neutral-600 py-2">No environments defined.</p>}
                </div>
              </div>

              <button
                type="button"
                onClick={run}
                disabled={busy || !collectionId || selectedEnvs.size === 0}
                className="inline-flex items-center gap-2 rounded-md bg-cobweb-600/20 px-4 py-2 text-xs font-medium text-cobweb-400 transition hover:bg-cobweb-600/30 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Run across {selectedEnvs.size} environment(s)
              </button>
            </>
          ) : (
            <div>
              <div className="mb-4 flex flex-wrap gap-3 text-xs">
                {result.results.map((r) => (
                  <div key={r.env_id} className="rounded-lg border border-glass px-3 py-2">
                    <p className="font-medium text-neutral-200">{r.env_name}</p>
                    <p className="text-emerald-400">Pass: {r.passed}</p>
                    <p className="text-rose-400">Fail: {r.failed}</p>
                    <p className="text-neutral-500">{r.elapsed_ms}ms</p>
                  </div>
                ))}
              </div>

              {result.comparison.length > 0 && (
                <div className="overflow-x-auto rounded border border-glass">
                  <table className="w-full text-xs">
                    <thead className="bg-neutral-900/60 text-neutral-500">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-medium">Request</th>
                        {result.results.map((r) => (
                          <th key={r.env_id} className="px-3 py-1.5 text-left font-medium">{r.env_name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.comparison.map((row, idx) => (
                        <tr key={idx} className="border-t border-glass">
                          <td className="px-3 py-1.5 text-neutral-300">{row.request_name}</td>
                          {result.results.map((r) => {
                            const status = row.statuses[r.env_id] ?? row.statuses[r.env_name];
                            return (
                              <td key={r.env_id} className="px-3 py-1.5">
                                {status !== undefined ? (
                                  <span className={`rounded px-1.5 py-0.5 font-mono ${status >= 200 && status < 300 ? "bg-emerald-950/40 text-emerald-400" : status >= 400 ? "bg-rose-950/40 text-rose-400" : "bg-amber-950/40 text-amber-400"}`}>
                                    {status}
                                  </span>
                                ) : (
                                  <span className="text-neutral-600">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button type="button" onClick={() => setResult(null)} className="mt-3 text-xs text-cobweb-400 hover:text-cobweb-300">Run again</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
