import { useState } from "react";
import { FileUp, Loader2, Upload, X } from "lucide-react";
import { sidecar } from "../lib/sidecar";

interface Props { open: boolean; onClose: () => void; onImported: () => void; }

export function ImportModal({ open, onClose, onImported }: Props) {
  const [content, setContent] = useState("");
  const [format, setFormat] = useState("auto");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ collection_name: string; request_count: number } | null>(null);

  if (!open) return null;

  async function handleImport() {
    if (!content.trim()) return;
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await sidecar.importCollection(content, format);
      setResult(res);
      onImported();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setContent(text);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="glass w-full max-w-lg animate-slide-in rounded-xl border border-glass-light shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-glass px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-100">
            <Upload className="h-4 w-4 text-cobweb-400" /> Import Collection
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-neutral-500 transition hover:bg-white/[0.05] hover:text-neutral-200"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <select value={format} onChange={(e) => setFormat(e.target.value)}
              className="rounded-md border border-glass bg-neutral-900/50 px-3 py-1.5 text-xs text-neutral-100 focus:outline-none">
              <option value="auto">Auto-detect</option>
              <option value="postman">Postman v2.1</option>
              <option value="insomnia">Insomnia v4</option>
            </select>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-glass px-3 py-1.5 text-xs text-neutral-400 transition hover:bg-white/[0.04] hover:text-neutral-200">
              <FileUp className="h-3.5 w-3.5" /> Choose file
              <input type="file" accept=".json,.yaml,.yml" onChange={handleFile} className="hidden" />
            </label>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste Postman or Insomnia collection JSON here, or use the file picker above..."
            rows={10}
            className="w-full resize-y rounded-lg border border-glass bg-neutral-900/50 px-3 py-2 font-mono text-xs text-neutral-100 placeholder-neutral-600 focus:border-cobweb-500/40 focus:outline-none"
            spellCheck={false}
          />

          {error && <p className="rounded-md border border-rose-800/30 bg-rose-950/20 px-2 py-1 text-xs text-rose-400">{error}</p>}
          {result && (
            <p className="rounded-md border border-emerald-800/30 bg-emerald-950/20 px-2 py-1 text-xs text-emerald-400">
              Imported "{result.collection_name}" with {result.request_count} requests
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-glass px-4 py-3">
          <button type="button" onClick={onClose} className="rounded-md border border-glass px-3 py-1.5 text-xs text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200">
            {result ? "Done" : "Cancel"}
          </button>
          {!result && (
            <button type="button" onClick={handleImport} disabled={busy || !content.trim()}
              className="bg-accent-gradient inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium text-white shadow-glow-sm transition disabled:opacity-40 disabled:shadow-none">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Import
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
