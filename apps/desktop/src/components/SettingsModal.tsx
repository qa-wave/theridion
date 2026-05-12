import { useEffect, useState } from "react";
import { Check, Loader2, Settings2, X } from "lucide-react";
import { sidecar } from "../lib/sidecar";

interface Props { open: boolean; onClose: () => void; }

export function SettingsModal({ open, onClose }: Props) {
  const [provider, setProvider] = useState("ollama");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("llama3.2");
  const [models, setModels] = useState<Array<{ name: string }>>([]);
  const [pingResult, setPingResult] = useState<{ ok: boolean; version?: string; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    sidecar.aiSettings().then((s) => {
      setProvider(s.provider);
      setOllamaUrl(s.ollama_base_url);
      setOllamaModel(s.ollama_model);
    }).catch(() => {});
  }, [open]);

  async function save() {
    setBusy(true);
    try {
      await sidecar.updateAiSettings({ provider, ollama_base_url: ollamaUrl, ollama_model: ollamaModel });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch { /* ignore */ }
    finally { setBusy(false); }
  }

  async function testConnection() {
    setPingResult(null);
    const res = await sidecar.aiPing();
    setPingResult(res);
  }

  async function loadModels() {
    try {
      const res = await sidecar.aiModels();
      setModels(res.models);
      if (res.models.length > 0 && !res.models.some((m) => m.name === ollamaModel)) {
        setOllamaModel(res.models[0].name);
      }
    } catch { /* ignore */ }
  }

  if (!open) return null;

  const inputClass = "w-full rounded-md border border-glass bg-neutral-900/50 px-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-600 focus:border-cobweb-500/40 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="glass w-[500px] max-w-[95vw] animate-slide-in rounded-xl border border-glass-light shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-glass px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-100">
            <Settings2 className="h-4 w-4 text-cobweb-400" /> Settings
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-neutral-500 transition hover:bg-white/[0.05] hover:text-neutral-200"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-neutral-500">AI Provider</p>
            <select value={provider} onChange={(e) => setProvider(e.target.value)}
              className="rounded-md border border-glass bg-neutral-900/50 px-3 py-1.5 text-xs text-neutral-100 focus:outline-none">
              <option value="ollama">Ollama (local)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>

          {provider === "ollama" && (
            <>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-widest text-neutral-500">Base URL</label>
                <div className="flex gap-2">
                  <input value={ollamaUrl} onChange={(e) => setOllamaUrl(e.target.value)} className={inputClass} />
                  <button type="button" onClick={testConnection}
                    className="shrink-0 rounded-md border border-glass px-3 py-1.5 text-xs text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200">
                    Ping
                  </button>
                </div>
                {pingResult && (
                  <p className={`mt-1 text-[11px] ${pingResult.ok ? "text-emerald-400" : "text-rose-400"}`}>
                    {pingResult.ok ? `Connected (v${pingResult.version})` : pingResult.error}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-widest text-neutral-500">Model</label>
                <div className="flex gap-2">
                  <select value={ollamaModel} onChange={(e) => setOllamaModel(e.target.value)}
                    className="flex-1 rounded-md border border-glass bg-neutral-900/50 px-3 py-1.5 text-xs text-neutral-100 focus:outline-none">
                    {models.length === 0 ? (
                      <option value={ollamaModel}>{ollamaModel}</option>
                    ) : models.map((m) => (
                      <option key={m.name} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                  <button type="button" onClick={loadModels}
                    className="shrink-0 rounded-md border border-glass px-3 py-1.5 text-xs text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200">
                    Load
                  </button>
                </div>
              </div>
            </>
          )}

          <p className="rounded-md border border-glass bg-neutral-900/20 px-3 py-2 text-[11px] text-neutral-500">
            Ollama runs locally — your request/response data never leaves your machine.
            Cloud providers (OpenAI, Anthropic) send data to external servers.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-glass px-4 py-3">
          <button type="button" onClick={onClose} className="rounded-md border border-glass px-3 py-1.5 text-xs text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={busy}
            className="bg-accent-gradient inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium text-white shadow-glow-sm transition disabled:opacity-40 disabled:shadow-none">
            {saved ? <><Check className="h-3.5 w-3.5" /> Saved</> : busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
