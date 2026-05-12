import { useState } from "react";
import { Loader2, Play, Search, Server, X } from "lucide-react";
import { sidecar } from "../lib/sidecar";
import { CodeEditor } from "./CodeEditor";

interface Props { open: boolean; onClose: () => void; }

export function GrpcModal({ open, onClose }: Props) {
  const [host, setHost] = useState("localhost:50051");
  const [services, setServices] = useState<Array<{ name: string; methods: string[] }>>([]);
  const [selectedService, setSelectedService] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [payload, setPayload] = useState("{}");
  const [result, setResult] = useState<{ ok: boolean; result: unknown; error: string | null; elapsed_ms: number } | null>(null);
  const [busy, setBusy] = useState<"" | "reflect" | "invoke">("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function reflect() {
    setBusy("reflect"); setError(null);
    try {
      const res = await sidecar.grpcReflect(host);
      setServices(res.services);
      if (res.services.length > 0) {
        setSelectedService(res.services[0].name);
        if (res.services[0].methods.length > 0) setSelectedMethod(res.services[0].methods[0]);
      }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(""); }
  }

  async function invoke() {
    if (!selectedService || !selectedMethod) return;
    setBusy("invoke"); setError(null); setResult(null);
    try {
      const res = await sidecar.grpcInvoke({
        host, service: selectedService, method: selectedMethod,
        payload: JSON.parse(payload), timeout_seconds: 10,
      });
      setResult(res);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(""); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="glass flex h-[600px] w-[900px] max-h-[90vh] max-w-[95vw] animate-slide-in flex-col overflow-hidden rounded-xl border border-glass-light shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-glass px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-100">
            <Server className="h-4 w-4 text-cobweb-400" /> gRPC
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-neutral-500 transition hover:bg-white/[0.05] hover:text-neutral-200"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex items-center gap-2 border-b border-glass px-4 py-2.5">
          <span className="shrink-0 rounded bg-emerald-600/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">gRPC</span>
          <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="localhost:50051"
            className="flex-1 rounded-md border border-glass bg-neutral-900/50 px-3 py-1.5 font-mono text-xs text-neutral-100 placeholder-neutral-600 focus:border-cobweb-500/40 focus:outline-none" spellCheck={false} />
          <button type="button" onClick={reflect} disabled={busy !== "" || !host.trim()}
            className="inline-flex items-center gap-1.5 rounded-md border border-glass px-3 py-1.5 text-xs text-neutral-400 transition hover:bg-white/[0.04] hover:text-neutral-200 disabled:opacity-40">
            {busy === "reflect" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />} Reflect
          </button>
          <button type="button" onClick={invoke} disabled={busy !== "" || !selectedMethod}
            className="bg-accent-gradient inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium text-white shadow-glow-sm transition disabled:opacity-40 disabled:shadow-none">
            {busy === "invoke" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Invoke
          </button>
        </div>

        {error && <div className="border-b border-rose-800/30 bg-rose-950/20 px-4 py-2 text-xs text-rose-400">{error}</div>}

        <div className="flex min-h-0 flex-1">
          <div className="w-64 shrink-0 overflow-y-auto border-r border-glass p-3">
            <p className="mb-2 text-[10px] uppercase tracking-widest text-neutral-500">Services</p>
            {services.length === 0 ? (
              <p className="py-4 text-center text-xs text-neutral-600">Click Reflect</p>
            ) : services.map((s) => (
              <div key={s.name} className="mb-2">
                <p className="text-xs font-medium text-neutral-300">{s.name.split(".").pop()}</p>
                {s.methods.map((m) => (
                  <button key={m} type="button" onClick={() => { setSelectedService(s.name); setSelectedMethod(m); }}
                    className={`mt-0.5 w-full rounded-md px-2 py-1 text-left font-mono text-[11px] transition ${
                      selectedService === s.name && selectedMethod === m ? "bg-cobweb-950/30 text-cobweb-200" : "text-neutral-400 hover:bg-white/[0.03]"
                    }`}>{m}</button>
                ))}
              </div>
            ))}
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="border-b border-glass px-3 py-1.5 text-[10px] uppercase tracking-widest text-neutral-500">
              Payload {selectedMethod && <span className="normal-case text-cobweb-400">{selectedMethod}</span>}
            </div>
            <div className="h-1/2 border-b border-glass">
              <CodeEditor value={payload} onChange={setPayload} language="json" placeholder="{}" />
            </div>
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-neutral-500">Response</div>
            <div className="min-h-0 flex-1">
              {result ? (
                <CodeEditor value={JSON.stringify(result.ok ? result.result : { error: result.error }, null, 2)} language="json" readOnly />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-neutral-600">Invoke a method to see response</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
