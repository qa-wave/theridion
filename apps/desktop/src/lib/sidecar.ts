/**
 * Sidecar client.
 *
 * Resolution order for the sidecar URL:
 *   1. `VITE_SIDECAR_URL` build-time env override — used by Playwright
 *      tests (which spawn their own sidecar on a non-default port) and
 *      by anyone running the app in a regular browser tab.
 *   2. Tauri command `get_sidecar_port` — when the desktop shell spawned
 *      the bundled sidecar binary, this is the source of truth. We poll
 *      it on first call and also subscribe to the `sidecar://ready`
 *      event so the resolution finishes the moment the binary is up
 *      (cold start of the --onefile bundle is ~8 s).
 *   3. Dev fallback `http://127.0.0.1:8765` — when neither of the above
 *      is available (developer running `pnpm dev` without Tauri and
 *      without VITE_SIDECAR_URL), assume a sidecar started by hand on
 *      the default dev port.
 */

const DEV_FALLBACK_URL = "http://127.0.0.1:8765";

interface TauriWindow extends Window {
  __TAURI_INTERNALS__?: unknown;
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in (window as TauriWindow);
}

let _urlPromise: Promise<string> | null = null;

/** Returns the sidecar's base URL, awaiting Tauri's port handshake when needed. */
export function getSidecarBaseUrl(): Promise<string> {
  if (_urlPromise) return _urlPromise;
  _urlPromise = resolveSidecarBaseUrl();
  return _urlPromise;
}

async function resolveSidecarBaseUrl(): Promise<string> {
  const fromEnv = import.meta.env.VITE_SIDECAR_URL as string | undefined;
  if (fromEnv) return fromEnv;

  if (!isTauri()) return DEV_FALLBACK_URL;

  const [{ invoke }, { listen }] = await Promise.all([
    import("@tauri-apps/api/core"),
    import("@tauri-apps/api/event"),
  ]);

  const port = await invoke<number | null>("get_sidecar_port").catch(() => null);
  if (typeof port === "number") return `http://127.0.0.1:${port}`;

  // Wait for the ready event. The sidecar's --onefile cold start can take
  // up to ~10 s; we don't impose a timeout here so the UI's "connecting…"
  // state simply lingers rather than throwing.
  return new Promise<string>((resolve) => {
    void listen<number>("sidecar://ready", (event) => {
      resolve(`http://127.0.0.1:${event.payload}`);
    });
  });
}


export interface HealthResponse {
  status: string;
  version: string;
  uptime_seconds: number;
}

export type AuthType = "none" | "bearer" | "basic" | "apikey";

export interface AuthConfig {
  type: AuthType;
  // Bearer
  token?: string;
  // Basic
  username?: string;
  password?: string;
  // API Key
  key?: string;
  value?: string;
  add_to?: "header" | "query";
}

export interface ExecuteRequestInput {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: string | null;
  auth?: AuthConfig | null;
  timeout_seconds?: number;
  follow_redirects?: boolean;
  environment_id?: string | null;
}

export interface TimingBreakdown {
  dns_ms: number;
  connect_ms: number;
  tls_ms: number;
  transfer_ms: number;
  total_ms: number;
}

export interface ExecuteResponse {
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body: string;
  body_size_bytes: number;
  elapsed_ms: number;
  timing?: TimingBreakdown | null;
  final_url: string;
  resolved_url?: string | null;
  cookies?: Record<string, string>;
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
  const baseUrl = await getSidecarBaseUrl();
  const res = await fetch(`${baseUrl}${path}`, {
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
  auth?: AuthConfig | null;
  assertions?: Assertion[];
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
  auth?: AuthConfig | null;
  assertions?: Assertion[];
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
  deleteCollection: async (id: string) => {
    const baseUrl = await getSidecarBaseUrl();
    const r = await fetch(`${baseUrl}/api/collections/${id}`, { method: "DELETE" });
    if (!r.ok && r.status !== 204) throw new Error(`delete ${r.status}`);
  },
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
  renameCollection: (collectionId: string, name: string) =>
    call<StoredCollection>(`/api/collections/${collectionId}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  renameItem: (collectionId: string, itemId: string, name: string) =>
    call<StoredCollection>(
      `/api/collections/${collectionId}/items/${itemId}/rename`,
      { method: "PATCH", body: JSON.stringify({ name }) },
    ),
  moveItem: (collectionId: string, itemId: string, targetFolderId: string | null) =>
    call<StoredCollection>(
      `/api/collections/${collectionId}/items/${itemId}/move`,
      { method: "PATCH", body: JSON.stringify({ target_folder_id: targetFolderId }) },
    ),
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
  deleteEnvironment: async (id: string) => {
    const baseUrl = await getSidecarBaseUrl();
    const r = await fetch(`${baseUrl}/api/environments/${id}`, {
      method: "DELETE",
    });
    if (!r.ok && r.status !== 204) throw new Error(`delete env ${r.status}`);
  },

  evaluateAssertions: (input: {
    assertions: Assertion[];
    response: { status: number; headers: Record<string, string>; body: string; elapsed_ms: number };
  }) =>
    call<AssertionEvalOutput>("/api/assertions/evaluate", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  parseCurl: (curl: string) =>
    call<ParsedCurl>("/api/curl/parse", {
      method: "POST",
      body: JSON.stringify({ curl }),
    }),
  generateCurl: (input: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string | null;
    auth?: AuthConfig | null;
  }) =>
    call<{ curl: string }>("/api/curl/generate", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  executeGraphQL: (input: GraphQLExecuteInput) =>
    call<GraphQLResponse>("/api/graphql/execute", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  introspectGraphQL: (url: string, headers?: Record<string, string>, environment_id?: string | null) =>
    call<IntrospectOutput>("/api/graphql/introspect", {
      method: "POST",
      body: JSON.stringify({ url, headers: headers ?? {}, environment_id }),
    }),

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

// ---- Assertion types ----------------------------------------------------

export type AssertionType =
  | "status"
  | "response_time"
  | "json_path"
  | "header_exists"
  | "header_equals"
  | "body_contains"
  | "body_regex";

export interface Assertion {
  type: AssertionType;
  expected: string;
  path: string;
  operator: string;
}

export interface AssertionResult {
  assertion: Assertion;
  passed: boolean;
  message: string;
}

export interface AssertionEvalOutput {
  results: AssertionResult[];
  passed: number;
  failed: number;
  total: number;
}

// ---- GraphQL types ------------------------------------------------------

export interface GraphQLExecuteInput {
  url: string;
  query: string;
  variables?: Record<string, unknown>;
  operation_name?: string;
  headers?: Record<string, string>;
  environment_id?: string | null;
}

export interface GraphQLResponse {
  data: unknown;
  errors: Array<{ message: string; [key: string]: unknown }> | null;
  status: number;
  elapsed_ms: number;
  raw_body: string;
}

export interface GraphQLType {
  name: string;
  kind: string;
  description: string | null;
  fields: Array<Record<string, unknown>>;
}

export interface IntrospectOutput {
  types: GraphQLType[];
  query_type: string | null;
  mutation_type: string | null;
  subscription_type: string | null;
}

// ---- cURL types ---------------------------------------------------------

export interface ParsedCurl {
  method: ExecuteRequestInput["method"];
  url: string;
  headers: Record<string, string>;
  body: string | null;
  auth: AuthConfig | null;
}

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
