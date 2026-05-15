/**
 * Shared types used across multiple sidecar domain modules.
 */

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

export interface TimingBreakdown {
  dns_ms: number;
  connect_ms: number;
  tls_ms: number;
  server_processing_ms: number;
  transfer_ms: number;
  total_ms: number;
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

export interface CollectionVariable {
  name: string;
  value: string;
  enabled: boolean;
}

// ---- Stub output (JMS, MQTT, Groovy, AMF) -----------------------------------

export interface StubOutput {
  status: string;
  message: string;
}
