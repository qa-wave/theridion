import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Clock,
  Hash,
  ShieldCheck,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import type { StoredCollection } from "../lib/sidecar";

interface Props {
  open: boolean;
  onClose: () => void;
  collection: StoredCollection | null;
}

interface LastResponse {
  status: number;
  elapsed_ms: number;
  preview: string;
  timestamp: number;
}

interface FlatRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  hasAssertions: boolean;
  lastResponse: LastResponse | null;
}

function flattenRequests(
  items: StoredCollection["items"],
  responses: Record<string, LastResponse>,
): FlatRequest[] {
  const result: FlatRequest[] = [];
  for (const item of items) {
    if (item.is_folder) {
      result.push(...flattenRequests(item.items ?? [], responses));
    } else {
      result.push({
        id: item.id,
        name: item.name,
        method: item.method ?? "GET",
        url: item.url ?? "",
        hasAssertions: (item.assertions?.length ?? 0) > 0,
        lastResponse: responses[item.id] ?? null,
      });
    }
  }
  return result;
}

function MethodBar({ method, count, total }: { method: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const colors: Record<string, string> = {
    GET: "bg-emerald-500",
    POST: "bg-cobweb-500",
    PUT: "bg-amber-500",
    PATCH: "bg-violet-500",
    DELETE: "bg-rose-500",
    HEAD: "bg-neutral-500",
    OPTIONS: "bg-cyan-500",
  };
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-14 font-mono text-neutral-400">{method}</span>
      <div className="flex-1 h-3 rounded-full bg-neutral-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${colors[method] ?? "bg-neutral-600"}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <span className="w-8 text-right text-neutral-500">{count}</span>
    </div>
  );
}

export function CollectionStatsModal({ open, onClose, collection }: Props) {
  const [responses, setResponses] = useState<Record<string, LastResponse>>({});

  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("theridion.last-responses") ?? "{}",
      ) as Record<string, LastResponse>;
      setResponses(stored);
    } catch {
      setResponses({});
    }
  }, [open]);

  const stats = useMemo(() => {
    if (!collection) return null;

    const flat = flattenRequests(collection.items, responses);
    const total = flat.length;

    // Method breakdown
    const methodCounts: Record<string, number> = {};
    for (const r of flat) {
      methodCounts[r.method] = (methodCounts[r.method] ?? 0) + 1;
    }

    // Response stats
    const withResponses = flat.filter((r) => r.lastResponse !== null);
    const avgTime =
      withResponses.length > 0
        ? withResponses.reduce((s, r) => s + (r.lastResponse?.elapsed_ms ?? 0), 0) /
          withResponses.length
        : 0;

    // Status code breakdown
    const statusCounts: Record<number, number> = {};
    for (const r of withResponses) {
      const st = r.lastResponse!.status;
      statusCounts[st] = (statusCounts[st] ?? 0) + 1;
    }

    // Pass/fail
    const passed = withResponses.filter((r) => r.lastResponse!.status < 400).length;
    const failed = withResponses.length - passed;

    // Slowest endpoints
    const slowest = [...withResponses]
      .sort((a, b) => (b.lastResponse?.elapsed_ms ?? 0) - (a.lastResponse?.elapsed_ms ?? 0))
      .slice(0, 5);

    // Assertion coverage
    const withAssertions = flat.filter((r) => r.hasAssertions).length;

    return {
      total,
      methodCounts,
      avgTime,
      statusCounts,
      passed,
      failed,
      testedCount: withResponses.length,
      slowest,
      withAssertions,
    };
  }, [collection, responses]);

  if (!open || !collection || !stats) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-xl rounded-xl border border-glass bg-neutral-900/95 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-glass px-5 py-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-cobweb-400" />
            <h2 className="text-sm font-semibold text-neutral-100">
              Collection Statistics: {collection.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-lg border border-glass bg-neutral-800/50 p-3 text-center">
              <Hash className="mx-auto h-4 w-4 text-cobweb-400 mb-1" />
              <div className="text-lg font-bold text-neutral-100">{stats.total}</div>
              <div className="text-[10px] text-neutral-500">Total Requests</div>
            </div>
            <div className="rounded-lg border border-glass bg-neutral-800/50 p-3 text-center">
              <Clock className="mx-auto h-4 w-4 text-amber-400 mb-1" />
              <div className="text-lg font-bold text-neutral-100">
                {stats.avgTime > 0 ? `${Math.round(stats.avgTime)}ms` : "--"}
              </div>
              <div className="text-[10px] text-neutral-500">Avg Response</div>
            </div>
            <div className="rounded-lg border border-glass bg-neutral-800/50 p-3 text-center">
              <TrendingUp className="mx-auto h-4 w-4 text-emerald-400 mb-1" />
              <div className="text-lg font-bold text-neutral-100">
                {stats.testedCount > 0
                  ? `${Math.round((stats.passed / stats.testedCount) * 100)}%`
                  : "--"}
              </div>
              <div className="text-[10px] text-neutral-500">Pass Rate</div>
            </div>
            <div className="rounded-lg border border-glass bg-neutral-800/50 p-3 text-center">
              <ShieldCheck className="mx-auto h-4 w-4 text-violet-400 mb-1" />
              <div className="text-lg font-bold text-neutral-100">
                {stats.total > 0
                  ? `${Math.round((stats.withAssertions / stats.total) * 100)}%`
                  : "--"}
              </div>
              <div className="text-[10px] text-neutral-500">Has Assertions</div>
            </div>
          </div>

          {/* Method breakdown */}
          <div>
            <h3 className="mb-2 text-xs font-semibold text-neutral-400">Methods</h3>
            <div className="space-y-1.5">
              {Object.entries(stats.methodCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([method, count]) => (
                  <MethodBar key={method} method={method} count={count} total={stats.total} />
                ))}
            </div>
          </div>

          {/* Status codes */}
          {Object.keys(stats.statusCounts).length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold text-neutral-400">Status Codes</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.statusCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => {
                    const s = Number(status);
                    const color =
                      s >= 500
                        ? "border-rose-700/40 bg-rose-500/10 text-rose-400"
                        : s >= 400
                          ? "border-amber-700/40 bg-amber-500/10 text-amber-400"
                          : s >= 300
                            ? "border-cobweb-700/40 bg-cobweb-500/10 text-cobweb-400"
                            : "border-emerald-700/40 bg-emerald-500/10 text-emerald-400";
                    return (
                      <span
                        key={status}
                        className={`rounded-md border px-2 py-0.5 text-xs font-mono ${color}`}
                      >
                        {status} x{count}
                      </span>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Slowest endpoints */}
          {stats.slowest.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-neutral-400">
                <Zap className="h-3 w-3" />
                Slowest Endpoints
              </h3>
              <div className="space-y-1">
                {stats.slowest.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-md border border-glass bg-neutral-800/30 px-3 py-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-cobweb-400">{r.method}</span>
                      <span className="truncate text-neutral-300">{r.name}</span>
                    </div>
                    <span className="shrink-0 font-mono text-amber-400">
                      {Math.round(r.lastResponse?.elapsed_ms ?? 0)}ms
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pass / Fail */}
          {stats.testedCount > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold text-neutral-400">Pass / Fail</h3>
              <div className="flex h-4 overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="bg-emerald-500"
                  style={{ width: `${(stats.passed / stats.testedCount) * 100}%` }}
                />
                <div
                  className="bg-rose-500"
                  style={{ width: `${(stats.failed / stats.testedCount) * 100}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-neutral-500">
                <span className="text-emerald-400">{stats.passed} passed</span>
                <span className="text-rose-400">{stats.failed} failed</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
