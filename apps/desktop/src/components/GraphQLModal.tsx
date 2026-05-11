import { useState } from "react";
import { Braces, Loader2, Play, Search, X } from "lucide-react";
import {
  sidecar,
  type GraphQLResponse,
  type IntrospectOutput,
} from "../lib/sidecar";
import { CodeEditor } from "./CodeEditor";

interface Props {
  open: boolean;
  onClose: () => void;
  activeEnvId: string | null;
}

const DEFAULT_QUERY = `query {
  __typename
}`;

export function GraphQLModal({ open, onClose, activeEnvId }: Props) {
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [variables, setVariables] = useState("{}");
  const [headers, setHeaders] = useState("{}");
  const [response, setResponse] = useState<GraphQLResponse | null>(null);
  const [schema, setSchema] = useState<IntrospectOutput | null>(null);
  const [busy, setBusy] = useState<"none" | "run" | "introspect">("none");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"response" | "schema">("response");

  if (!open) return null;

  function parseJsonSafe(s: string): Record<string, unknown> {
    try { return JSON.parse(s); } catch { return {}; }
  }

  async function runQuery() {
    if (!url.trim() || !query.trim()) return;
    setBusy("run");
    setError(null);
    try {
      const res = await sidecar.executeGraphQL({
        url: url.trim(),
        query,
        variables: parseJsonSafe(variables),
        headers: parseJsonSafe(headers) as Record<string, string>,
        environment_id: activeEnvId,
      });
      setResponse(res);
      setActiveTab("response");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("none");
    }
  }

  async function introspect() {
    if (!url.trim()) return;
    setBusy("introspect");
    setError(null);
    try {
      const res = await sidecar.introspectGraphQL(
        url.trim(),
        parseJsonSafe(headers) as Record<string, string>,
        activeEnvId,
      );
      setSchema(res);
      setActiveTab("schema");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("none");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="glass flex h-[700px] w-[1080px] max-h-[90vh] max-w-[95vw] animate-slide-in flex-col overflow-hidden rounded-xl border border-glass-light shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-glass px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-100">
            <Braces className="h-4 w-4 text-cobweb-400" />
            GraphQL
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-neutral-500 transition hover:bg-white/[0.05] hover:text-neutral-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* URL bar */}
        <div className="flex items-center gap-2 border-b border-glass px-4 py-2.5">
          <span className="shrink-0 rounded bg-pink-600/20 px-2 py-0.5 text-[10px] font-bold text-pink-300">
            GQL
          </span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com/graphql"
            className="flex-1 rounded-md border border-glass bg-neutral-900/50 px-3 py-1.5 font-mono text-xs text-neutral-100 placeholder-neutral-600 focus:border-cobweb-500/40 focus:outline-none"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={introspect}
            disabled={busy !== "none" || !url.trim()}
            className="inline-flex items-center gap-1.5 rounded-md border border-glass px-3 py-1.5 text-xs text-neutral-400 transition hover:bg-white/[0.04] hover:text-neutral-200 disabled:opacity-40"
          >
            {busy === "introspect" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Schema
          </button>
          <button
            type="button"
            onClick={runQuery}
            disabled={busy !== "none" || !url.trim() || !query.trim()}
            className="bg-accent-gradient inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium text-white shadow-glow-sm transition disabled:opacity-40 disabled:shadow-none"
          >
            {busy === "run" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Run
          </button>
        </div>

        {/* Main content */}
        <div className="flex min-h-0 flex-1">
          {/* Left — query + variables */}
          <div className="flex w-1/2 flex-col border-r border-glass">
            <div className="border-b border-glass px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
              Query
            </div>
            <div className="min-h-0 flex-1">
              <CodeEditor value={query} onChange={setQuery} language="plaintext" placeholder="query { ... }" />
            </div>
            <div className="border-t border-glass px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
              Variables
            </div>
            <div className="h-28 shrink-0 overflow-hidden">
              <CodeEditor value={variables} onChange={setVariables} language="json" placeholder="{}" />
            </div>
            <div className="border-t border-glass px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
              Headers
            </div>
            <div className="h-20 shrink-0 overflow-hidden">
              <CodeEditor value={headers} onChange={setHeaders} language="json" placeholder='{"Authorization": "Bearer ..."}' />
            </div>
          </div>

          {/* Right — response / schema */}
          <div className="flex w-1/2 flex-col">
            <div className="flex items-center gap-px border-b border-glass px-2">
              <TabBtn active={activeTab === "response"} onClick={() => setActiveTab("response")}>
                Response
                {response && (
                  <span className={`ml-1.5 text-[10px] ${response.errors ? "text-rose-400" : "text-emerald-400"}`}>
                    {response.status}
                  </span>
                )}
              </TabBtn>
              <TabBtn active={activeTab === "schema"} onClick={() => setActiveTab("schema")}>
                Schema
                {schema && <span className="ml-1.5 text-[10px] text-neutral-500">{schema.types.length}</span>}
              </TabBtn>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              {error && (
                <div className="m-3 rounded-md border border-rose-800/30 bg-rose-950/20 px-3 py-2 text-xs text-rose-400">
                  {error}
                </div>
              )}

              {activeTab === "response" && (
                response ? (
                  <div className="h-full">
                    <div className="flex items-center gap-3 border-b border-glass px-4 py-2 text-xs">
                      <span className={`font-mono font-bold ${response.errors ? "text-rose-400" : "text-emerald-400"}`}>
                        {response.status}
                      </span>
                      <span className="text-neutral-500">{response.elapsed_ms.toFixed(0)} ms</span>
                      {response.errors && (
                        <span className="text-rose-400">{response.errors.length} error{response.errors.length > 1 ? "s" : ""}</span>
                      )}
                    </div>
                    <div className="h-[calc(100%-36px)]">
                      <CodeEditor
                        value={JSON.stringify(response.data ?? response.errors, null, 2)}
                        language="json"
                        readOnly
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-xs text-neutral-600">
                    <Braces className="mb-2 h-8 w-8 text-neutral-800" />
                    Run a query to see results
                  </div>
                )
              )}

              {activeTab === "schema" && (
                schema ? (
                  <SchemaExplorer schema={schema} />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-xs text-neutral-600">
                    <Search className="mb-2 h-8 w-8 text-neutral-800" />
                    Click Schema to introspect
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-3 py-2 text-xs font-medium transition ${active ? "text-neutral-100" : "text-neutral-400 hover:text-neutral-200"}`}
    >
      {children}
      {active && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent-gradient-bar" aria-hidden />}
    </button>
  );
}

function SchemaExplorer({ schema }: { schema: IntrospectOutput }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  const roots = [schema.query_type, schema.mutation_type, schema.subscription_type].filter(Boolean);

  return (
    <div className="p-3 text-xs">
      {roots.length > 0 && (
        <div className="mb-3 flex gap-2">
          {schema.query_type && <RootBadge label="Query" name={schema.query_type} />}
          {schema.mutation_type && <RootBadge label="Mutation" name={schema.mutation_type} />}
          {schema.subscription_type && <RootBadge label="Subscription" name={schema.subscription_type} />}
        </div>
      )}
      <div className="space-y-0.5">
        {schema.types.map((t) => (
          <div key={t.name}>
            <button
              type="button"
              onClick={() => toggle(t.name)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition hover:bg-white/[0.03]"
            >
              <KindBadge kind={t.kind} />
              <span className="font-mono font-medium text-neutral-200">{t.name}</span>
              {t.fields.length > 0 && (
                <span className="text-neutral-600">{t.fields.length} fields</span>
              )}
            </button>
            {expanded.has(t.name) && t.fields.length > 0 && (
              <div className="ml-6 border-l border-glass pl-3 py-1 space-y-0.5">
                {t.fields.map((f: Record<string, unknown>) => (
                  <div key={String(f.name)} className="flex items-baseline gap-2 py-0.5">
                    <span className="font-mono text-cobweb-400">{String(f.name)}</span>
                    <span className="text-neutral-600">:</span>
                    <span className="font-mono text-neutral-400">{formatType(f.type as Record<string, unknown>)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RootBadge({ label, name }: { label: string; name: string }) {
  return (
    <span className="rounded-md border border-glass px-2 py-0.5 text-[10px]">
      <span className="text-neutral-500">{label}:</span>{" "}
      <span className="font-mono text-cobweb-300">{name}</span>
    </span>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const colors: Record<string, string> = {
    OBJECT: "text-cobweb-400 bg-cobweb-950",
    INPUT_OBJECT: "text-amber-400 bg-amber-950",
    ENUM: "text-violet-400 bg-violet-950",
    SCALAR: "text-neutral-400 bg-neutral-800",
    INTERFACE: "text-sky-400 bg-sky-950",
    UNION: "text-pink-400 bg-pink-950",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${colors[kind] ?? "text-neutral-500 bg-neutral-800"}`}>
      {kind.slice(0, 3)}
    </span>
  );
}

function formatType(t: Record<string, unknown> | null): string {
  if (!t) return "?";
  const name = t.name as string | null;
  const kind = t.kind as string;
  const ofType = t.ofType as Record<string, unknown> | null;
  if (kind === "NON_NULL") return `${formatType(ofType)}!`;
  if (kind === "LIST") return `[${formatType(ofType)}]`;
  return name ?? "?";
}
