import { useState } from "react";
import type { Assertion, AssertionResult, AuthConfig } from "../state/types";
import { CodeEditor } from "./CodeEditor";

type Tab = "params" | "headers" | "body" | "auth" | "tests";

const TABS: { id: Tab; label: string; comingSoon?: boolean }[] = [
  { id: "params", label: "Params" },
  { id: "headers", label: "Headers" },
  { id: "body", label: "Body" },
  { id: "auth", label: "Auth" },
  { id: "tests", label: "Tests" },
];

interface Props {
  url: string;
  headersRaw: string;
  body: string;
  auth: AuthConfig;
  assertions: Assertion[];
  assertionResults: AssertionResult[] | null;
  onUrlChange: (u: string) => void;
  onHeadersChange: (h: string) => void;
  onBodyChange: (b: string) => void;
  onAuthChange: (a: AuthConfig) => void;
  onAssertionsChange: (a: Assertion[]) => void;
}

export function RequestPanel({
  url,
  headersRaw,
  body,
  auth,
  assertions,
  assertionResults,
  onUrlChange,
  onHeadersChange,
  onBodyChange,
  onAuthChange,
  onAssertionsChange,
}: Props) {
  const [tab, setTab] = useState<Tab>("params");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-px border-b border-glass px-2">
        {TABS.map((t) => {
          const active = tab === t.id;
          const count = t.id === "headers" ? countHeaders(headersRaw) : undefined;
          const badge = t.id === "auth" && auth.type !== "none";
          const testCount = t.id === "tests" ? assertions.length : undefined;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => !t.comingSoon && setTab(t.id)}
              disabled={t.comingSoon}
              className={`relative px-3 py-2 text-xs font-medium transition ${
                t.comingSoon
                  ? "cursor-not-allowed text-neutral-600"
                  : active
                  ? "text-neutral-100"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {t.label}
              {typeof count === "number" && count > 0 && (
                <span className="ml-1 text-neutral-500">{count}</span>
              )}
              {typeof testCount === "number" && testCount > 0 && (
                <span className="ml-1 text-neutral-500">{testCount}</span>
              )}
              {badge && (
                <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              )}
              {active && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-cobweb-500 to-emerald-500" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {tab === "params" && <ParamsView url={url} onUrlChange={onUrlChange} />}
        {tab === "headers" && (
          <HeadersView value={headersRaw} onChange={onHeadersChange} />
        )}
        {tab === "body" && <BodyView value={body} onChange={onBodyChange} />}
        {tab === "auth" && <AuthView value={auth} onChange={onAuthChange} />}
        {tab === "tests" && (
          <TestsView
            assertions={assertions}
            results={assertionResults}
            onChange={onAssertionsChange}
          />
        )}
      </div>
    </div>
  );
}

function ParamsView({ url, onUrlChange }: { url: string; onUrlChange: (u: string) => void }) {
  const parsed = parseQueryParams(url);
  function setParam(idx: number, field: "key" | "value", val: string) {
    const next = parsed.params.slice();
    next[idx] = { ...next[idx], [field]: val };
    onUrlChange(buildUrl(parsed.base, next));
  }
  function addParam() {
    onUrlChange(buildUrl(parsed.base, [...parsed.params, { key: "", value: "" }]));
  }
  function delParam(idx: number) {
    const next = parsed.params.slice();
    next.splice(idx, 1);
    onUrlChange(buildUrl(parsed.base, next));
  }
  return (
    <div>
      <p className="mb-2 text-[11px] uppercase tracking-wider text-neutral-500">Query parameters</p>
      <div className="overflow-hidden rounded border border-neutral-800">
        <table className="w-full text-xs">
          <thead className="bg-neutral-900/60 text-neutral-500">
            <tr>
              <th className="w-1/3 px-3 py-1.5 text-left font-medium">Name</th>
              <th className="px-3 py-1.5 text-left font-medium">Value</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {parsed.params.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-3 text-center text-neutral-600">
                  No query parameters
                </td>
              </tr>
            )}
            {parsed.params.map((p, idx) => (
              <tr key={idx} className="border-t border-neutral-800">
                <td>
                  <input
                    value={p.key}
                    onChange={(e) => setParam(idx, "key", e.target.value)}
                    placeholder="name"
                    className="w-full bg-transparent px-3 py-1.5 font-mono text-xs focus:outline-none"
                    spellCheck={false}
                  />
                </td>
                <td>
                  <input
                    value={p.value}
                    onChange={(e) => setParam(idx, "value", e.target.value)}
                    placeholder="value"
                    className="w-full bg-transparent px-3 py-1.5 font-mono text-xs focus:outline-none"
                    spellCheck={false}
                  />
                </td>
                <td className="text-center">
                  <button
                    type="button"
                    onClick={() => delParam(idx)}
                    className="rounded p-1 text-neutral-600 transition hover:bg-neutral-800 hover:text-rose-400"
                    title="Remove"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addParam}
        className="mt-2 text-xs text-emerald-500 hover:text-emerald-400"
      >
        + Add parameter
      </button>
    </div>
  );
}

function HeadersView({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-[11px] uppercase tracking-wider text-neutral-500">
        Headers <span className="ml-1 text-neutral-600 normal-case">— one per line: Name: value</span>
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Accept: application/json&#10;Authorization: Bearer …"
        rows={14}
        className="w-full resize-y rounded border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-xs text-neutral-100 placeholder-neutral-600 focus:border-neutral-600 focus:outline-none"
        spellCheck={false}
      />
    </div>
  );
}

function BodyView({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="mb-2 text-[11px] uppercase tracking-wider text-neutral-500">Body</p>
      <div className="min-h-[280px] flex-1 overflow-hidden rounded border border-neutral-800 bg-neutral-900">
        <CodeEditor
          value={value}
          onChange={onChange}
          placeholder='{"hello":"world"}'
        />
      </div>
    </div>
  );
}

const AUTH_TYPES = [
  { value: "none", label: "No Auth" },
  { value: "bearer", label: "Bearer Token" },
  { value: "basic", label: "Basic Auth" },
  { value: "apikey", label: "API Key" },
] as const;

function AuthView({
  value,
  onChange,
}: {
  value: AuthConfig;
  onChange: (a: AuthConfig) => void;
}) {
  const inputClass =
    "w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-1.5 font-mono text-xs text-neutral-100 placeholder-neutral-600 focus:border-neutral-600 focus:outline-none";

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[11px] uppercase tracking-wider text-neutral-500">Type</p>
        <select
          value={value.type}
          onChange={(e) =>
            onChange({ type: e.target.value as AuthConfig["type"] })
          }
          className="rounded border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-100 focus:border-neutral-600 focus:outline-none"
        >
          {AUTH_TYPES.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      {value.type === "bearer" && (
        <div>
          <label className="mb-1 block text-[11px] uppercase tracking-wider text-neutral-500">
            Token
          </label>
          <input
            type="text"
            value={value.token ?? ""}
            onChange={(e) => onChange({ ...value, token: e.target.value })}
            placeholder="{{token}}"
            className={inputClass}
            spellCheck={false}
          />
        </div>
      )}

      {value.type === "basic" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-neutral-500">
              Username
            </label>
            <input
              type="text"
              value={value.username ?? ""}
              onChange={(e) => onChange({ ...value, username: e.target.value })}
              placeholder="{{username}}"
              className={inputClass}
              spellCheck={false}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-neutral-500">
              Password
            </label>
            <input
              type="password"
              value={value.password ?? ""}
              onChange={(e) => onChange({ ...value, password: e.target.value })}
              placeholder="{{password}}"
              className={inputClass}
              spellCheck={false}
            />
          </div>
        </div>
      )}

      {value.type === "apikey" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-neutral-500">
                Key
              </label>
              <input
                type="text"
                value={value.key ?? ""}
                onChange={(e) => onChange({ ...value, key: e.target.value })}
                placeholder="X-API-Key"
                className={inputClass}
                spellCheck={false}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-neutral-500">
                Value
              </label>
              <input
                type="text"
                value={value.value ?? ""}
                onChange={(e) => onChange({ ...value, value: e.target.value })}
                placeholder="{{api_key}}"
                className={inputClass}
                spellCheck={false}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-neutral-500">
              Add to
            </label>
            <select
              value={value.add_to ?? "header"}
              onChange={(e) =>
                onChange({
                  ...value,
                  add_to: e.target.value as "header" | "query",
                })
              }
              className="rounded border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-100 focus:border-neutral-600 focus:outline-none"
            >
              <option value="header">Header</option>
              <option value="query">Query Parameter</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

const ASSERTION_TYPES: { value: Assertion["type"]; label: string }[] = [
  { value: "status", label: "Status code" },
  { value: "response_time", label: "Response time (ms)" },
  { value: "json_path", label: "JSON path" },
  { value: "header_exists", label: "Header exists" },
  { value: "header_equals", label: "Header equals" },
  { value: "body_contains", label: "Body contains" },
  { value: "body_regex", label: "Body matches regex" },
];

function TestsView({
  assertions,
  results,
  onChange,
}: {
  assertions: Assertion[];
  results: AssertionResult[] | null;
  onChange: (a: Assertion[]) => void;
}) {
  const inputClass =
    "w-full rounded border border-neutral-800 bg-neutral-900 px-2 py-1 font-mono text-xs text-neutral-100 placeholder-neutral-600 focus:border-neutral-600 focus:outline-none";

  function addAssertion() {
    onChange([
      ...assertions,
      { type: "status", expected: "200", path: "", operator: "eq" },
    ]);
  }

  function updateAssertion(idx: number, patch: Partial<Assertion>) {
    const next = assertions.map((a, i) =>
      i === idx ? { ...a, ...patch } : a,
    );
    onChange(next);
  }

  function removeAssertion(idx: number) {
    onChange(assertions.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-neutral-500">
          Assertions
          {results && (
            <span className="ml-2 normal-case">
              <span className="text-emerald-400">{results.filter((r) => r.passed).length} passed</span>
              {results.some((r) => !r.passed) && (
                <span className="ml-1 text-rose-400">
                  {results.filter((r) => !r.passed).length} failed
                </span>
              )}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={addAssertion}
          className="text-xs text-emerald-500 hover:text-emerald-400"
        >
          + Add assertion
        </button>
      </div>

      {assertions.length === 0 && (
        <p className="py-4 text-center text-xs text-neutral-600">
          No assertions yet. Add one to test your API responses.
        </p>
      )}

      {assertions.map((a, idx) => {
        const result = results?.[idx];
        return (
          <div
            key={idx}
            className={`rounded border p-2 ${
              result
                ? result.passed
                  ? "border-emerald-800/50 bg-emerald-950/20"
                  : "border-rose-800/50 bg-rose-950/20"
                : "border-neutral-800"
            }`}
          >
            <div className="flex items-start gap-2">
              <select
                value={a.type}
                onChange={(e) =>
                  updateAssertion(idx, { type: e.target.value as Assertion["type"] })
                }
                className="shrink-0 rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 focus:outline-none"
              >
                {ASSERTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              {(a.type === "json_path" || a.type === "header_exists" || a.type === "header_equals") && (
                <input
                  value={a.path}
                  onChange={(e) => updateAssertion(idx, { path: e.target.value })}
                  placeholder={a.type === "json_path" ? "data.items[0].name" : "Content-Type"}
                  className={inputClass}
                  spellCheck={false}
                />
              )}

              {a.type === "json_path" && (
                <select
                  value={a.operator}
                  onChange={(e) => updateAssertion(idx, { operator: e.target.value })}
                  className="shrink-0 rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 focus:outline-none"
                >
                  <option value="eq">equals</option>
                  <option value="neq">not equals</option>
                  <option value="gt">&gt;</option>
                  <option value="lt">&lt;</option>
                  <option value="gte">&gt;=</option>
                  <option value="lte">&lt;=</option>
                  <option value="contains">contains</option>
                  <option value="exists">exists</option>
                </select>
              )}

              {a.type !== "header_exists" && !(a.type === "json_path" && a.operator === "exists") && (
                <input
                  value={a.expected}
                  onChange={(e) => updateAssertion(idx, { expected: e.target.value })}
                  placeholder={
                    a.type === "status"
                      ? "200"
                      : a.type === "response_time"
                        ? "1000"
                        : "expected value"
                  }
                  className={inputClass}
                  spellCheck={false}
                />
              )}

              <button
                type="button"
                onClick={() => removeAssertion(idx)}
                className="shrink-0 rounded p-1 text-neutral-600 transition hover:bg-neutral-800 hover:text-rose-400"
              >
                ×
              </button>
            </div>
            {result && (
              <p className={`mt-1 text-[11px] ${result.passed ? "text-emerald-400" : "text-rose-400"}`}>
                {result.passed ? "✓" : "✗"} {result.message}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function countHeaders(raw: string): number {
  return raw
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes(":")).length;
}

function parseQueryParams(url: string): {
  base: string;
  params: { key: string; value: string }[];
} {
  const idx = url.indexOf("?");
  if (idx === -1) return { base: url, params: [] };
  const base = url.slice(0, idx);
  const qs = url.slice(idx + 1);
  const params = qs
    .split("&")
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf("=");
      if (eq === -1) return { key: decodeURIComponent(part), value: "" };
      return {
        key: decodeURIComponent(part.slice(0, eq)),
        value: decodeURIComponent(part.slice(eq + 1)),
      };
    });
  return { base, params };
}

function buildUrl(base: string, params: { key: string; value: string }[]): string {
  const usable = params.filter((p) => p.key.length > 0);
  if (usable.length === 0) return base;
  const qs = usable
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join("&");
  return `${base}?${qs}`;
}
