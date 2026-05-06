import { useEffect, useState, type FormEvent } from "react";
import {
  sidecar,
  type ExecuteResponse,
  type HealthResponse,
  type ExecuteRequestInput,
} from "./lib/sidecar";

type Method = ExecuteRequestInput["method"];
const METHODS: Method[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

type SidecarStatus =
  | { state: "checking" }
  | { state: "ok"; info: HealthResponse }
  | { state: "down"; error: string };

export default function App() {
  const [status, setStatus] = useState<SidecarStatus>({ state: "checking" });
  const [method, setMethod] = useState<Method>("GET");
  const [url, setUrl] = useState("https://httpbin.org/get");
  const [headersRaw, setHeadersRaw] = useState("");
  const [body, setBody] = useState("");
  const [response, setResponse] = useState<ExecuteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    sidecar
      .health()
      .then((info) => alive && setStatus({ state: "ok", info }))
      .catch((e: unknown) =>
        alive && setStatus({ state: "down", error: e instanceof Error ? e.message : String(e) }),
      );
    return () => {
      alive = false;
    };
  }, []);

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResponse(null);
    try {
      const headers = parseHeaders(headersRaw);
      const result = await sidecar.execute({
        method,
        url,
        headers,
        body: body.length > 0 ? body : null,
      });
      setResponse(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-semibold tracking-tight">Theridion</h1>
          <span className="text-xs text-neutral-500">pre-alpha</span>
        </div>
        <SidecarStatusBadge status={status} />
      </header>

      <main className="grid flex-1 grid-cols-2 overflow-hidden">
        <form onSubmit={send} className="flex flex-col gap-3 overflow-y-auto border-r border-neutral-800 p-5">
          <div className="flex gap-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as Method)}
              className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm font-medium"
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/v1/things"
              className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 font-mono text-sm placeholder-neutral-600 focus:border-neutral-500 focus:outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={busy || status.state !== "ok" || url.length === 0}
              className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-neutral-700"
            >
              {busy ? "Sending…" : "Send"}
            </button>
          </div>

          <Field label="Headers (one per line: Name: value)">
            <textarea
              value={headersRaw}
              onChange={(e) => setHeadersRaw(e.target.value)}
              placeholder="Accept: application/json"
              rows={4}
              className="w-full resize-y rounded border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-sm placeholder-neutral-600 focus:border-neutral-500 focus:outline-none"
              spellCheck={false}
            />
          </Field>

          <Field label="Body">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder='{"hello":"world"}'
              rows={8}
              className="w-full resize-y rounded border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-sm placeholder-neutral-600 focus:border-neutral-500 focus:outline-none"
              spellCheck={false}
            />
          </Field>
        </form>

        <section className="flex flex-col overflow-hidden p-5">
          {error && (
            <div className="mb-3 rounded border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
          {response ? <ResponseView res={response} /> : <ResponsePlaceholder />}
        </section>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">{label}</span>
      {children}
    </label>
  );
}

function SidecarStatusBadge({ status }: { status: SidecarStatus }) {
  if (status.state === "checking") {
    return <Badge tone="muted">connecting…</Badge>;
  }
  if (status.state === "ok") {
    return (
      <Badge tone="ok" title={`uptime ${status.info.uptime_seconds.toFixed(1)}s`}>
        sidecar v{status.info.version}
      </Badge>
    );
  }
  return <Badge tone="bad" title={status.error}>sidecar offline</Badge>;
}

function Badge({
  tone,
  title,
  children,
}: {
  tone: "ok" | "bad" | "muted";
  title?: string;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "ok"
      ? "border-emerald-700 bg-emerald-950/50 text-emerald-300"
      : tone === "bad"
      ? "border-red-700 bg-red-950/50 text-red-300"
      : "border-neutral-700 bg-neutral-900 text-neutral-400";
  return (
    <span title={title} className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClass}`}>
      {children}
    </span>
  );
}

function ResponsePlaceholder() {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-neutral-600">
      No response yet — send a request to see results here.
    </div>
  );
}

function ResponseView({ res }: { res: ExecuteResponse }) {
  const statusTone =
    res.status >= 500 ? "bad" : res.status >= 400 ? "warn" : res.status >= 300 ? "info" : "ok";
  const toneClass =
    statusTone === "ok"
      ? "text-emerald-400"
      : statusTone === "info"
      ? "text-sky-400"
      : statusTone === "warn"
      ? "text-amber-400"
      : "text-red-400";
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="mb-3 flex items-center gap-4 text-sm">
        <span className={`font-mono font-semibold ${toneClass}`}>
          {res.status} {res.status_text}
        </span>
        <span className="text-neutral-500">{res.elapsed_ms.toFixed(0)} ms</span>
        <span className="text-neutral-500">{formatBytes(res.body_size_bytes)}</span>
      </div>
      <details className="mb-3 rounded border border-neutral-800 bg-neutral-900/50">
        <summary className="cursor-pointer px-3 py-2 text-xs font-medium uppercase tracking-wider text-neutral-400">
          Headers ({Object.keys(res.headers).length})
        </summary>
        <div className="border-t border-neutral-800 px-3 py-2 font-mono text-xs leading-relaxed">
          {Object.entries(res.headers).map(([k, v]) => (
            <div key={k}>
              <span className="text-neutral-400">{k}:</span> <span className="text-neutral-200">{v}</span>
            </div>
          ))}
        </div>
      </details>
      <pre className="flex-1 overflow-auto rounded border border-neutral-800 bg-neutral-900/50 p-3 font-mono text-xs leading-relaxed text-neutral-200">
        {tryPrettyPrint(res.body, res.headers["content-type"] ?? "")}
      </pre>
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

function tryPrettyPrint(body: string, contentType: string): string {
  if (contentType.includes("application/json") || looksLikeJson(body)) {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      // fall through
    }
  }
  return body;
}

function looksLikeJson(s: string): boolean {
  const t = s.trimStart();
  return t.startsWith("{") || t.startsWith("[");
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
