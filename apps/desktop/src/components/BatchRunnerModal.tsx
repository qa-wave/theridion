import { useState } from "react";
import { Database, Loader2, Play, X } from "lucide-react";
import { sidecar, type BatchOutput, type CollectionSummary, type EnvironmentSummary } from "../lib/sidecar";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function BatchRunnerModal({ open, onClose }: Props) {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [environments, setEnvironments] = useState<EnvironmentSummary[]>([]);
  const [collectionId, setCollectionId] = useState("");
  const [envId, setEnvId] = useState("");
  const [dataMode, setDataMode] = useState<"csv" | "json">("json");
  const [dataText, setDataText] = useState("");
  const [result, setResult] = useState<BatchOutput | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  if (!open) return null;

  if (!loaded) {
    setLoaded(true);
    sidecar.listCollections().then(setCollections).catch(() => {});
    sidecar.listEnvironments().then(setEnvironments).catch(() => {});
  }

  async function run() {
    if (!collectionId) return;
    setBusy(true); setError(null); setResult(null);
    try {
      let dataset: Array<Record<string, string>> = [];
      if (dataMode === "json" && dataText.trim()) {
        dataset = JSON.parse(dataText);
      }
      const res = await sidecar.runBatch({
        collection_id: collectionId,
        environment_id: envId || undefined,
        dataset,
        dataset_csv: dataMode === "csv" ? dataText : undefined,
      });
      setResult(res);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  const inputClass = "w-full rounded-md border border-glass bg-neutral-900/50 px-3 py-1.5 text-xs text-neutral-100 focus:border-cobweb-500/40 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="glass flex h-[600px] w-[750px] max-h-[90vh] max-w-[95vw] animate-slide-in flex-col overflow-hidden rounded-xl border border-glass-light shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-glass px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-100">
            <Database className="h-4 w-4 text-cobweb-400" /> Batch Runner
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-neutral-500 transition hover:bg-white/[0.05] hover:text-neutral-200"><X className="h-4 w-4" /></button>
        </div>

        {error && <div className="border-b border-rose-800/30 bg-rose-950/20 px-4 py-2 text-xs text-rose-400">{error}</div>}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!result ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-[11px] uppercase tracking-wider text-neutral-500">Collection</p>
                  <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className={inputClass}>
                    <option value="">Select collection...</option>
                    {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <p className="mb-1 text-[11px] uppercase tracking-wider text-neutral-500">Environment</p>
                  <select value={envId} onChange={(e) => setEnvId(e.target.value)} className={inputClass}>
                    <option value="">None</option>
                    {environments.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center gap-2">
                  <p className="text-[11px] uppercase tracking-wider text-neutral-500">Dataset</p>
                  <div className="flex rounded-md border border-glass overflow-hidden text-[11px]">
                    {(["json", "csv"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDataMode(m)}
                        className={`px-2 py-0.5 transition ${dataMode === m ? "bg-cobweb-600/20 text-cobweb-400" : "text-neutral-500 hover:text-neutral-300"}`}
                      >
                        {m.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={dataText}
                  onChange={(e) => setDataText(e.target.value)}
                  placeholder={dataMode === "json" ? '[{"name":"Alice"},{"name":"Bob"}]' : "name,email\nAlice,alice@ex.com"}
                  rows={8}
                  className="w-full resize-y rounded-md border border-glass bg-neutral-900/50 px-3 py-2 font-mono text-xs text-neutral-100 placeholder-neutral-600 focus:border-cobweb-500/40 focus:outline-none"
                  spellCheck={false}
                />
              </div>

              <button
                type="button"
                onClick={run}
                disabled={busy || !collectionId}
                className="inline-flex items-center gap-2 rounded-md bg-cobweb-600/20 px-4 py-2 text-xs font-medium text-cobweb-400 transition hover:bg-cobweb-600/30 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Run Batch
              </button>
            </>
          ) : (
            <div>
              <div className="mb-3 flex items-center gap-4 text-xs">
                <span className="text-neutral-400">Rows: <span className="text-neutral-100">{result.total_rows}</span></span>
                <span className="text-emerald-400">Passed: {result.total_passed}</span>
                <span className="text-rose-400">Failed: {result.total_failed}</span>
                <span className="text-neutral-400">Time: {result.elapsed_ms}ms</span>
              </div>
              <div className="overflow-hidden rounded border border-glass">
                <table className="w-full text-xs">
                  <thead className="bg-neutral-900/60 text-neutral-500">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-medium">Row</th>
                      <th className="px-3 py-1.5 text-left font-medium">Variables</th>
                      <th className="px-3 py-1.5 text-left font-medium">Passed</th>
                      <th className="px-3 py-1.5 text-left font-medium">Failed</th>
                      <th className="px-3 py-1.5 text-left font-medium">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row) => (
                      <tr key={row.row_index} className="border-t border-glass">
                        <td className="px-3 py-1.5 font-mono">{row.row_index}</td>
                        <td className="px-3 py-1.5 font-mono text-neutral-400 truncate max-w-[200px]">
                          {Object.entries(row.variables).map(([k, v]) => `${k}=${v}`).join(", ")}
                        </td>
                        <td className="px-3 py-1.5 text-emerald-400">{row.passed}</td>
                        <td className="px-3 py-1.5 text-rose-400">{row.failed}</td>
                        <td className="px-3 py-1.5 text-amber-400">{row.errors}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="mt-3 text-xs text-cobweb-400 hover:text-cobweb-300"
              >
                Run again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
