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
  pre_request_script?: string | null;
  examples?: RequestExample[];
  captures?: CaptureRule[];
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
  variables?: CollectionVariable[];
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
  pre_request_script?: string | null;
  examples?: RequestExample[];
  captures?: CaptureRule[];
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

  importCollection: (content: string, format?: string) =>
    call<{ collection_id: string; collection_name: string; request_count: number }>(
      "/api/import",
      { method: "POST", body: JSON.stringify({ content, format: format ?? "auto" }) },
    ),

  testgenParse: (input: { content: string; base_url?: string | null }) =>
    call<TestgenParseOutput>("/api/testgen/parse", {
      method: "POST",
      body: JSON.stringify({ content: input.content, base_url: input.base_url ?? null }),
    }),
  testgenGenerate: (input: {
    content: string;
    base_url?: string | null;
    collection_name?: string | null;
    categories: TestgenCategory[];
  }) =>
    call<TestgenGenerateOutput>("/api/testgen/generate", {
      method: "POST",
      body: JSON.stringify({
        content: input.content,
        base_url: input.base_url ?? null,
        collection_name: input.collection_name ?? null,
        categories: input.categories,
      }),
    }),

  generateCode: (input: {
    method: string; url: string; headers: Record<string, string>;
    body: string | null; language: string;
  }) =>
    call<{ language: string; code: string }>("/api/codegen/generate", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  executeScript: (input: {
    script: string;
    variables?: Record<string, string>;
    request?: Record<string, unknown>;
  }) =>
    call<{
      success: boolean;
      variables: Record<string, string>;
      logs: string[];
      error: string | null;
      duration_ms: number;
    }>("/api/scripts/execute", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  kafkaTopics: (bootstrap_servers: string) =>
    call<{ topics: Array<{ name: string; partitions: number }> }>("/api/kafka/topics", {
      method: "POST",
      body: JSON.stringify({ bootstrap_servers }),
    }),
  kafkaProduce: (input: {
    bootstrap_servers: string; topic: string;
    key: string | null; value: string; headers: Record<string, string>;
  }) =>
    call<{ topic: string; partition: number; offset: number; timestamp: number }>("/api/kafka/produce", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  kafkaConsume: (input: {
    bootstrap_servers: string; topic: string;
    max_messages?: number; timeout_seconds?: number; group_id?: string;
  }) =>
    call<{
      messages: Array<{
        topic: string; partition: number; offset: number;
        key: string | null; value: string; timestamp: number;
        headers: Record<string, string>;
      }>;
      count: number;
    }>("/api/kafka/consume", {
      method: "POST",
      body: JSON.stringify(input),
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

  // ---- Multipart ----------------------------------------------------------
  executeMultipart: (input: ExecuteMultipartInput) =>
    call<ExecuteResponse>("/api/requests/execute-multipart", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // ---- OAuth2 -------------------------------------------------------------
  oauth2Token: (input: OAuth2TokenInput) =>
    call<OAuth2TokenOutput>("/api/auth/oauth2/token", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // ---- gRPC ---------------------------------------------------------------
  grpcReflect: (host: string) =>
    call<GrpcReflectOutput>("/api/grpc/reflect", {
      method: "POST",
      body: JSON.stringify({ host }),
    }),
  grpcInvoke: (input: GrpcInvokeInput) =>
    call<GrpcInvokeOutput>("/api/grpc/invoke", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // ---- Mock server --------------------------------------------------------
  mockStart: (input: MockStartInput) =>
    call<MockStartOutput>("/api/mock/start", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  mockStop: (port: number) =>
    call<{ status: string; port: string }>("/api/mock/stop", {
      method: "POST",
      body: JSON.stringify({ port }),
    }),
  mockStatus: () => call<MockStatusOutput>("/api/mock/status"),

  // ---- Request chaining ---------------------------------------------------
  executeChain: (input: ExecuteWithCapturesInput) =>
    call<ExecuteWithCapturesResponse>("/api/requests/execute-chain", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // ---- Load testing -------------------------------------------------------
  loadTest: (input: LoadTestInput) =>
    call<LoadTestResult>("/api/loadtest/run", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // ---- Request duplication ------------------------------------------------
  duplicateRequest: (collectionId: string, requestId: string) =>
    call<StoredCollection>(
      `/api/collections/${collectionId}/requests/${requestId}/duplicate`,
      { method: "POST" },
    ),

  // ---- Collection variables -----------------------------------------------
  updateCollectionVariables: (collectionId: string, variables: CollectionVariable[]) =>
    call<StoredCollection>(`/api/collections/${collectionId}/variables`, {
      method: "PATCH",
      body: JSON.stringify({ variables }),
    }),

  // ---- Advanced lifecycle tools ------------------------------------------
  openApiImport: (input: OpenApiImportInput) =>
    call<OpenApiImportOutput>("/api/advanced/openapi/import", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  openApiExport: (collectionId: string) =>
    call<OpenApiExportOutput>(`/api/advanced/openapi/export/${collectionId}`),
  validateContract: (input: ContractValidateInput) =>
    call<ContractValidateOutput>("/api/advanced/contracts/validate", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  detectContractDrift: (input: ContractDriftInput) =>
    call<ContractDriftOutput>("/api/advanced/contracts/drift", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateRequestExamples: (collectionId: string, requestId: string, examples: RequestExampleInput[]) =>
    call<StoredCollection>(
      `/api/advanced/collections/${collectionId}/requests/${requestId}/examples`,
      { method: "PATCH", body: JSON.stringify({ examples }) },
    ),
  listSecrets: () => call<VaultListOutput>("/api/advanced/secrets"),
  writeSecret: (name: string, input: VaultWriteInput) =>
    call<VaultEntrySummary>(`/api/advanced/secrets/${encodeURIComponent(name)}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  revealSecret: (name: string, passphrase: string) =>
    call<VaultRevealOutput>(`/api/advanced/secrets/${encodeURIComponent(name)}/reveal`, {
      method: "POST",
      body: JSON.stringify({ passphrase }),
    }),
  deleteSecret: async (name: string) => {
    const baseUrl = await getSidecarBaseUrl();
    const r = await fetch(`${baseUrl}/api/advanced/secrets/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
    if (!r.ok && r.status !== 204) throw new Error(`delete secret ${r.status}`);
  },
  inspectVariables: (input: VariableInspectInput) =>
    call<VariableInspectOutput>("/api/advanced/variables/inspect", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  dependencyGraph: (collectionId: string) =>
    call<DependencyGraphOutput>(`/api/advanced/collections/${collectionId}/dependency-graph`),
  diffJson: (input: JsonDiffInput) =>
    call<JsonDiffOutput>("/api/advanced/diff/json", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  saveSnapshot: (name: string, input: SnapshotWriteInput) =>
    call<{ name: string; status: string }>(`/api/advanced/snapshots/${encodeURIComponent(name)}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  compareSnapshot: (name: string, input: SnapshotCompareInput) =>
    call<SnapshotCompareOutput>(`/api/advanced/snapshots/${encodeURIComponent(name)}/compare`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  runFlow: (input: FlowRunInput) =>
    call<FlowRunOutput>("/api/advanced/flows/run", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  importHar: (input: HarImportInput) =>
    call<HarImportOutput>("/api/advanced/har/import", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  exportHar: (collectionId: string) =>
    call<Record<string, unknown>>(`/api/advanced/har/export/${collectionId}`),
  inspectTls: (input: TlsInspectInput) =>
    call<TlsInspectOutput>("/api/advanced/tls/inspect", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  proxyStart: (input: ProxyStartInput) =>
    call<ProxyStartOutput>("/api/advanced/proxy/start", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  proxyStatus: () => call<ProxyStatusOutput>("/api/advanced/proxy/status"),
  proxyStop: (sessionId: string) =>
    call<{ status: string; session_id: string }>(`/api/advanced/proxy/${sessionId}/stop`, {
      method: "POST",
    }),
  proxyHar: (sessionId: string) =>
    call<Record<string, unknown>>(`/api/advanced/proxy/${sessionId}/har`),
  mockStartFromCollection: (collectionId: string, port?: number) =>
    call<MockStartOutput>(
      `/api/advanced/mock/start-from-collection/${collectionId}${port ? `?port=${port}` : ""}`,
      { method: "POST" },
    ),
  gitReview: (repoPath: string) =>
    call<GitReviewOutput>("/api/advanced/git/review", {
      method: "POST",
      body: JSON.stringify({ repo_path: repoPath }),
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

// ---- Multipart types ------------------------------------------------------

export interface FormField {
  key: string;
  value: string;
  is_file: boolean;
  filename?: string;
  content_type?: string;
}

export interface ExecuteMultipartInput {
  method: ExecuteRequestInput["method"];
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  fields: FormField[];
  auth?: AuthConfig | null;
  timeout_seconds?: number;
  follow_redirects?: boolean;
  environment_id?: string | null;
}

// ---- OAuth2 types ---------------------------------------------------------

export interface OAuth2TokenInput {
  token_url: string;
  client_id: string;
  client_secret?: string;
  code: string;
  redirect_uri?: string;
  scope?: string;
  grant_type?: string;
}

export interface OAuth2TokenOutput {
  access_token: string;
  token_type: string;
  expires_in: number | null;
  refresh_token: string | null;
  scope: string | null;
  raw: Record<string, unknown>;
}

// ---- gRPC types -----------------------------------------------------------

export interface GrpcService {
  name: string;
  methods: string[];
}

export interface GrpcReflectOutput {
  services: GrpcService[];
}

export interface GrpcInvokeInput {
  host: string;
  service: string;
  method: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, string>;
  timeout_seconds?: number;
}

export interface GrpcInvokeOutput {
  ok: boolean;
  result: unknown;
  error: string | null;
  elapsed_ms: number;
}

// ---- Mock server types ----------------------------------------------------

export interface MockRoute {
  path: string;
  method?: string;
  status?: number;
  headers?: Record<string, string>;
  body?: string;
  content_type?: string;
}

export interface MockStartInput {
  routes: MockRoute[];
  port?: number;
}

export interface MockStartOutput {
  port: number;
  route_count: number;
}

export interface MockServerInfo {
  port: number;
  route_count: number;
}

export interface MockStatusOutput {
  servers: MockServerInfo[];
}

// ---- Request chaining types -----------------------------------------------

export interface CaptureRule {
  name: string;
  source: "body" | "header" | "status";
  path?: string;
}

export interface ExecuteWithCapturesInput {
  method: ExecuteRequestInput["method"];
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: string | null;
  auth?: AuthConfig | null;
  timeout_seconds?: number;
  follow_redirects?: boolean;
  environment_id?: string | null;
  captures: CaptureRule[];
}

export interface ExecuteWithCapturesResponse {
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body: string;
  body_size_bytes: number;
  elapsed_ms: number;
  timing?: TimingBreakdown | null;
  final_url: string;
  resolved_url?: string | null;
  captured_values: Record<string, string>;
}

// ---- Load test types ------------------------------------------------------

export interface LoadTestInput {
  url: string;
  method?: ExecuteRequestInput["method"];
  headers?: Record<string, string>;
  body?: string | null;
  concurrency?: number;
  duration_seconds?: number;
  rps_limit?: number | null;
}

export interface LoadTestResult {
  total_requests: number;
  successful: number;
  failed: number;
  error_count: number;
  avg_latency_ms: number;
  min_latency_ms: number;
  max_latency_ms: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  actual_rps: number;
  duration_seconds: number;
  errors: Record<string, number>;
}

// ---- Collection variables type -------------------------------------------

export interface CollectionVariable {
  name: string;
  value: string;
  enabled: boolean;
}

// ---- Advanced lifecycle types --------------------------------------------

export interface RequestExample {
  id: string;
  name: string;
  method: ExecuteRequestInput["method"];
  url: string;
  headers: Record<string, string>;
  body?: string | null;
  auth?: AuthConfig | null;
  notes?: string | null;
}

export type RequestExampleInput = Omit<RequestExample, "id"> & { id?: string | null };

export interface OpenApiImportInput {
  content: string;
  format?: "auto" | "json" | "yaml";
  collection_name?: string | null;
  base_url?: string | null;
}

export interface OpenApiImportOutput {
  collection_id: string;
  collection_name: string;
  request_count: number;
}

export interface OpenApiExportOutput {
  openapi: Record<string, unknown>;
}

export interface ContractValidateInput {
  openapi_content: string;
  method: ExecuteRequestInput["method"];
  path: string;
  status?: number;
  headers?: Record<string, string>;
  body?: string;
}

export interface ContractViolation {
  path: string;
  message: string;
}

export interface ContractValidateOutput {
  passed: boolean;
  operation_id?: string | null;
  expected_statuses: string[];
  violations: ContractViolation[];
}

export interface ObservedResponse {
  method: ExecuteRequestInput["method"];
  path: string;
  status: number;
  body?: string;
  headers?: Record<string, string>;
}

export interface ContractDriftInput {
  openapi_content: string;
  collection_id?: string | null;
  observed?: ObservedResponse[];
}

export interface ContractDriftOutput {
  missing_in_collection: string[];
  undocumented_requests: string[];
  failing_observations: ContractValidateOutput[];
  passed_observations: number;
}

export interface VaultEntrySummary {
  name: string;
  updated_at: string;
}

export interface VaultListOutput {
  entries: VaultEntrySummary[];
}

export interface VaultWriteInput {
  passphrase: string;
  value: string;
}

export interface VaultRevealOutput {
  name: string;
  value: string;
}

export interface VariableInspectInput {
  text: string;
  environment_id?: string | null;
  collection_id?: string | null;
  runtime?: Record<string, string>;
}

export interface VariableResolution {
  name: string;
  source: "runtime" | "environment" | "collection" | "global" | "builtin" | "unresolved";
  value?: string | null;
  resolved: boolean;
}

export interface VariableInspectOutput {
  resolved_text: string;
  variables: VariableResolution[];
}

export interface DependencyNode {
  id: string;
  name: string;
  produces: string[];
  consumes: string[];
}

export interface DependencyEdge {
  from_id: string;
  to_id: string;
  variable: string;
}

export interface DependencyGraphOutput {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  unresolved_variables: string[];
}

export interface JsonDiffInput {
  left: string;
  right: string;
  ignore_paths?: string[];
  unordered_arrays?: boolean;
}

export interface JsonDifference {
  path: string;
  kind: "added" | "removed" | "changed";
  left?: unknown;
  right?: unknown;
}

export interface JsonDiffOutput {
  equal: boolean;
  differences: JsonDifference[];
}

export interface SnapshotWriteInput {
  value: string;
  metadata?: Record<string, string>;
}

export interface SnapshotCompareInput {
  value: string;
  ignore_paths?: string[];
  unordered_arrays?: boolean;
}

export interface SnapshotCompareOutput {
  exists: boolean;
  diff?: JsonDiffOutput | null;
}

export interface FlowStep {
  id?: string | null;
  name?: string;
  method?: ExecuteRequestInput["method"];
  url: string;
  headers?: Record<string, string>;
  body?: string | null;
  auth?: AuthConfig | null;
  assertions?: Assertion[];
  captures?: CaptureRule[];
  timeout_seconds?: number;
}

export interface FlowRunInput {
  environment_id?: string | null;
  dataset?: Record<string, string>[];
  steps: FlowStep[];
  cleanup_steps?: FlowStep[];
}

export interface FlowStepResult {
  step_id: string;
  name: string;
  status?: number | null;
  elapsed_ms: number;
  error?: string | null;
  captured_values: Record<string, string>;
  assertion_results: AssertionResult[];
}

export interface FlowTraceEvent {
  dataset_index: number;
  step_id: string;
  phase: "request" | "assertions" | "capture" | "cleanup";
  started_at: string;
  ended_at: string;
  elapsed_ms: number;
  status?: number | null;
  error?: string | null;
}

export interface FlowDatasetResult {
  index: number;
  runtime: Record<string, string>;
  steps: FlowStepResult[];
  cleanup: FlowStepResult[];
}

export interface FlowRunOutput {
  datasets: FlowDatasetResult[];
  trace: FlowTraceEvent[];
  passed_assertions: number;
  failed_assertions: number;
}

export interface HarImportInput {
  content: string;
  collection_name?: string;
}

export interface HarImportOutput {
  collection_id: string;
  request_count: number;
}

export interface TlsInspectInput {
  url: string;
  timeout_seconds?: number;
}

export interface TlsInspectOutput {
  host: string;
  port: number;
  subject: Record<string, string>;
  issuer: Record<string, string>;
  not_before?: string | null;
  not_after?: string | null;
  san: string[];
  tls_version?: string | null;
  cipher?: string | null;
}

export interface ProxyStartInput {
  target_base_url: string;
  port?: number | null;
}

export interface ProxyStartOutput {
  session_id: string;
  port: number;
  target_base_url: string;
}

export interface ProxyStatusOutput {
  sessions: ProxyStartOutput[];
}

export interface GitReviewChange {
  file: string;
  summary: string;
  details: string[];
}

export interface GitReviewOutput {
  changes: GitReviewChange[];
}

// ---- Testgen types -------------------------------------------------------

export type TestgenCategory = "is_alive" | "smoke" | "regression";

export interface TestgenOperationSummary {
  method: string;
  path: string;
  summary: string;
  has_path_params: boolean;
  has_request_body: boolean;
}

export interface TestgenParseOutput {
  kind: "openapi" | "wsdl" | "unknown";
  service_name: string;
  base_url: string;
  operations: TestgenOperationSummary[];
  expected_counts: Record<string, number>;
}

export interface TestgenGenerateOutput {
  collection_id: string;
  collection_name: string;
  counts: Record<string, number>;
}
