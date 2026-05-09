/**
 * Sidecar client.
 *
 * In dev, the Python FastAPI server is started separately via
 *   THERIDION_PORT=8765 uv run python -m theridion_sidecar.main
 * and the frontend talks to it on localhost:8765 (override via
 * VITE_SIDECAR_URL if needed).
 *
 * In production we'll spawn the bundled Python via Tauri's sidecar feature
 * and read the port off stdout — that wiring lives in src-tauri.
 */

const DEFAULT_DEV_URL = "http://127.0.0.1:8765";

export const sidecarBaseUrl: string =
  (import.meta.env.VITE_SIDECAR_URL as string | undefined) ?? DEFAULT_DEV_URL;

export interface HealthResponse {
  status: string;
  version: string;
  uptime_seconds: number;
}

export interface ExecuteRequestInput {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: string | null;
  timeout_seconds?: number;
  follow_redirects?: boolean;
}

export interface ExecuteResponse {
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body: string;
  body_size_bytes: number;
  elapsed_ms: number;
  final_url: string;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${sidecarBaseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail: string;
    try {
      const j = (await res.json()) as { detail?: unknown };
      detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j);
    } catch {
      detail = await res.text();
    }
    throw new Error(`sidecar ${res.status}: ${detail}`);
  }
  return (await res.json()) as T;
}

export interface SavedRequest {
  id: string;
  name: string;
  method: ExecuteRequestInput["method"];
  url: string;
  headers: Record<string, string>;
  body: string | null;
}

export interface StoredCollection {
  id: string;
  name: string;
  version: number;
  items: SavedRequest[];
}

export interface CollectionSummary {
  id: string;
  name: string;
  request_count: number;
}

export interface SaveRequestInput {
  /** Server assigns when omitted, replaces in place when provided. */
  id?: string;
  name: string;
  method: ExecuteRequestInput["method"];
  url: string;
  headers?: Record<string, string>;
  body?: string | null;
}

export const sidecar = {
  health: () => call<HealthResponse>("/api/health"),
  execute: (input: ExecuteRequestInput) =>
    call<ExecuteResponse>("/api/requests/execute", {
      method: "POST",
      body: JSON.stringify({
        timeout_seconds: 30,
        follow_redirects: true,
        ...input,
      }),
    }),
  listCollections: () => call<CollectionSummary[]>("/api/collections"),
  getCollection: (id: string) => call<StoredCollection>(`/api/collections/${id}`),
  createCollection: (name: string) =>
    call<StoredCollection>("/api/collections", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  deleteCollection: (id: string) =>
    fetch(`${sidecarBaseUrl}/api/collections/${id}`, { method: "DELETE" }).then(
      (r) => {
        if (!r.ok && r.status !== 204) throw new Error(`delete ${r.status}`);
      },
    ),
  saveRequest: (collectionId: string, body: SaveRequestInput) =>
    call<StoredCollection>(`/api/collections/${collectionId}/requests`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteRequest: (collectionId: string, requestId: string) =>
    call<StoredCollection>(
      `/api/collections/${collectionId}/requests/${requestId}`,
      { method: "DELETE" },
    ),
};
