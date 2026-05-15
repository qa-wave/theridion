/**
 * Protocol-specific types + sidecar methods: GraphQL, gRPC, SOAP, WebSocket, Kafka.
 */

import { call } from "./client";
import type { StubOutput } from "./types";

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

// ---- WS-Security types -----------------------------------------------------

export interface WsSecurityConfig {
  type: "UsernameToken" | "Timestamp" | "BinarySecurityToken";
  username?: string;
  password?: string;
  password_type?: "PasswordText" | "PasswordDigest";
  add_nonce?: boolean;
  add_created?: boolean;
  add_timestamp?: boolean;
  ttl_seconds?: number;
  certificate_base64?: string;
}

export interface WsSecurityInput {
  url: string;
  soap_action?: string;
  envelope_xml: string;
  security: WsSecurityConfig;
  headers?: Record<string, string>;
}

export interface WsSecurityOutput {
  ok: boolean;
  status: number;
  response_xml: string;
  secured_envelope: string;
  error?: string | null;
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

// ---- SSE types -----------------------------------------------------------

export interface SSEConnectInput {
  url: string;
  headers?: Record<string, string>;
  environment_id?: string | null;
  max_events?: number;
  timeout_seconds?: number;
}

export interface SSEEvent {
  id: string | null;
  event: string;
  data: string;
  timestamp: number;
}

export interface SSEResult {
  url: string;
  events: SSEEvent[];
  total_events: number;
  connection_time_ms: number;
  error: string | null;
}

export const protocolsMethods = {
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
  wsSecurityExecute: (input: WsSecurityInput) =>
    call<WsSecurityOutput>("/api/soap/ws-security/execute", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  mtomSend: (input: MtomInput) =>
    call<MtomOutput>("/api/soap/mtom", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  wsdlDiff: (input: { old_wsdl_url: string; new_wsdl_url: string }) =>
    call<WsdlDiffOutput>("/api/soap/wsdl-diff", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  soapCoverage: (input: { wsdl_url: string; collection_id: string }) =>
    call<SoapCoverageOutput>("/api/soap/coverage", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  xsdValidate: (input: { xml: string; xsd: string }) =>
    call<XsdValidateOutput>("/api/soap/xsd-validate", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  wsdlGenerateMock: (wsdl_url: string) =>
    call<WsdlMockGenOutput>("/api/soap/generate-mock", {
      method: "POST",
      body: JSON.stringify({ wsdl_url }),
    }),
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
  jmsSend: () => call<StubOutput>("/api/jms/send", { method: "POST" }),
  jmsReceive: () => call<StubOutput>("/api/jms/receive", { method: "POST" }),
  jdbcQuery: (input: JdbcInput) =>
    call<JdbcOutput>("/api/jdbc/query", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  mqttConnect: () => call<StubOutput>("/api/mqtt/connect", { method: "POST" }),
  mqttPublish: () => call<StubOutput>("/api/mqtt/publish", { method: "POST" }),
  mqttSubscribe: () => call<StubOutput>("/api/mqtt/subscribe", { method: "POST" }),
  amfInvoke: () => call<StubOutput>("/api/amf/invoke", { method: "POST" }),
  mockStartFromCollection: (collectionId: string, port?: number) =>
    call<MockStartOutput>(
      `/api/advanced/mock/start-from-collection/${collectionId}${port ? `?port=${port}` : ""}`,
      { method: "POST" },
    ),
  sseConnect: (input: SSEConnectInput) =>
    call<SSEResult>("/api/sse/connect", {
      method: "POST",
      body: JSON.stringify(input),
    }),
} as const;
