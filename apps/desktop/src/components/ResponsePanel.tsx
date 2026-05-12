import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Code2, Copy, GitCompare, Inbox, Search, Terminal, XCircle } from "lucide-react";
import type { ExecuteResponse, SchemaValidateOutput, TimingBreakdown } from "../lib/sidecar";
import { sidecar } from "../lib/sidecar";
import { CodeEditor } from "./CodeEditor";

export interface ConsoleEntry {
  timestamp: number;
  level: "info" | "warn" | "error" | "log";
  message: string;
}

type Tab = "body" | "headers" | "cookies" | "timing" | "console" | "schema";

interface Props {
  busy: boolean;
  response: ExecuteResponse | null;
  error: string | null;
  onDiff?: () => void;
  onCodegen?: () => void;
  consoleEntries?: ConsoleEntry[];
}

export function ResponsePanel({ busy, response, error, onDiff, onCodegen, consoleEntries = [] }: Props) {
  const [tab, setTab] = useState<Tab>("body");
  const panelRef = useRef<HTMLDivElement>(null);
  const [headerSearch, setHeaderSearch] = useState("");
  const [cookieSearch, setCookieSearch] = useState("");
  const headerSearchRef = useRef<HTMLInputElement | null>(null);
  const cookieSearchRef = useRef<HTMLInputElement | null>(null);

  // Ctrl+F handler to focus search when response panel is active
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        if (!panelRef.current?.contains(document.activeElement) && !panelRef.current?.matches(":hover")) return;
        if (tab === "headers") {
          e.preventDefault();
          headerSearchRef.current?.focus();
        } else if (tab === "cookies") {
          e.preventDefault();
          cookieSearchRef.current?.focus();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab]);

  if (busy && !response) return <Loading />;
  if (error && !response) return <ErrorView error={error} />;
  if (!response) return <Empty />;

  return (
    <div ref={panelRef} className="flex h-full min-h-0 flex-col">
      <StatusRow res={response} onDiff={onDiff} onCodegen={onCodegen} />
      <div className="flex items-center gap-px border-b border-glass px-2">
        <TabButton active={tab === "body"} onClick={() => setTab("body")}>Body</TabButton>
        <TabButton active={tab === "headers"} onClick={() => setTab("headers")}>
          Headers <span className="ml-1 text-neutral-500">{Object.keys(response.headers).length}</span>
        </TabButton>
        {response.cookies && Object.keys(response.cookies).length > 0 && (
          <TabButton active={tab === "cookies"} onClick={() => setTab("cookies")}>
            Cookies <span className="ml-1 text-neutral-500">{Object.keys(response.cookies).length}</span>
          </TabButton>
        )}
        <TabButton active={tab === "timing"} onClick={() => setTab("timing")}>
          Timing
        </TabButton>
        <TabButton active={tab === "console"} onClick={() => setTab("console")}>
          Console
          {consoleEntries.length > 0 && (
            <span className="ml-1 text-neutral-500">{consoleEntries.length}</span>
          )}
        </TabButton>
        <TabButton active={tab === "schema"} onClick={() => setTab("schema")}>
          Schema
        </TabButton>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "body" && <BodyView res={response} />}
        {tab === "headers" && (
          <HeadersView
            res={response}
            search={headerSearch}
            onSearchChange={setHeaderSearch}
            searchRef={headerSearchRef}
          />
        )}
        {tab === "cookies" && (
          <CookiesView
            res={response}
            search={cookieSearch}
            onSearchChange={setCookieSearch}
            searchRef={cookieSearchRef}
          />
        )}
        {tab === "timing" && <TimingView res={response} />}
        {tab === "console" && <ConsoleView entries={consoleEntries} response={response} />}
        {tab === "schema" && <SchemaView res={response} />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-3 py-2 text-xs font-medium transition ${
        active ? "text-neutral-100" : "text-neutral-400 hover:text-neutral-200"
      }`}
    >
      {children}
      {active && (
        <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent-gradient-bar" aria-hidden />
      )}
    </button>
  );
}

function StatusRow({ res, onDiff, onCodegen }: { res: ExecuteResponse; onDiff?: () => void; onCodegen?: () => void }) {
  const tone = statusTone(res.status);
  const toneStyles = {
    ok: "border-emerald-600/30 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_-4px_rgba(52,211,153,0.3)]",
    info: "border-cobweb-600/30 bg-cobweb-500/10 text-cobweb-300 shadow-[0_0_12px_-4px_rgba(6,182,212,0.3)]",
    warn: "border-amber-600/30 bg-amber-500/10 text-amber-300 shadow-[0_0_12px_-4px_rgba(245,158,11,0.3)]",
    bad: "border-rose-600/30 bg-rose-500/10 text-rose-300 shadow-[0_0_12px_-4px_rgba(244,63,94,0.3)]",
  };
  return (
    <div className="flex items-center gap-3 border-b border-glass bg-neutral-950/60 px-4 py-2.5 text-xs">
      <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide ${toneStyles[tone]}`}>
        {res.status} {res.status_text || statusName(res.status)}
      </span>
      <Stat label="Time" value={formatMs(res.elapsed_ms)} />
      <Stat label="Size" value={formatBytes(res.body_size_bytes)} />
      {onCodegen && (
        <button
          type="button"
          onClick={onCodegen}
          className="inline-flex items-center gap-1 rounded-md border border-glass px-2 py-0.5 text-[10px] text-neutral-500 transition hover:bg-white/[0.04] hover:text-neutral-300"
          title="Generate code snippet"
        >
          <Code2 className="h-3 w-3" />
          Code
        </button>
      )}
      {onDiff && (
        <button
          type="button"
          onClick={onDiff}
          className="inline-flex items-center gap-1 rounded-md border border-glass px-2 py-0.5 text-[10px] text-neutral-500 transition hover:bg-white/[0.04] hover:text-neutral-300"
          title="Compare with previous response"
        >
          <GitCompare className="h-3 w-3" />
          Diff
        </button>
      )}
      <span className="ml-auto truncate font-mono text-[10px] text-neutral-600">
        {res.final_url}
      </span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-neutral-500">{label}</span>
      <span className="font-mono text-neutral-200">{value}</span>
    </span>
  );
}

