import { useEffect, useMemo, useState } from "react";
import { Layers, Plus, Save, Trash2, X } from "lucide-react";
import {
  sidecar,
  type Environment,
  type EnvVariable,
  type EnvironmentSummary,
} from "../lib/sidecar";

interface Props {
  open: boolean;
  onClose: () => void;
  onChanged: () => Promise<void>;
}

interface DraftRow extends EnvVariable {
  _key: string;
}

export function EnvManagerModal({ open, onClose, onChanged }: Props) {
  const [summaries, setSummaries] = useState<EnvironmentSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Environment | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = useMemo(() => isDirty(editing, draftName, draftRows), [editing, draftName, draftRows]);

  useEffect(() => {
    if (!open) return;
    void loadSummaries();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadSummaries() {
    setError(null);
    const list = await sidecar.listEnvironments();
    setSummaries(list);
    if (activeId === null && list.length > 0) void selectEnv(list[0].id);
  }

  async function selectEnv(id: string) {
    setActiveId(id);
    setEditing(null);
    try {
      const env = await sidecar.getEnvironment(id);
      setEditing(env);
      setDraftName(env.name);
      setDraftRows(env.variables.map((v) => ({ ...v, _key: crypto.randomUUID() })));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function newEnv() {
    const name = prompt("Environment name:", "Production");
    if (!name) return;
    const created = await sidecar.createEnvironment(name);
    await loadSummaries();
    await selectEnv(created.id);
    await onChanged();
  }

  async function deleteActiveEnv() {
    if (!editing) return;
    if (!confirm(`Delete environment "${editing.name}"?`)) return;
    await sidecar.deleteEnvironment(editing.id);
    setEditing(null);
    setActiveId(null);
    await loadSummaries();
    await onChanged();
  }

  function addRow() {
    setDraftRows((rs) => [...rs, { _key: crypto.randomUUID(), name: "", value: "", enabled: true }]);
  }

  function patchRow(idx: number, patch: Partial<DraftRow>) {
    setDraftRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function delRow(idx: number) {
    setDraftRows((rs) => rs.filter((_, i) => i !== idx));
  }

  async function saveActive() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const cleaned = draftRows
        .filter((r) => r.name.trim() !== "")
        .map<EnvVariable>((r) => ({ name: r.name.trim(), value: r.value, enabled: r.enabled }));
      if (draftName !== editing.name) await sidecar.renameEnvironment(editing.id, draftName);
      const updated = await sidecar.replaceEnvironmentVariables(editing.id, cleaned);
      setEditing(updated);
      setDraftRows(updated.variables.map((v) => ({ ...v, _key: crypto.randomUUID() })));
      await loadSummaries();
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        role="dialog"
        aria-label="Manage environments"
        className="glass flex h-[640px] w-[860px] max-w-[95vw] animate-slide-in flex-col overflow-hidden rounded-xl border border-glass-light shadow-2xl shadow-black/60"
      >
        <header className="flex items-center justify-between border-b border-glass px-4 py-3">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-100">
            <Layers className="h-4 w-4 text-cobweb-400" /> Environments
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-neutral-500 transition hover:bg-white/[0.05] hover:text-neutral-200"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* Left panel — env list */}
          <div className="flex w-56 shrink-0 flex-col border-r border-glass bg-neutral-950/40">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                Environments
              </span>
              <button
                type="button"
                onClick={newEnv}
                className="rounded-md p-0.5 text-neutral-400 transition hover:bg-white/[0.05] hover:text-neutral-100"
                title="New environment"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pb-2">
              {summaries.length === 0 && (
                <p className="px-3 py-2 text-xs text-neutral-600">No environments yet.</p>
              )}
              {summaries.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectEnv(s.id)}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition ${
                    s.id === activeId
                      ? "bg-cobweb-950/30 text-cobweb-200"
                      : "text-neutral-400 hover:bg-white/[0.03] hover:text-neutral-200"
                  }`}
                >
                  <span className="truncate">{s.name}</span>
                  <span className="ml-2 text-[10px] text-neutral-600">{s.variable_count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right panel — editor */}
          <div className="flex min-w-0 flex-1 flex-col">
            {!editing ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-xs text-neutral-500">
                <div className="rounded-full bg-neutral-900/40 p-4">
                  <Layers className="h-8 w-8 text-neutral-700" />
                </div>
                <span>Pick an environment, or</span>
                <button type="button" onClick={newEnv} className="text-cobweb-400 hover:text-cobweb-300">
                  create a new one
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 border-b border-glass px-4 py-3">
                  <input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    className="flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-neutral-100 transition focus:border-cobweb-500/40 focus:bg-neutral-900/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={deleteActiveEnv}
                    className="rounded-md border border-glass px-2 py-1 text-[11px] text-neutral-400 transition hover:border-rose-800/50 hover:text-rose-300"
                    title="Delete environment"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={saveActive}
                    disabled={!dirty || busy}
                    className="inline-flex items-center gap-1.5 rounded-md bg-accent-gradient px-3 py-1 text-[11px] font-medium text-white shadow-glow-sm transition disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                  >
                    <Save className="h-3 w-3" />
                    {busy ? "Saving\u2026" : "Save"}
                  </button>
                </div>

                {error && (
                  <p className="border-b border-rose-800/30 bg-rose-950/20 px-4 py-2 text-xs text-rose-300">
                    {error}
                  </p>
                )}

                <div className="flex-1 overflow-y-auto p-4">
                  <div className="overflow-hidden rounded-lg border border-glass">
                    <div className="grid grid-cols-[28px_1fr_1.5fr_28px] items-center bg-neutral-900/30 px-2 py-1.5 text-[10px] font-medium uppercase tracking-widest text-neutral-500">
                      <span></span>
                      <span className="px-2">Name</span>
                      <span className="px-2">Value</span>
                      <span></span>
                    </div>
                    {draftRows.length === 0 && (
                      <p className="border-t border-glass px-3 py-3 text-center text-xs text-neutral-600">
                        No variables. Add one below.
                      </p>
                    )}
                    {draftRows.map((row, idx) => (
                      <div
                        key={row._key}
                        className="grid grid-cols-[28px_1fr_1.5fr_28px] items-center border-t border-glass hover:bg-white/[0.02]"
                      >
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            checked={row.enabled}
                            onChange={(e) => patchRow(idx, { enabled: e.target.checked })}
                            className="h-3 w-3 cursor-pointer accent-cobweb-500"
                          />
                        </div>
                        <input
                          value={row.name}
                          onChange={(e) => patchRow(idx, { name: e.target.value })}
                          placeholder="baseUrl"
                          className="bg-transparent px-2 py-1.5 font-mono text-[13px] text-neutral-100 placeholder-neutral-600 focus:outline-none"
                          spellCheck={false}
                        />
                        <input
                          value={row.value}
                          onChange={(e) => patchRow(idx, { value: e.target.value })}
                          placeholder="https://api.example.com"
                          className="bg-transparent px-2 py-1.5 font-mono text-[13px] text-neutral-100 placeholder-neutral-600 focus:outline-none"
                          spellCheck={false}
                        />
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => delRow(idx)}
                            className="flex h-5 w-5 items-center justify-center rounded-md text-neutral-500 transition hover:bg-white/[0.05] hover:text-rose-400"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addRow}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-cobweb-400 hover:text-cobweb-300"
                  >
                    <Plus className="h-3 w-3" />
                    Add variable
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function isDirty(env: Environment | null, name: string, rows: DraftRow[]): boolean {
  if (!env) return false;
  if (env.name !== name) return true;
  const stripped = rows.filter((r) => r.name.trim() !== "").map(({ _key: _k, ...r }) => r);
  if (stripped.length !== env.variables.length) return true;
  for (let i = 0; i < stripped.length; i++) {
    const a = stripped[i];
    const b = env.variables[i];
    if (a.name !== b.name || a.value !== b.value || a.enabled !== b.enabled) return true;
  }
  return false;
}
