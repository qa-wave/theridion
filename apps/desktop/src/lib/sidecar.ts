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
  environment_id?: string | null;
}

export interface ExecuteResponse {
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body: string;
  body_size_bytes: number;
  elapsed_ms: number;
  final_url: string;
  resolved_url?: string | null;
}

export interface EnvVariable {
  name: string;
  value: string;
  enabled: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvVariable[];
}

export interface EnvironmentSummary {
  id: string;
  name: string;
  variable_count: number;
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

/** Tree node — either a folder (`is_folder=true`, has child items) or a request. */
export interface CollectionItem {
  id: string;
  name: string;
  is_folder: boolean;
  // request fields (when is_folder=false)
  method?: ExecuteRequestInput["method"];
  url?: string;
  headers?: Record<string, string>;
  body?: string | null;
  // folder field (when is_folder=true)
  items?: CollectionItem[];
}

/** Back-compat alias used in older code paths. */
export type SavedRequest = CollectionItem;

export interface StoredCollection {
  id: string;
  name: string;
  version: number;
  items: CollectionItem[];
}

export interface CollectionSummary {
  id: string;
  name: string;
  request_count: number;
}

export interface SaveRequestInput {
  id?: string;
  name: string;
  method: ExecuteRequestInput["method"];
  url: string;
  headers?: Record<string, string>;
  body?: string | null;
  parent_folder_id?: string | null;
}

export interface CreateFolderInput {
  name: string;
  parent_folder_id?: string | null;
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
  createFolder: (collectionId: string, body: CreateFolderInput) =>
    call<StoredCollection>(`/api/collections/${collectionId}/folders`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteFolder: (collectionId: string, folderId: string) =>
    call<StoredCollection>(
      `/api/collections/${collectionId}/folders/${folderId}`,
      { method: "DELETE" },
    ),

  listEnvironments: () => call<EnvironmentSummary[]>("/api/environments"),
  getEnvironment: (id: string) => call<Environment>(`/api/environments/${id}`),
  createEnvironment: (name: string) =>
    call<Environment>("/api/environments", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  renameEnvironment: (id: string, name: string) =>
    call<Environment>(`/api/environments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  replaceEnvironmentVariables: (id: string, variables: EnvVariable[]) =>
    call<Environment>(`/api/environments/${id}/variables`, {
      method: "PUT",
      body: JSON.stringify({ variables }),
    }),
  deleteEnvironment: (id: string) =>
    fetch(`${sidecarBaseUrl}/api/environments/${id}`, { method: "DELETE" }).then(
      (r) => {
        if (!r.ok && r.status !== 204) throw new Error(`delete env ${r.status}`);
      },
    ),

  inspectWsdl: (wsdl_url: string) =>
    call<WsdlSummary>("/api/soap/inspect", {
      method: "POST",
      body: JSON.stringify({ wsdl_url }),
    }),
  executeSoap: (input: SoapExecuteInput) =>
    call<SoapExecuteOutput>("/api/soap/execute", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};

// ---- SOAP types ---------------------------------------------------------

export interface SoapOperation {
  name: string;
  soap_action: string | null;
  documentation: string | null;
}

export interface SoapPort {
  name: string;
  binding: string;
  address: string | null;
  operations: SoapOperation[];
}

export interface SoapService {
  name: string;
  ports: SoapPort[];
}

export interface WsdlSummary {
  target_namespace: string | null;
  services: SoapService[];
}

export interface SoapExecuteInput {
  wsdl_url: string;
  operation: string;
  args: Record<string, unknown>;
}

export interface SoapExecuteOutput {
  ok: boolean;
  result: unknown;
  fault: string | null;
}