function BodyView({ res }: { res: ExecuteResponse }) {
  const ct = res.headers["content-type"] ?? "";
  const pretty = useMemo(() => prettify(res.body, ct), [res.body, ct]);
  return (
    <div className="relative h-full">
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(res.body)}
        className="absolute right-3 top-2 z-10 inline-flex items-center gap-1 rounded border border-glass bg-neutral-900/80 px-2 py-0.5 text-[11px] text-neutral-400 backdrop-blur transition hover:border-neutral-700 hover:text-neutral-200"
        title="Copy body"
      >
        <Copy className="h-3 w-3" /> Copy
      </button>
      <div className="h-full overflow-hidden">
        <CodeEditor
          value={pretty}
          contentTypeHint={ct}
          readOnly
        />
      </div>
    </div>
  );
}

function HeadersView({
  res,
  search,
  onSearchChange,
  searchRef,
}: {
  res: ExecuteResponse;
  search: string;
  onSearchChange: (s: string) => void;
  searchRef: React.Ref<HTMLInputElement>;
}) {
  const q = search.toLowerCase();
  const filtered = useMemo(
    () =>
      Object.entries(res.headers).filter(
        ([k, v]) => !q || k.toLowerCase().includes(q) || v.toLowerCase().includes(q),
      ),
    [res.headers, q],
  );
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-glass/60 px-4 py-1.5">
        <Search className="h-3 w-3 text-neutral-500" />
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter headers..."
          className="flex-1 bg-transparent text-xs text-neutral-100 outline-none placeholder:text-neutral-600"
          spellCheck={false}
        />
        {search && (
          <span className="text-[10px] text-neutral-500">{filtered.length} / {Object.keys(res.headers).length}</span>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-neutral-925 text-[11px] uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-1.5 text-left font-medium">Name</th>
              <th className="px-4 py-1.5 text-left font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(([k, v]) => (
              <tr key={k} className="border-t border-glass/60 hover:bg-neutral-900/40">
                <td className="px-4 py-1.5 font-mono text-neutral-400">{k}</td>
                <td className="px-4 py-1.5 font-mono text-neutral-100 break-all">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CookiesView({
  res,
  search,
  onSearchChange,
  searchRef,
}: {
  res: ExecuteResponse;
  search: string;
  onSearchChange: (s: string) => void;
  searchRef: React.Ref<HTMLInputElement>;
}) {
  const allEntries = Object.entries(res.cookies ?? {});
  if (allEntries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-neutral-500">
        No cookies in this response
      </div>
    );
  }
  const q = search.toLowerCase();
  const filtered = allEntries.filter(
    ([k, v]) => !q || k.toLowerCase().includes(q) || v.toLowerCase().includes(q),
  );
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-glass/60 px-4 py-1.5">
        <Search className="h-3 w-3 text-neutral-500" />
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter cookies..."
          className="flex-1 bg-transparent text-xs text-neutral-100 outline-none placeholder:text-neutral-600"
          spellCheck={false}
        />
        {search && (
          <span className="text-[10px] text-neutral-500">{filtered.length} / {allEntries.length}</span>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-neutral-925 text-[11px] uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-1.5 text-left font-medium">Name</th>
              <th className="px-4 py-1.5 text-left font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(([k, v]) => (
              <tr key={k} className="border-t border-glass/60 hover:bg-neutral-900/40">
                <td className="px-4 py-1.5 font-mono text-neutral-400">{k}</td>
                <td className="px-4 py-1.5 font-mono text-neutral-100 break-all">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const TIMING_PHASES: { key: keyof TimingBreakdown; label: string; color: string }[] = [
  { key: "dns_ms", label: "DNS Lookup", color: "bg-cyan-500" },
  { key: "connect_ms", label: "TCP Connect", color: "bg-emerald-500" },
  { key: "tls_ms", label: "TLS Handshake", color: "bg-amber-500" },
  { key: "transfer_ms", label: "Transfer", color: "bg-violet-500" },
];

function TimingView({ res }: { res: ExecuteResponse }) {
  const t = res.timing;
  if (!t) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-neutral-500">
        No timing data available
      </div>
    );
  }
  const total = t.total_ms || 1;
  return (
    <div className="p-4">
      <p className="mb-3 text-[11px] uppercase tracking-wider text-neutral-500">
        Request timing — {formatMs(t.total_ms)} total
      </p>
      <div className="space-y-2">
        {TIMING_PHASES.map((phase) => {
          const val = t[phase.key];
          if (!val) return null;
          const pct = Math.max(2, (val / total) * 100);
          return (
            <div key={phase.key}>
              <div className="mb-0.5 flex items-baseline justify-between text-xs">
                <span className="text-neutral-400">{phase.label}</span>
                <span className="font-mono text-neutral-200">{formatMs(val)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
                <div
                  className={`h-full rounded-full ${phase.color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 border-t border-glass pt-3">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-medium text-neutral-300">Total</span>
          <span className="font-mono font-bold text-neutral-100">{formatMs(t.total_ms)}</span>
        </div>
      </div>
    </div>
  );
}

function ConsoleView({ entries, response }: { entries: ConsoleEntry[]; response: ExecuteResponse }) {
  const lifecycle: ConsoleEntry[] = [
    { timestamp: response.elapsed_ms ? Date.now() - response.elapsed_ms : Date.now(), level: "info", message: `Request sent to ${response.final_url}` },
    { timestamp: Date.now(), level: "info", message: `Response received: ${response.status} ${response.status_text || ""} in ${formatMs(response.elapsed_ms)}` },
  ];
  const all = [...lifecycle, ...entries].sort((a, b) => a.timestamp - b.timestamp);
  const levelColor: Record<string, string> = {
    info: "text-cobweb-400",
    log: "text-neutral-300",
    warn: "text-amber-400",
    error: "text-rose-400",
  };
  return (
    <div className="h-full overflow-auto p-4 font-mono text-xs">
      {all.map((e, i) => (
        <div key={i} className="flex gap-3 py-0.5">
          <span className="shrink-0 text-neutral-600">{new Date(e.timestamp).toLocaleTimeString()}</span>
          <Terminal className="mt-0.5 h-3 w-3 shrink-0 text-neutral-600" />
          <span className={levelColor[e.level] ?? "text-neutral-300"}>{e.message}</span>
        </div>
      ))}
      {all.length === 0 && (
        <div className="flex h-full items-center justify-center text-neutral-500">
          No console output
        </div>
      )}
    </div>
  );
}

function SchemaView({ res }: { res: ExecuteResponse }) {
  const [schema, setSchema] = useState("");
  const [result, setResult] = useState<SchemaValidateOutput | null>(null);
  const [validating, setValidating] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const validate = useCallback(async () => {
    if (!schema.trim()) return;
    setValidating(true);
    setSchemaError(null);
    try {
      const r = await sidecar.validateSchema(res.body, schema);
      setResult(r);
    } catch (e: unknown) {
      setSchemaError(e instanceof Error ? e.message : String(e));
    } finally {
      setValidating(false);
    }
  }, [res.body, schema]);

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-neutral-500">
          JSON Schema Validation
        </p>
        <button
          type="button"
          onClick={validate}
          disabled={validating || !schema.trim()}
          className="rounded-md border border-glass bg-cobweb-600/20 px-3 py-1 text-xs font-medium text-cobweb-400 transition hover:bg-cobweb-600/30 disabled:opacity-40"
        >
          {validating ? "Validating..." : "Validate"}
        </button>
      </div>
      <div className="min-h-[120px] flex-1 overflow-hidden rounded border border-glass bg-neutral-900/50">
        <CodeEditor
          value={schema}
          onChange={setSchema}
          language="json"
          placeholder='{"type": "object", "properties": {...}}'
        />
      </div>
      {schemaError && (
        <div className="rounded border border-rose-800/50 bg-rose-950/20 px-3 py-2 text-xs text-rose-400">
          {schemaError}
        </div>
      )}
      {result && (
        <div className={`rounded border px-3 py-2 text-xs ${
          result.valid
            ? "border-emerald-800/50 bg-emerald-950/20"
            : "border-rose-800/50 bg-rose-950/20"
        }`}>
          <div className="flex items-center gap-2 font-medium">
            {result.valid ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-400">Schema validation passed</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-rose-400" />
                <span className="text-rose-400">{result.errors.length} validation error{result.errors.length !== 1 ? "s" : ""}</span>
              </>
            )}
          </div>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.errors.map((err, i) => (
                <li key={i} className="text-rose-300">
                  <span className="font-mono text-rose-400">{err.path || "$"}</span>: {err.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="mb-4 rounded-full bg-neutral-900/60 p-4">
        <Inbox className="h-8 w-8 text-neutral-700" />
      </div>
      <p className="text-sm font-medium text-neutral-400">No response yet</p>
      <p className="mt-2 text-xs text-neutral-600">
        Hit{" "}
        <kbd className="rounded-md border border-glass bg-neutral-900/80 px-1.5 py-0.5 font-mono text-[10px] text-neutral-400 shadow-inner-glow">
          Send
        </kbd>{" "}
        or press{" "}
        <kbd className="rounded-md border border-glass bg-neutral-900/80 px-1.5 py-0.5 font-mono text-[10px] text-neutral-400 shadow-inner-glow">
          &#x2318;&#x23CE;
        </kbd>
      </p>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center text-xs text-neutral-500">
      <div className="mb-4 h-1 w-40 overflow-hidden rounded-full bg-neutral-900">
        <div className="h-full w-1/3 animate-[loading_1.4s_ease-in-out_infinite] rounded-full bg-accent-gradient-bar" />
      </div>
      <span className="tracking-wide">Sending request&hellip;</span>
      <style>{`@keyframes loading{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}`}</style>
    </div>
  );
}

function ErrorView({ error }: { error: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 rounded-full bg-rose-950/30 p-4">
        <AlertTriangle className="h-8 w-8 text-rose-500" />
      </div>
      <p className="text-sm font-semibold text-rose-300">Request failed</p>
      <p className="mt-2 max-w-md break-words text-xs leading-relaxed text-neutral-400">{error}</p>
    </div>
  );
}

function statusTone(s: number): "ok" | "info" | "warn" | "bad" {
  if (s >= 500) return "bad";
  if (s >= 400) return "warn";
  if (s >= 300) return "info";
  return "ok";
}

function statusName(s: number): string {
  const names: Record<number, string> = {
    200: "OK", 201: "Created", 202: "Accepted", 204: "No Content",
    301: "Moved Permanently", 302: "Found", 304: "Not Modified",
    400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found",
    422: "Unprocessable", 429: "Too Many Requests",
    500: "Internal Server Error", 502: "Bad Gateway", 503: "Service Unavailable",
  };
  return names[s] ?? "";
}

function formatMs(ms: number): string {
  if (ms < 1) return "<1 ms";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function prettify(body: string, contentType: string): string {
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
