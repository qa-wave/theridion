import { useMemo, useState } from "react";
import { AlertTriangle, Copy, Inbox } from "lucide-react";
import type { ExecuteResponse } from "../lib/sidecar";
import { CodeEditor } from "./CodeEditor";

type Tab = "body" | "headers";

interface Props {
  busy: boolean;
  response: ExecuteResponse | null;
  error: string | null;
}

export function ResponsePanel({ busy, response, error }: Props) {
  const [tab, setTab] = useState<Tab>("body");

  if (busy && !response) return <Loading />;
  if (error && !response) return <ErrorView error={error} />;
  if (!response) return <Empty />;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <StatusRow res={response} />
      <div className="flex items-center gap-px border-b border-neutral-800 px-2">
        <TabButton active={tab === "body"} onClick={() => setTab("body")}>Body</TabButton>
        <TabButton active={tab === "headers"} onClick={() => setTab("headers")}>
          Headers <span className="ml-1 text-neutral-500">{Object.keys(response.headers).length}</span>
        </TabButton>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "body" ? <BodyView res={response} /> : <HeadersView res={response} />}
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
        <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-emerald-500" aria-hidden />
      )}
    </button>
  );
}

function StatusRow({ res }: { res: ExecuteResponse }) {
  const tone = statusTone(res.status);
  return (
    <div className="flex items-center gap-3 border-b border-neutral-800 bg-neutral-950 px-4 py-2.5 text-xs">
      <span
        className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono font-bold ${
          tone === "ok"
            ? "border-emerald-700 bg-emerald-950/40 text-emerald-300"
            : tone === "info"
            ? "border-sky-700 bg-sky-950/40 text-sky-300"
            : tone === "warn"
            ? "border-amber-700 bg-amber-950/40 text-amber-300"
            : "border-rose-700 bg-rose-950/40 text-rose-300"
        }`}
      >
        {res.status} {res.status_text || statusName(res.status)}
      </span>
      <Stat label="Time" value={`${formatMs(res.elapsed_ms)}`} />
      <Stat label="Size" value={formatBytes(res.body_size_bytes)} />
      <span className="ml-auto truncate font-mono text-[11px] text-neutral-500">
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
        className="absolute right-3 top-2 z-10 inline-flex items-center gap-1 rounded border border-neutral-800 bg-neutral-900/80 px-2 py-0.5 text-[11px] text-neutral-400 backdrop-blur transition hover:border-neutral-700 hover:text-neutral-200"
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

function HeadersView({ res }: { res: ExecuteResponse }) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-neutral-925 text-[11px] uppercase tracking-wider text-neutral-500">
          <tr>
            <th className="px-4 py-1.5 text-left font-medium">Name</th>
            <th className="px-4 py-1.5 text-left font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(res.headers).map(([k, v]) => (
            <tr key={k} className="border-t border-neutral-800/60 hover:bg-neutral-900/40">
              <td className="px-4 py-1.5 font-mono text-neutral-400">{k}</td>
              <td className="px-4 py-1.5 font-mono text-neutral-100 break-all">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Inbox className="mb-3 h-10 w-10 text-neutral-700" />
      <p className="text-sm text-neutral-400">No response yet</p>
      <p className="mt-1 text-xs text-neutral-600">
        Hit <kbd className="rounded border border-neutral-700 bg-neutral-900 px-1 py-0.5 text-[10px]">Send</kbd> or press{" "}
        <kbd className="rounded border border-neutral-700 bg-neutral-900 px-1 py-0.5 text-[10px]">⏎</kbd> in the URL bar
      </p>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center text-xs text-neutral-500">
      <div className="mb-3 h-1 w-32 overflow-hidden rounded-full bg-neutral-900">
        <div className="h-full w-1/3 animate-[loading_1.2s_ease-in-out_infinite] bg-emerald-500" />
      </div>
      Sending request…
      <style>{`@keyframes loading{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}`}</style>
    </div>
  );
}

function ErrorView({ error }: { error: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <AlertTriangle className="mb-3 h-10 w-10 text-rose-500" />
      <p className="text-sm font-medium text-rose-300">Request failed</p>
      <p className="mt-2 max-w-md break-words text-xs text-neutral-400">{error}</p>
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
