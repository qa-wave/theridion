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
  collection_id?: string | null;
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
  getGlobals: () =>
    call<{ variables: Array<{ name: string; value: string; enabled: boolean }> }>("/api/globals"),
  putGlobals: (variables: Array<{ name: string; value: string; enabled: boolean }>) =>
    call<{ variables: Array<{ name: string; value: string; enabled: boolean }> }>("/api/globals", {
      method: "PUT",
      body: JSON.stringify({ variables }),
    }),
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

  // ---- Service Map -------------------------------------------------------
  getServiceMap: () => call<ServiceGraph>("/api/servicemap"),
  saveServiceMap: (graph: ServiceGraph) =>
    call<ServiceGraph>("/api/servicemap", { method: "PUT", body: JSON.stringify(graph) }),
  discoverServices: () => call<ServiceGraph>("/api/servicemap/discover", { method: "POST" }),
  addServiceNode: (node: { label: string; url?: string; x?: number; y?: number; color?: string }) =>
    call<ServiceGraph>("/api/servicemap/nodes", { method: "POST", body: JSON.stringify(node) }),
  deleteServiceNode: (nodeId: string) =>
    call<ServiceGraph>(`/api/servicemap/nodes/${nodeId}`, { method: "DELETE" }),
  addServiceEdge: (edge: { source: string; target: string; label?: string }) =>
    call<ServiceGraph>("/api/servicemap/edges", { method: "POST", body: JSON.stringify(edge) }),
  deleteServiceEdge: (edgeId: string) =>
    call<ServiceGraph>(`/api/servicemap/edges/${edgeId}`, { method: "DELETE" }),

  // ---- API Docs ----------------------------------------------------------
  parseApiDoc: (input: { content?: string; url?: string }) =>
    call<ApiDocOutput>("/api/apidocs/parse", { method: "POST", body: JSON.stringify(input) }),

  // ---- Timeline ----------------------------------------------------------
  recordTimeline: (input: { request_id: string; status: number; body: string; headers: Record<string, string>; elapsed_ms: number }) =>
    call<TimelineOutput>("/api/timeline/record", { method: "POST", body: JSON.stringify(input) }),
  getTimeline: (requestId: string) => call<TimelineOutput>(`/api/timeline/${requestId}`),

  // ---- Workspace ---------------------------------------------------------
  exportWorkspace: () => getSidecarBaseUrl().then((base) => `${base}/api/workspace/export`),

  // ---- Schema Validation -------------------------------------------------
  validateSchema: (body: string, schema: string) =>
    call<SchemaValidateOutput>("/api/schema/validate", {
      method: "POST",
      body: JSON.stringify({ body, schema }),
    }),

  // ---- Env Diff ----------------------------------------------------------
  compareEnvs: (leftId: string, rightId: string) =>
    call<EnvDiffOutput>("/api/envdiff/compare", {
      method: "POST",
      body: JSON.stringify({ left_id: leftId, right_id: rightId }),
    }),

  // ---- Favorites ---------------------------------------------------------
  listFavorites: () => call<{ items: FavoriteItem[] }>("/api/favorites"),
  addFavorite: (fav: FavoriteItem) =>
    call<{ items: FavoriteItem[] }>("/api/favorites", { method: "POST", body: JSON.stringify(fav) }),
  removeFavorite: (collectionId: string, requestId: string) =>
    call<{ items: FavoriteItem[] }>(`/api/favorites/${collectionId}/${requestId}`, { method: "DELETE" }),

  // ---- Batch Runner ------------------------------------------------------
  runBatch: (input: { collection_id: string; environment_id?: string; dataset: Array<Record<string, string>>; dataset_csv?: string }) =>
    call<BatchOutput>("/api/batch/run", { method: "POST", body: JSON.stringify(input) }),

  // ---- AI ----------------------------------------------------------------
  aiSettings: () =>
    call<{ provider: string; ollama_base_url: string; ollama_model: string }>("/api/ai/settings"),
  updateAiSettings: (settings: { provider: string; ollama_base_url: string; ollama_model: string }) =>
    call<{ provider: string; ollama_base_url: string; ollama_model: string }>("/api/ai/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
  aiPing: () => call<{ ok: boolean; version?: string; error?: string }>("/api/ai/ping"),
  aiModels: () => call<{ models: Array<{ name: string; size: number }> }>("/api/ai/models"),
  aiTestGen: (input: {
    method: string; url: string; headers: Record<string, string>;
    request_body: string | null; response_status: number;
    response_headers: Record<string, string>; response_body: string;
    category: string;
  }) =>
    call<{ assertions: Array<{ type: string; expected: string; path: string; operator: string }>; explanation: string }>(
      "/api/ai/testgen",
      { method: "POST", body: JSON.stringify(input) },
    ),

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

  // ---- Response & Analysis --------------------------------------------------
  responseTrends: (input: { request_id: string; max_snapshots?: number }) =>
    call<ResponseTrendsResult>("/api/analysis/response-trends", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  securityAudit: (headers: Record<string, string>) =>
    call<SecurityAuditResult>("/api/analysis/security-audit", {
      method: "POST",
      body: JSON.stringify({ headers }),
    }),
  sslInspect: (input: { hostname: string; port?: number }) =>
    call<SslInspectResult>("/api/analysis/ssl-inspect", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  dnsInspect: (hostname: string) =>
    call<DnsInspectResult>("/api/analysis/dns-inspect", {
      method: "POST",
      body: JSON.stringify({ hostname }),
    }),
  compressionStats: (input: { url: string; headers?: Record<string, string> }) =>
    call<CompressionResult>("/api/analysis/compression", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  redirectChain: (input: { url: string; max_hops?: number; headers?: Record<string, string> }) =>
    call<RedirectChainResult>("/api/analysis/redirect-chain", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  contentTypeValidator: (input: { content_type: string; body: string }) =>
    call<ContentTypeResult>("/api/analysis/content-type", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // ---- Performance Testing --------------------------------------------------
  loadTestPattern: (input: PatternLoadTestInput) =>
    call<PatternLoadTestResult>("/api/loadtest/run-pattern", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  latencyHistogram: (input: { latency_ms: number[]; buckets?: number }) =>
    call<LatencyHistogramResult>("/api/analysis/latency-histogram", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  throughputTimeline: (entries: Array<{ timestamp: number; latency_ms: number; success: boolean }>) =>
    call<ThroughputTimelineResult>("/api/analysis/throughput-timeline", {
      method: "POST",
      body: JSON.stringify({ entries }),
    }),
  connectionStats: (input: { url: string; num_requests?: number; headers?: Record<string, string> }) =>
    call<ConnectionStatsResult>("/api/analysis/connection-stats", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  simulateUsers: (input: UserSimulationInput) =>
    call<UserSimulationResult>("/api/loadtest/simulate-users", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  slaCheck: (input: SlaCheckInput) =>
    call<SlaCheckResult>("/api/analysis/sla-check", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  compareRuns: (input: { left: RunStats; right: RunStats }) =>
    call<CompareRunsResult>("/api/analysis/compare-runs", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // ---- Integration Testing --------------------------------------------------
  flowVisualize: (nodes: Array<{ name: string; depends_on: string[] }>) =>
    call<FlowGraphResult>("/api/flows/visualize", {
      method: "POST",
      body: JSON.stringify({ nodes }),
    }),
  retryTest: (input: RetryTestInput) =>
    call<RetryTestResult>("/api/test/retry", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  rateLimitDetect: (input: { url: string; method?: string; headers?: Record<string, string>; max_requests?: number }) =>
    call<RateLimitResult>("/api/test/ratelimit", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  idempotencyCheck: (input: { url: string; method?: string; headers?: Record<string, string>; body?: string | null }) =>
    call<IdempotencyResult>("/api/test/idempotency", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  paginationWalker: (input: PaginationInput) =>
    call<PaginationResult>("/api/test/pagination", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  contractDriftCheck: (input: { current_body: string; baseline_body: string }) =>
    call<ContractDriftCheckResult>("/api/test/contract-drift", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  multiEnvRun: (input: { collection_id: string; environment_ids: string[] }) =>
    call<MultiEnvResult>("/api/test/multi-env", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  generateFake: (type: string, count?: number) =>
    call<{ values: string[] }>(`/api/generate/fake?type=${type}&count=${count ?? 1}`),

  // ---- Observability & Debugging --------------------------------------------
  waterfall: (input: { url: string; method?: string; headers?: Record<string, string>; body?: string | null }) =>
    call<WaterfallResult>("/api/analysis/waterfall", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  logCurl: (input: { method: string; url: string; headers?: Record<string, string>; body?: string | null }) =>
    call<CurlLogEntry>("/api/log/curl", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  getCurlLog: (limit?: number) =>
    call<CurlLogResult>(`/api/log/curl?limit=${limit ?? 50}`),
  mockDiff: (input: MockDiffInput) =>
    call<MockDiffResult>("/api/analysis/mock-diff", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  errorPatterns: (entries: Array<{ timestamp: number; url: string; status: number; error?: string | null }>) =>
    call<ErrorPatternsResult>("/api/analysis/error-patterns", {
      method: "POST",
      body: JSON.stringify({ entries }),
    }),
  computeDashboard: (input: DashboardInput) =>
    call<DashboardResult>("/api/dashboard/compute", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // ---- Security Testing -----------------------------------------------------
  jwtInspect: (token: string) =>
    call<JwtInspectResult>("/api/security/jwt-inspect", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  autoRefreshToken: (input: TokenRefreshInput) =>
    call<TokenRefreshResult>("/api/auth/auto-refresh", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  corsTest: (input: { url: string; origin?: string }) =>
    call<CorsTestResult>("/api/security/cors-test", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  injectionScan: (input: { url: string; method?: string; params: Record<string, string>; headers?: Record<string, string> }) =>
    call<InjectionScanResult>("/api/security/injection-scan", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  sensitiveScan: (input: { body: string; headers?: Record<string, string> }) =>
    call<SensitiveDataResult>("/api/security/sensitive-scan", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // ---- Request Examples ---------------------------------------------------
  listExamples: (collectionId: string, requestId: string) =>
    call<Array<{ id: string; name: string; method: string; url: string; headers: Record<string, string>; body: string | null; notes: string | null }>>(
      `/api/collections/${collectionId}/requests/${requestId}/examples`,
    ),
  addExample: (collectionId: string, requestId: string, example: {
    name: string; method?: string; url?: string; headers?: Record<string, string>; body?: string | null; notes?: string | null;
  }) =>
    call<StoredCollection>(`/api/collections/${collectionId}/requests/${requestId}/examples`, {
      method: "POST", body: JSON.stringify(example),
    }),
  deleteExample: (collectionId: string, requestId: string, exampleId: string) =>
    call<StoredCollection>(
      `/api/collections/${collectionId}/requests/${requestId}/examples/${exampleId}`,
      { method: "DELETE" },
    ),

  universalImport: (content: string, filename?: string, format?: string) =>
    call<UniversalImportResult>("/api/import/universal", {
      method: "POST",
      body: JSON.stringify({ content, filename, format: format ?? "auto" }),
    }),

  // ---- WS-Security -----------------------------------------------------------
  wsSecurityExecute: (input: WsSecurityInput) =>
    call<WsSecurityOutput>("/api/soap/ws-security", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // ---- MTOM ------------------------------------------------------------------
  mtomSend: (input: MtomInput) =>
    call<MtomOutput>("/api/soap/mtom", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // ---- WSDL Diff -------------------------------------------------------------
  wsdlDiff: (input: { old_wsdl_url: string; new_wsdl_url: string }) =>
    call<WsdlDiffOutput>("/api/soap/wsdl-diff", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // ---- SOAP Coverage ---------------------------------------------------------
  soapCoverage: (input: { wsdl_url: string; collection_id: string }) =>
    call<SoapCoverageOutput>("/api/soap/coverage", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // ---- JMS (stub) ------------------------------------------------------------
  jmsSend: () => call<StubOutput>("/api/jms/send", { method: "POST" }),
  jmsReceive: () => call<StubOutput>("/api/jms/receive", { method: "POST" }),

  // ---- JDBC ------------------------------------------------------------------
  jdbcQuery: (input: JdbcInput) =>
    call<JdbcOutput>("/api/jdbc/query", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // ---- XSD Validation --------------------------------------------------------
  xsdValidate: (input: { xml: string; xsd: string }) =>
    call<XsdValidateOutput>("/api/soap/xsd-validate", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // ---- WSDL Mock Generator ---------------------------------------------------
  wsdlGenerateMock: (wsdl_url: string) =>
    call<WsdlMockGenOutput>("/api/soap/generate-mock", {
      method: "POST",
      body: JSON.stringify({ wsdl_url }),
    }),

  // ---- MQTT (stub) -----------------------------------------------------------
  mqttConnect: () => call<StubOutput>("/api/mqtt/connect", { method: "POST" }),
  mqttPublish: () => call<StubOutput>("/api/mqtt/publish", { method: "POST" }),
  mqttSubscribe: () => call<StubOutput>("/api/mqtt/subscribe", { method: "POST" }),

  // ---- OAuth 1.0 -------------------------------------------------------------
  oauth1Sign: (input: OAuth1Input) =>
    call<OAuth1Output>("/api/auth/oauth1", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // ---- Visual Test Builder ---------------------------------------------------
  getTestBuilder: (collectionId: string) =>
    call<TestBuilderData>(`/api/test-builder/${collectionId}`),
  putTestBuilder: (collectionId: string, data: TestBuilderData) =>
    call<TestBuilderData>(`/api/test-builder/${collectionId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // ---- Data Loop -------------------------------------------------------------
  dataLoop: (input: DataLoopInput) =>
    call<DataLoopOutput>("/api/test/data-loop", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // ---- Flows -----------------------------------------------------------------
  executeFlowBlocks: (input: FlowBlockExecuteInput) =>
    call<FlowBlockExecuteOutput>("/api/flows/execute", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // ---- Monitors --------------------------------------------------------------
  listMonitors: () => call<MonitorListOutput>("/api/monitors"),
  createMonitor: (input: MonitorConfig) =>
    call<MonitorConfig>("/api/monitors/create", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  deleteMonitor: async (id: string) => {
    const baseUrl = await getSidecarBaseUrl();
    const r = await fetch(`${baseUrl}/api/monitors/${id}`, { method: "DELETE" });
    if (!r.ok) throw new Error(`delete monitor ${r.status}`);
  },

  // ---- Webhooks --------------------------------------------------------------
  listWebhooks: () => call<WebhookListOutput>("/api/webhooks"),
  createWebhook: (input: WebhookConfig) =>
    call<WebhookConfig>("/api/webhooks/create", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  deleteWebhook: async (id: string) => {
    const baseUrl = await getSidecarBaseUrl();
    const r = await fetch(`${baseUrl}/api/webhooks/${id}`, { method: "DELETE" });
    if (!r.ok) throw new Error(`delete webhook ${r.status}`);
  },
  triggerWebhook: (id: string) =>
    call<{ status: string; collection_id: string }>(`/api/webhooks/${id}/trigger`, { method: "POST" }),

  // ---- Body Modes ------------------------------------------------------------
  encodeForm: (fields: Array<{ key: string; value: string; type: string }>) =>
    call<{ encoded_body: string; content_type: string }>("/api/requests/encode-form", {
      method: "POST",
      body: JSON.stringify({ fields }),
    }),

  // ---- Cookie Manager --------------------------------------------------------
  getAllCookies: () => call<CookieManagerList>("/api/cookies/all"),
  deleteCookiesByDomain: async (domain: string) => {
    const baseUrl = await getSidecarBaseUrl();
    const r = await fetch(`${baseUrl}/api/cookies/domain/${domain}`, { method: "DELETE" });
    if (!r.ok) throw new Error(`delete cookies ${r.status}`);
  },
  editCookies: (cookies: CookieManagerEntry[]) =>
    call<CookieManagerList>("/api/cookies/edit", {
      method: "PUT",
      body: JSON.stringify({ cookies }),
    }),

  // ---- Request Console -------------------------------------------------------
  consoleLog: (entries: ConsoleLogEntry[]) =>
    call<{ stored: number }>("/api/console/log", {
      method: "POST",
      body: JSON.stringify({ entries }),
    }),
  consoleEntries: () => call<{ entries: ConsoleLogEntry[]; total: number }>("/api/console/entries"),

  // ---- Visualizer ------------------------------------------------------------
  visualize: (template: string, data: unknown) =>
    call<{ html: string }>("/api/visualize/render", {
      method: "POST",
      body: JSON.stringify({ template, data }),
    }),

  // ---- Terminal --------------------------------------------------------------
  terminalExec: (command: string, cwd?: string) =>
    call<TerminalOutput>("/api/terminal/exec", {
      method: "POST",
      body: JSON.stringify({ command, cwd }),
    }),

  // ---- Keybindings -----------------------------------------------------------
  getKeybindings: () => call<{ bindings: Record<string, string> }>("/api/settings/keybindings"),
  putKeybindings: (bindings: Record<string, string>) =>
    call<{ bindings: Record<string, string> }>("/api/settings/keybindings", {
      method: "PUT",
      body: JSON.stringify({ bindings }),
    }),

  // ---- Collection Docs -------------------------------------------------------
  generateDocs: (collectionId: string) =>
    call<{ markdown: string; html: string }>(`/api/docs/generate/${collectionId}`, { method: "POST" }),

  // ---- API Catalog -----------------------------------------------------------
  listCatalog: () => call<{ entries: CatalogEntry[] }>("/api/catalog"),
  createCatalogEntry: (entry: CatalogEntry) =>
    call<CatalogEntry>("/api/catalog", {
      method: "POST",
      body: JSON.stringify(entry),
    }),
  updateCatalogEntry: (id: string, entry: CatalogEntry) =>
    call<CatalogEntry>(`/api/catalog/${id}`, {
      method: "PUT",
      body: JSON.stringify(entry),
    }),
  deleteCatalogEntry: async (id: string) => {
    const baseUrl = await getSidecarBaseUrl();
    const r = await fetch(`${baseUrl}/api/catalog/${id}`, { method: "DELETE" });
    if (!r.ok) throw new Error(`delete catalog ${r.status}`);
  },

  // ---- API Governance --------------------------------------------------------
  lintSpec: (spec: string) =>
    call<GovernanceOutput>("/api/governance/lint", {
      method: "POST",
      body: JSON.stringify({ spec }),
    }),

  // ---- API Versioning --------------------------------------------------------
  compareVersions: (v1_spec: string, v2_spec: string) =>
    call<VersionDiffOutput>("/api/versioning/compare", {
      method: "POST",
      body: JSON.stringify({ v1_spec, v2_spec }),
    }),

  // ---- OpenAPI Sync ----------------------------------------------------------
  syncOpenapi: (input: { collection_id: string; spec_url: string }) =>
    call<OpenApiSyncOutput>("/api/sync/openapi", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // ---- Collection Branching --------------------------------------------------
  forkCollection: (collectionId: string) =>
    call<ForkOutput>(`/api/collections/${collectionId}/fork`, { method: "POST" }),
  mergeCollection: (collectionId: string, sourceId: string) =>
    call<MergeOutput>(`/api/collections/${collectionId}/merge`, {
      method: "POST",
      body: JSON.stringify({ source_id: sourceId }),
    }),

  // ---- Project Encryption ----------------------------------------------------
  encryptProject: (passphrase: string) =>
    call<{ status: string; files_encrypted: number }>("/api/security/encrypt-project", {
      method: "POST",
      body: JSON.stringify({ passphrase }),
    }),
  decryptProject: (passphrase: string) =>
    call<{ status: string; files_encrypted: number }>("/api/security/decrypt-project", {
      method: "POST",
      body: JSON.stringify({ passphrase }),
    }),

  // ---- Secret Encryption -----------------------------------------------------
  encryptSecretValue: (value: string, passphrase: string) =>
    call<{ encrypted: string; decrypted: string }>("/api/security/encrypt-secret", {
      method: "POST",
      body: JSON.stringify({ value, passphrase }),
    }),
  decryptSecretValue: (value: string, passphrase: string) =>
    call<{ encrypted: string; decrypted: string }>("/api/security/decrypt-secret", {
      method: "POST",
      body: JSON.stringify({ value, passphrase }),
    }),

  // ---- Secret Managers -------------------------------------------------------
  fetchSecretFromProvider: (provider: string, config: Record<string, string>) =>
    call<{ name: string; value: string; error: string | null }>("/api/secrets/fetch", {
      method: "POST",
      body: JSON.stringify({ provider, config }),
    }),

  // ---- PAC Proxy -------------------------------------------------------------
  pacResolve: (pac_content: string, url: string) =>
    call<{ proxy_url: string | null }>("/api/proxy/pac-resolve", {
      method: "POST",
      body: JSON.stringify({ pac_content, url }),
    }),

  // ---- NPM Loader ------------------------------------------------------------
  npmInstallModule: (module_name: string) =>
    call<NpmInstallOutput>("/api/scripts/install-module", {
      method: "POST",
      body: JSON.stringify({ module_name }),
    }),
  npmExecuteWithModules: (script: string, modules: string[]) =>
    call<NpmExecuteOutput>("/api/scripts/execute-with-modules", {
      method: "POST",
      body: JSON.stringify({ script, modules }),
    }),

  // ---- Cookie Scripting ------------------------------------------------------
  cookieScript: (script: string, cookies: Record<string, string>) =>
    call<CookieScriptOutput>("/api/scripts/cookie-api", {
      method: "POST",
      body: JSON.stringify({ script, cookies }),
    }),

  // ---- Groovy (stub) ---------------------------------------------------------
  groovyExecute: () => call<StubOutput>("/api/scripts/groovy", { method: "POST" }),

  // ---- JUnit Reporter --------------------------------------------------------
  generateJunit: (results: JunitTestResult[]) =>
    call<{ xml: string }>("/api/reports/junit", {
      method: "POST",
      body: JSON.stringify({ results }),
    }),

  // ---- CLI Reporters ---------------------------------------------------------
  generateReport: (results: ReportResultItem[], format: string) =>
    call<{ content: string; content_type: string }>("/api/reports/generate", {
      method: "POST",
      body: JSON.stringify({ results, format }),
    }),

  // ---- Team Workspaces -------------------------------------------------------
  listTeamWorkspaces: () => call<{ workspaces: TeamWorkspace[] }>("/api/workspaces"),
  createTeamWorkspace: (workspace: TeamWorkspace) =>
    call<TeamWorkspace>("/api/workspaces", {
      method: "POST",
      body: JSON.stringify(workspace),
    }),
  updateTeamWorkspace: (id: string, workspace: TeamWorkspace) =>
    call<TeamWorkspace>(`/api/workspaces/${id}`, {
      method: "PUT",
      body: JSON.stringify(workspace),
    }),
  deleteTeamWorkspace: async (id: string) => {
    const baseUrl = await getSidecarBaseUrl();
    const r = await fetch(`${baseUrl}/api/workspaces/${id}`, { method: "DELETE" });
    if (!r.ok) throw new Error(`delete workspace ${r.status}`);
  },

  // ---- Integrations ----------------------------------------------------------
  notifyIntegration: (input: { provider: string; url: string; message: string; payload?: Record<string, unknown> }) =>
    call<{ ok: boolean; status_code: number; error: string | null }>("/api/integrations/notify", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // ---- Self-Healing ----------------------------------------------------------
  healAssertion: (input: HealAssertionInput) =>
    call<HealAssertionOutput>("/api/assertions/heal", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // ---- MCP Server ------------------------------------------------------------
  mcpManifest: () => call<McpManifest>("/api/mcp/manifest"),
  mcpInvoke: (tool: string, args: Record<string, unknown>) =>
    call<McpInvokeOutput>("/api/mcp/invoke", {
      method: "POST",
      body: JSON.stringify({ tool, arguments: args }),
    }),

  // ---- Bru Format ------------------------------------------------------------
  toBru: (collection: Record<string, unknown>) =>
    call<{ content: string }>("/api/format/to-bru", {
      method: "POST",
      body: JSON.stringify({ collection }),
    }),
  fromBru: (content: string) =>
    call<{ collection: Record<string, unknown> }>("/api/format/from-bru", {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  // ---- YAML Collections ------------------------------------------------------
  toYaml: (collection: Record<string, unknown>) =>
    call<{ content: string }>("/api/format/to-yaml", {
      method: "POST",
      body: JSON.stringify({ collection }),
    }),
  fromYaml: (content: string) =>
    call<{ collection: Record<string, unknown> }>("/api/format/from-yaml", {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  // ---- Composite Project -----------------------------------------------------
  explodeCollection: (collectionId: string) =>
    call<{ files_created: number; directory: string }>(`/api/format/explode/${collectionId}`, { method: "POST" }),
  implodeCollection: (directory: string) =>
    call<{ collection_id: string; items_loaded: number }>("/api/format/implode", {
      method: "POST",
      body: JSON.stringify({ directory }),
    }),

  // ---- Conversational AI -----------------------------------------------------
  aiChat: (message: string, context?: AiChatContext) =>
    call<AiChatOutput>("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message, context }),
    }),

  // ---- VS Code API -----------------------------------------------------------
  vscodeStatus: () => call<{ status: string; version: string; uptime_seconds: number }>("/api/vscode/status"),
  vscodeCollections: () =>
    call<{ collections: Array<{ id: string; name: string; request_count: number }> }>("/api/vscode/collections"),

  // ---- AMF Protocol (stub) ---------------------------------------------------
  amfInvoke: () => call<StubOutput>("/api/amf/invoke", { method: "POST" }),

  // ---- YAML Projects --------------------------------------------------------
  listProjects: () =>
    call<ProjectSummary[]>("/api/projects"),
  getProject: (name: string) =>
    call<YamlProject>(`/api/projects/${encodeURIComponent(name)}`),
  createProject: (name: string) =>
    call<YamlProject>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  exportToYaml: (collectionId: string) =>
    call<{ project_name: string }>(
      `/api/projects/_/export-from-collection/${collectionId}`,
      { method: "POST" },
    ),
  deleteProject: async (name: string) => {
    const baseUrl = await getSidecarBaseUrl();
    const r = await fetch(`${baseUrl}/api/projects/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
    if (!r.ok && r.status !== 204) throw new Error(`delete project ${r.status}`);
  },

  // ---- OAuth2 PKCE + Callback ------------------------------------------------
  oauth2AuthorizeUrl: (input: OAuth2AuthorizeUrlInput) =>
    call<OAuth2AuthorizeUrlOutput>("/api/auth/oauth2/authorize-url", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  oauth2StartCallback: (port?: number, timeoutSeconds?: number) =>
    call<{ port: number; status: string }>("/api/auth/oauth2/callback-server/start", {
      method: "POST",
      body: JSON.stringify({ port: port ?? 9876, timeout_seconds: timeoutSeconds ?? 300 }),
    }),
  oauth2PollResult: () =>
    call<OAuth2CallbackResult>("/api/auth/oauth2/callback-server/result"),
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

// ---- Service Map types ---------------------------------------------------

export interface ServiceNode {
  id: string; label: string; url: string; x: number; y: number; color: string;
}
export interface ServiceEdge {
  id: string; source: string; target: string; label: string;
}
export interface ServiceGraph {
  nodes: ServiceNode[]; edges: ServiceEdge[];
}

// ---- API Doc types -------------------------------------------------------

export interface ApiDocEndpoint {
  path: string; method: string; summary: string; description: string;
  parameters: Array<Record<string, unknown>>; tags: string[];
}
export interface ApiDocOutput {
  title: string; version: string; description: string; base_url: string;
  endpoints: ApiDocEndpoint[];
}

// ---- Timeline types ------------------------------------------------------

export interface ResponseSnapshot {
  timestamp: number; status: number; body_hash: string; body_preview: string;
  elapsed_ms: number; body_size: number; changes: string[];
}
export interface TimelineOutput {
  request_id: string; snapshots: ResponseSnapshot[];
}

// ---- Schema Validation types ---------------------------------------------

export interface SchemaValidateOutput {
  valid: boolean; errors: Array<{ path: string; message: string }>;
}

// ---- Env Diff types ------------------------------------------------------

export interface EnvDiffOutput {
  left_name: string; right_name: string;
  diffs: Array<{ name: string; left_value: string | null; right_value: string | null; status: string }>;
  total: number; changed: number; added: number; removed: number;
}

// ---- Favorites types -----------------------------------------------------

export interface FavoriteItem {
  collection_id: string; request_id: string; name: string; method: string; url: string;
}

// ---- Batch Runner types --------------------------------------------------

export interface BatchOutput {
  total_rows: number; total_requests: number; total_passed: number;
  total_failed: number; total_errors: number; elapsed_ms: number;
  rows: Array<{
    row_index: number; variables: Record<string, string>;
    request_results: Array<Record<string, unknown>>;
    passed: number; failed: number; errors: number;
  }>;
}

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

// ---- Response Trends types --------------------------------------------------

export interface ResponseTrendsResult {
  sizes: number[];
  timestamps: number[];
  trend: "growing" | "stable" | "shrinking";
}

// ---- Security Audit types ---------------------------------------------------

export interface SecurityAuditFinding {
  header: string;
  status: "pass" | "warn" | "fail";
  message: string;
}

export interface SecurityAuditResult {
  score: number;
  findings: SecurityAuditFinding[];
}

// ---- SSL Inspect types ------------------------------------------------------

export interface SslChainEntry {
  subject: string;
  issuer: string;
}

export interface SslInspectResult {
  subject: string;
  issuer: string;
  not_before: string;
  not_after: string;
  serial: string;
  tls_version: string | null;
  cipher: string | null;
  chain: SslChainEntry[];
  days_until_expiry: number;
}

// ---- DNS Inspect types ------------------------------------------------------

export interface DnsAddress {
  ip: string;
  family: string;
}

export interface DnsInspectResult {
  hostname: string;
  addresses: DnsAddress[];
  resolved_in_ms: number;
}

// ---- Compression types ------------------------------------------------------

export interface CompressionResult {
  encoding: string | null;
  wire_size: number;
  decoded_size: number;
  ratio: number;
  compressed: boolean;
}

// ---- Redirect Chain types ---------------------------------------------------

export interface RedirectHop {
  status: number;
  url: string;
  elapsed_ms: number;
  headers: Record<string, string>;
}

export interface RedirectChainResult {
  hops: RedirectHop[];
  total_hops: number;
  total_ms: number;
}

// ---- Content Type Validator types -------------------------------------------

export interface ContentTypeResult {
  declared: string;
  detected: string;
  match: boolean;
  details: string;
}

// ---- Load Test Pattern types ------------------------------------------------

export interface PatternLoadTestInput {
  url: string;
  method?: ExecuteRequestInput["method"];
  headers?: Record<string, string>;
  body?: string | null;
  ramp_pattern?: "linear" | "step" | "spike" | "soak";
  max_concurrency?: number;
  duration_seconds?: number;
}

export interface LoadTestPhase {
  name: string;
  concurrency: number;
  duration_s: number;
  rps: number;
}

export interface PatternLoadTestResult {
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
  pattern: string;
  phases: LoadTestPhase[];
}

// ---- Latency Histogram types ------------------------------------------------

export interface HistogramBucket {
  min: number;
  max: number;
  count: number;
}

export interface LatencyHistogramResult {
  buckets: HistogramBucket[];
  total: number;
  mean: number;
  stddev: number;
}

// ---- Throughput Timeline types ----------------------------------------------

export interface ThroughputWindow {
  timestamp: number;
  rps: number;
  avg_latency: number;
  error_count: number;
}

export interface ThroughputTimelineResult {
  windows: ThroughputWindow[];
}

// ---- Connection Stats types -------------------------------------------------

export interface ConnectionStatsResult {
  total_requests: number;
  connections_opened: number;
  reuse_rate: number;
  avg_latency_ms: number;
}

// ---- User Simulation types --------------------------------------------------

export interface UserSimulationInput {
  url: string;
  method?: ExecuteRequestInput["method"];
  headers?: Record<string, string>;
  body?: string | null;
  num_users?: number;
  duration_s?: number;
  think_time_ms?: number;
}

export interface UserStats {
  user_id: number;
  requests: number;
  avg_latency_ms: number;
  errors: number;
}

export interface UserSimulationResult {
  total_requests: number;
  total_errors: number;
  avg_latency_ms: number;
  duration_seconds: number;
  per_user: UserStats[];
}

// ---- SLA Check types --------------------------------------------------------

export interface SlaRule {
  metric: "p95" | "p99" | "p50" | "avg" | "max" | "error_rate";
  operator: "lt" | "gt" | "lte" | "gte";
  value: number;
}

export interface SlaCheckInput {
  latencies: number[];
  error_count: number;
  total: number;
  rules: SlaRule[];
}

export interface SlaRuleResult {
  rule: SlaRule;
  actual: number;
  passed: boolean;
}

export interface SlaCheckResult {
  passed: boolean;
  results: SlaRuleResult[];
}

// ---- Compare Runs types -----------------------------------------------------

export interface RunStats {
  total_requests: number;
  successful: number;
  failed: number;
  avg_latency_ms: number;
  min_latency_ms: number;
  max_latency_ms: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  actual_rps: number;
  duration_seconds: number;
}

export interface MetricDelta {
  name: string;
  left: number;
  right: number;
  delta: number;
  delta_pct: number;
  improved: boolean;
}

export interface CompareRunsResult {
  metrics: MetricDelta[];
}

// ---- Flow Graph types -------------------------------------------------------

export interface FlowVisualNode {
  name: string;
  level: number;
  dependencies: string[];
}

export interface FlowGraphResult {
  nodes: FlowVisualNode[];
  order: string[];
  has_cycle: boolean;
}

// ---- Retry Tester types -----------------------------------------------------

export interface RetryTestInput {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | null;
  attempts?: number;
  delay_ms?: number;
  expected_recovery_after?: number;
}

export interface AttemptResult {
  attempt: number;
  status: number | null;
  elapsed_ms: number;
  error: string | null;
}

export interface RetryTestResult {
  attempts: AttemptResult[];
  recovered: boolean;
  recovered_at: number | null;
}

// ---- Rate Limit types -------------------------------------------------------

export interface RateLimitResult {
  limit: number | null;
  window_seconds: number | null;
  requests_sent: number;
  first_429_at: number | null;
  headers_found: Record<string, string>;
}

// ---- Idempotency types ------------------------------------------------------

export interface IdempotencySnapshot {
  status: number;
  body_hash: string;
}

export interface IdempotencyResult {
  first: IdempotencySnapshot;
  second: IdempotencySnapshot;
  idempotent: boolean;
  differences: string[];
}

// ---- Pagination types -------------------------------------------------------

export interface PaginationInput {
  url: string;
  headers?: Record<string, string>;
  strategy?: "link" | "offset" | "cursor";
  limit_param?: string;
  offset_param?: string;
  cursor_param?: string;
  page_size?: number;
  max_pages?: number;
}

export interface PageResult {
  page: number;
  status: number;
  item_count: number;
  url: string;
}

export interface PaginationResult {
  pages: PageResult[];
  total_items: number;
  total_pages: number;
  consistent: boolean;
}

// ---- Contract Drift Check types ---------------------------------------------

export interface ContractDriftEntry {
  path: string;
  type: "added" | "removed" | "type_changed";
  old_type: string | null;
  new_type: string | null;
}

export interface ContractDriftCheckResult {
  drifts: ContractDriftEntry[];
  breaking: boolean;
  drift_count: number;
}

// ---- Multi Env Runner types -------------------------------------------------

export interface EnvRunResult {
  env_name: string;
  env_id: string;
  passed: number;
  failed: number;
  errors: number;
  elapsed_ms: number;
}

export interface RequestStatusRow {
  request_name: string;
  statuses: Record<string, number>;
}

export interface MultiEnvResult {
  results: EnvRunResult[];
  comparison: RequestStatusRow[];
}

// ---- Waterfall types --------------------------------------------------------

export interface WaterfallPhase {
  name: string;
  start_ms: number;
  duration_ms: number;
}

export interface WaterfallResult {
  phases: WaterfallPhase[];
  total_ms: number;
  url: string;
}

// ---- cURL Log types ---------------------------------------------------------

export interface CurlLogEntry {
  timestamp: string;
  curl: string;
}

export interface CurlLogResult {
  entries: CurlLogEntry[];
}

// ---- Mock Diff types --------------------------------------------------------

export interface MockDiffEntry {
  path: string;
  expected: string | null;
  actual: string | null;
}

export interface MockDiffInput {
  actual_body: string;
  mock_body: string;
  actual_headers?: Record<string, string>;
  mock_headers?: Record<string, string>;
}

export interface MockDiffResult {
  body_diffs: MockDiffEntry[];
  header_diffs: MockDiffEntry[];
  match: boolean;
}

// ---- Error Patterns types ---------------------------------------------------

export interface ErrorPattern {
  type: string;
  count: number;
  urls: string[];
  first_seen: number;
  last_seen: number;
  burst: boolean;
}

export interface ErrorPatternsResult {
  patterns: ErrorPattern[];
  total_errors: number;
  error_rate: number;
}

// ---- Dashboard types --------------------------------------------------------

export interface DashboardMetricFilter {
  status_gte?: number;
  status_lt?: number;
  url_pattern?: string;
}

export interface DashboardMetricDef {
  name: string;
  type: "avg" | "count" | "p95" | "max" | "min" | "sum";
  field: "elapsed_ms" | "status" | "body_size";
  filter?: DashboardMetricFilter;
}

export interface DashboardDataPoint {
  elapsed_ms: number;
  status: number;
  body_size: number;
  url: string;
  timestamp: number;
}

export interface DashboardInput {
  metrics: DashboardMetricDef[];
  data: DashboardDataPoint[];
}

export interface DashboardMetricResult {
  name: string;
  value: number;
}

export interface DashboardResult {
  results: DashboardMetricResult[];
}

// ---- JWT Inspect types ------------------------------------------------------

export interface JwtInspectResult {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  expired: boolean;
  expires_at: string | null;
  issued_at: string | null;
}

// ---- Token Refresh types ----------------------------------------------------

export interface TokenRefreshInput {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | null;
  refresh_url: string;
  refresh_body?: Record<string, unknown> | null;
  token_field?: string;
  auth_header?: string;
}

export interface TokenRefreshResult {
  original_status: number;
  refreshed: boolean;
  final_status: number;
  final_body: string;
  new_token: string | null;
}

// ---- CORS Test types --------------------------------------------------------

export interface CorsTestResult {
  allowed: boolean;
  allow_origin: string | null;
  allow_methods: string | null;
  allow_headers: string | null;
  allow_credentials: string | null;
  max_age: string | null;
  issues: string[];
}

// ---- Injection Scan types ---------------------------------------------------

export interface InjectionFinding {
  param: string;
  payload: string;
  response_status: number;
  suspicious: boolean;
  evidence: string;
}

export interface InjectionScanResult {
  vulnerable: boolean;
  findings: InjectionFinding[];
}

// ---- Sensitive Data types ---------------------------------------------------

export interface SensitiveFinding {
  type: string;
  value_preview: string;
  location: string;
  line: number;
}

export interface SensitiveDataResult {
  findings: SensitiveFinding[];
  count: number;
  risk_level: "none" | "low" | "medium" | "high";
}

// ---- Universal Import types -------------------------------------------------

export interface UniversalImportResult {
  format_detected: string;
  collection_id: string;
  collection_name: string;
  request_count: number;
  warnings: string[];
}

// ---- WS-Security types -----------------------------------------------------

export interface WsSecurityConfig {
  type: "UsernameToken" | "X509" | "SAML";
  username?: string;
  password?: string;
  certificate?: string;
}

export interface WsSecurityInput {
  wsdl_url: string;
  operation: string;
  args?: Record<string, unknown>;
  security: WsSecurityConfig;
  endpoint_url?: string;
  envelope_xml?: string;
}

export interface WsSecurityOutput {
  ok: boolean;
  result?: string | null;
  fault?: string | null;
}

// ---- MTOM types ------------------------------------------------------------

export interface MtomAttachment {
  filename: string;
  content_base64: string;
  content_type?: string;
}

export interface MtomInput {
  url: string;
  soap_action: string;
  envelope_xml: string;
  attachments?: MtomAttachment[];
}

export interface MtomOutput {
  ok: boolean;
  response_xml?: string | null;
  error?: string | null;
}

// ---- WSDL Diff types -------------------------------------------------------

export interface WsdlDiffOutput {
  added_operations: string[];
  removed_operations: string[];
  changed_types: string[];
  breaking: boolean;
}

// ---- SOAP Coverage types ----------------------------------------------------

export interface SoapCoverageOutput {
  total_operations: number;
  covered: string[];
  uncovered: string[];
  coverage_pct: number;
}

// ---- Stub output (JMS, MQTT, Groovy, AMF) -----------------------------------

export interface StubOutput {
  status: string;
  message: string;
}

// ---- JDBC types -------------------------------------------------------------

export interface JdbcInput {
  connection_string: string;
  query: string;
  params?: unknown[];
}

export interface JdbcOutput {
  columns: string[];
  rows: unknown[][];
  row_count: number;
  error?: string | null;
}

// ---- XSD Validation types ---------------------------------------------------

export interface XsdValidateOutput {
  valid: boolean;
  errors: Array<{ line: number; message: string }>;
}

// ---- WSDL Mock Gen types ----------------------------------------------------

export interface WsdlMockGenOutput {
  operations: Array<{ name: string; mock_response_xml: string }>;
  error?: string | null;
}

// ---- OAuth 1.0 types --------------------------------------------------------

export interface OAuth1Input {
  consumer_key: string;
  consumer_secret: string;
  token?: string;
  token_secret?: string;
  url: string;
  method?: string;
}

export interface OAuth1Output {
  authorization_header: string;
  signed_url: string;
}

// ---- Visual Test Builder types ----------------------------------------------

export interface TestStep {
  type: "request" | "delay" | "assert" | "loop" | "condition";
  config: Record<string, unknown>;
}

export interface TestBuilderData {
  steps: TestStep[];
  version: number;
}

// ---- Data Loop types --------------------------------------------------------

export interface DataLoopInput {
  collection_id: string;
  datasource: { type: "csv" | "json"; data: string };
  loop_variable?: string;
}

export interface DataLoopRowResult {
  row_index: number;
  variables: Record<string, string>;
  status: string;
  error?: string | null;
}

export interface DataLoopOutput {
  total_rows: number;
  results: DataLoopRowResult[];
}

// ---- Flow Block types -------------------------------------------------------

export interface FlowBlock {
  id: string;
  type: "request" | "transform" | "condition" | "delay";
  config: Record<string, unknown>;
  next?: string[];
}

export interface FlowBlockExecuteInput {
  blocks: FlowBlock[];
}

export interface FlowBlockResult {
  block_id: string;
  output: Record<string, unknown>;
  error?: string | null;
}

export interface FlowBlockExecuteOutput {
  results: FlowBlockResult[];
  elapsed_ms: number;
}

// ---- Monitor types ----------------------------------------------------------

export interface MonitorConfig {
  id?: string;
  collection_id: string;
  environment_id?: string | null;
  cron?: string;
  enabled?: boolean;
  last_run?: string | null;
  last_status?: string | null;
}

export interface MonitorListOutput {
  monitors: MonitorConfig[];
}

// ---- Webhook types ----------------------------------------------------------

export interface WebhookConfig {
  id?: string;
  collection_id: string;
  environment_id?: string | null;
  url: string;
  enabled?: boolean;
}

export interface WebhookListOutput {
  webhooks: WebhookConfig[];
}

// ---- Cookie Manager types ---------------------------------------------------

export interface CookieManagerEntry {
  name: string;
  value: string;
  domain: string;
  path?: string;
  env_id?: string | null;
}

export interface CookieManagerList {
  cookies: CookieManagerEntry[];
}

// ---- Console Log types ------------------------------------------------------

export interface ConsoleLogEntry {
  timestamp?: string;
  method?: string;
  url?: string;
  status?: number;
  elapsed_ms?: number;
  request_headers?: Record<string, string>;
  response_headers?: Record<string, string>;
  request_body?: string | null;
  response_body?: string | null;
}

// ---- Terminal types ---------------------------------------------------------

export interface TerminalOutput {
  stdout: string;
  stderr: string;
  exit_code: number;
}

// ---- Catalog types ----------------------------------------------------------

export interface CatalogEntry {
  id?: string;
  name: string;
  version?: string;
  spec_url?: string;
  owner?: string;
  tags?: string[];
  status?: "active" | "deprecated";
}

// ---- Governance types -------------------------------------------------------

export interface GovernanceRule {
  rule: string;
  passed: boolean;
  message: string;
}

export interface GovernanceOutput {
  score: number;
  rules: GovernanceRule[];
}

// ---- Version Diff types -----------------------------------------------------

export interface VersionDiffOutput {
  breaking_changes: string[];
  non_breaking: string[];
  added: string[];
  removed: string[];
  summary: string;
}

// ---- OpenAPI Sync types -----------------------------------------------------

export interface OpenApiSyncOutput {
  in_sync: boolean;
  missing_in_collection: string[];
  extra_in_collection: string[];
  drifted: string[];
}

// ---- Collection Branching types ---------------------------------------------

export interface ForkOutput {
  id: string;
  name: string;
  parent_id: string;
  item_count: number;
}

export interface MergeOutput {
  id: string;
  name: string;
  merged_items: number;
}

// ---- NPM Loader types ------------------------------------------------------

export interface NpmInstallOutput {
  installed: boolean;
  path: string;
  error?: string | null;
}

export interface NpmExecuteOutput {
  stdout: string;
  stderr: string;
  exit_code: number;
}

// ---- Cookie Scripting types -------------------------------------------------

export interface CookieScriptOutput {
  cookies_modified: Record<string, string>;
  result: string;
  error?: string | null;
}

// ---- JUnit Reporter types ---------------------------------------------------

export interface JunitTestResult {
  name: string;
  status: "passed" | "failed" | "error";
  elapsed_ms?: number;
  error?: string | null;
  assertions?: number;
}

// ---- CLI Reporter types -----------------------------------------------------

export interface ReportResultItem {
  name: string;
  status: string;
  elapsed_ms?: number;
  error?: string | null;
  assertions?: number;
}

// ---- Team Workspace types ---------------------------------------------------

export interface TeamWorkspace {
  id?: string;
  name: string;
  collections?: string[];
  environments?: string[];
  members?: string[];
}

// ---- MCP types --------------------------------------------------------------

export interface McpTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface McpManifest {
  name: string;
  version: string;
  tools: McpTool[];
}

export interface McpInvokeOutput {
  result: Record<string, unknown>;
  error?: string | null;
}

// ---- AI Chat types ----------------------------------------------------------

export interface AiChatContext {
  collections?: string[];
  environment?: string;
  recent_responses?: string[];
}

export interface AiSuggestion {
  action: string;
  label: string;
}

export interface AiChatOutput {
  response: string;
  suggestions: AiSuggestion[];
  error?: string | null;
}

// ---- Self-Healing types -----------------------------------------------------

export interface HealAssertionInput {
  assertion: Assertion;
  response_body: string;
  response_headers?: Record<string, string>;
  response_status?: number;
}

export interface HealCandidate {
  original_path: string;
  suggested_path: string;
  confidence: number;
  reason: string;
}

export interface HealAssertionOutput {
  candidates: HealCandidate[];
  auto_fixable: boolean;
}

// ---- YAML Project types -----------------------------------------------------

export interface ProjectSummary {
  name: string;
  collection_count: number;
  environment_count: number;
  created_at: string | null;
}

export interface ProjectEnvironment {
  name: string;
  variables: Record<string, string>;
}

export interface ProjectCollection {
  name: string;
  requests: Array<Record<string, unknown>>;
  variables: Record<string, string>;
}

export interface YamlProject {
  name: string;
  created_at: string | null;
  collections: ProjectCollection[];
  environments: ProjectEnvironment[];
}

// ---- OAuth2 PKCE types ------------------------------------------------------

export interface OAuth2AuthorizeUrlInput {
  auth_url: string;
  client_id: string;
  redirect_uri?: string;
  scope?: string;
  state?: string;
  use_pkce?: boolean;
}

export interface OAuth2AuthorizeUrlOutput {
  url: string;
  state: string;
  code_verifier: string | null;
  code_challenge: string | null;
}

export interface OAuth2CallbackResult {
  status: "waiting" | "received" | "expired" | "not_running";
  code: string | null;
  state: string | null;
  error: string | null;
}
