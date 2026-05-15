/**
 * Sidecar client — re-exports all domain modules and composes the unified `sidecar` object.
 */

// Re-export everything from each module so consumers can import types directly.
export { getSidecarBaseUrl, isTauri } from "./client";
export type { HealthResponse } from "./client";

export type {
  AuthType, AuthConfig, TimingBreakdown, ExecuteRequestInput, ExecuteResponse,
  EnvVariable, Environment, EnvironmentSummary, CollectionVariable, StubOutput,
} from "./types";

export type {
  CollectionItem, SavedRequest, StoredCollection, CollectionSummary,
  SaveRequestInput, CreateFolderInput, FavoriteItem, ForkOutput, MergeOutput,
} from "./collections";

export type { EnvDiffOutput } from "./environments";

export type {
  FormField, ExecuteMultipartInput, CaptureRule, ExecuteWithCapturesInput,
  ExecuteWithCapturesResponse, OAuth2TokenInput, OAuth2TokenOutput,
  OAuth1Input, OAuth1Output, OAuth2AuthorizeUrlInput, OAuth2AuthorizeUrlOutput,
  OAuth2CallbackResult, CookieManagerEntry, CookieManagerList, ConsoleLogEntry,
} from "./requests";

export type {
  GraphQLExecuteInput, GraphQLResponse, GraphQLType, IntrospectOutput,
  SoapOperation, SoapPort, SoapService, WsdlSummary, SoapExecuteInput, SoapExecuteOutput,
  WsSecurityConfig, WsSecurityInput, WsSecurityOutput,
  MtomAttachment, MtomInput, MtomOutput, WsdlDiffOutput, SoapCoverageOutput,
  XsdValidateOutput, WsdlMockGenOutput,
  GrpcService, GrpcReflectOutput, GrpcInvokeInput, GrpcInvokeOutput,
  MockRoute, MockStartInput, MockStartOutput, MockServerInfo, MockStatusOutput,
  JdbcInput, JdbcOutput,
} from "./protocols";

export type {
  AssertionType, Assertion, AssertionResult, AssertionEvalOutput,
  BatchOutput, HealAssertionInput, HealCandidate, HealAssertionOutput,
  FlowStep, FlowRunInput, FlowStepResult, FlowTraceEvent, FlowDatasetResult, FlowRunOutput,
  TestStep, TestBuilderData, DataLoopInput, DataLoopRowResult, DataLoopOutput,
  FlowBlock, FlowBlockExecuteInput, FlowBlockResult, FlowBlockExecuteOutput,
  RetryTestInput, AttemptResult, RetryTestResult, RateLimitResult,
  IdempotencySnapshot, IdempotencyResult, PaginationInput, PageResult, PaginationResult,
  ContractDriftEntry, ContractDriftCheckResult,
  EnvRunResult, RequestStatusRow, MultiEnvResult,
  FlowVisualNode, FlowGraphResult,
  MonitorConfig, MonitorListOutput, WebhookConfig, WebhookListOutput,
  RunRequestResult, RunCollectionOutput, RunWithTraceOutput,
  ContractGuardViolation, ContractValidateGuardInput, ContractGuardOutput,
  PerRequestValidation, ContractCollectionOutput,
  JunitTestResult, ReportResultItem,
} from "./testing";

export type {
  ResponseTrendsResult, SecurityAuditFinding, SecurityAuditResult,
  SslChainEntry, SslInspectResult, DnsAddress, DnsInspectResult,
  CompressionResult, RedirectHop, RedirectChainResult, ContentTypeResult,
  PatternLoadTestInput, LoadTestPhase, PatternLoadTestResult,
  HistogramBucket, LatencyHistogramResult, ThroughputWindow, ThroughputTimelineResult,
  ConnectionStatsResult, UserSimulationInput, UserStats, UserSimulationResult,
  SlaRule, SlaCheckInput, SlaRuleResult, SlaCheckResult,
  RunStats, MetricDelta, CompareRunsResult,
  WaterfallPhase, WaterfallResult, CurlLogEntry, CurlLogResult,
  MockDiffEntry, MockDiffInput, MockDiffResult,
  ErrorPattern, ErrorPatternsResult,
  DashboardMetricFilter, DashboardMetricDef, DashboardDataPoint, DashboardInput,
  DashboardMetricResult, DashboardResult,
  JwtInspectResult, TokenRefreshInput, TokenRefreshResult,
  CorsTestResult, InjectionFinding, InjectionScanResult,
  SensitiveFinding, SensitiveDataResult,
  LoadTestInput, LoadTestResult,
  LoadRunConfig, TimelinePoint, LoadRunResult,
  OWASPSeverity, OWASPScanType, OWASPFinding, OWASPScanInput, OWASPScanOutput,
} from "./analysis";

export type { ParsedCurl, UniversalImportResult, ReplayDiff, ReplayOutput } from "./codegen";

export type {
  TestgenCategory, TestgenOperationSummary, TestgenParseOutput, TestgenGenerateOutput,
  AiChatContext, AiSuggestion, AiChatOutput,
  SmartSuggestInput, SmartSuggestOutput,
  ExploreIssue, ExploredEndpoint, ExploreApiResult,
} from "./ai";

export type {
  ServiceNode, ServiceEdge, ServiceGraph,
  ApiDocEndpoint, ApiDocOutput, ResponseSnapshot, TimelineOutput,
  SchemaValidateOutput, RequestExample, RequestExampleInput,
  OpenApiImportInput, OpenApiImportOutput, OpenApiExportOutput,
  ContractValidateInput, ContractViolation, ContractValidateOutput,
  ObservedResponse, ContractDriftInput, ContractDriftOutput,
  VaultEntrySummary, VaultListOutput, VaultWriteInput, VaultRevealOutput,
  VariableInspectInput, VariableResolution, VariableInspectOutput,
  DependencyNode, DependencyEdge, DependencyGraphOutput,
  JsonDiffInput, JsonDifference, JsonDiffOutput,
  SnapshotWriteInput, SnapshotCompareInput, SnapshotCompareOutput,
  HarImportInput, HarImportOutput, TlsInspectInput, TlsInspectOutput,
  ProxyStartInput, ProxyStartOutput, ProxyStatusOutput,
  GitReviewChange, GitReviewOutput,
  TerminalOutput, CatalogEntry, GovernanceRule, GovernanceOutput,
  VersionDiffOutput, OpenApiSyncOutput,
  NpmInstallOutput, NpmExecuteOutput, CookieScriptOutput,
  TeamWorkspace, McpTool, McpManifest, McpInvokeOutput,
  ResolvedVariableItem, VariableResolveOutput,
  SemanticDiffChange, SemanticDiffInput, SemanticDiffOutput,
  ProjectSummary, ProjectEnvironment, ProjectCollection, YamlProject,
  HarNetworkEntryData, HarExportResult, PostmanExportResult,
  FailureNotifyInput, FailureNotifyResult,
} from "./advanced";

// ---- Compose the unified sidecar object from all sub-modules ----

import { collectionsMethods } from "./collections";
import { environmentsMethods } from "./environments";
import { requestsMethods } from "./requests";
import { protocolsMethods } from "./protocols";
import { testingMethods } from "./testing";
import { analysisMethods } from "./analysis";
import { codegenMethods } from "./codegen";
import { aiMethods } from "./ai";
import { advancedMethods } from "./advanced";

export const sidecar = {
  ...requestsMethods,
  ...collectionsMethods,
  ...environmentsMethods,
  ...protocolsMethods,
  ...testingMethods,
  ...analysisMethods,
  ...codegenMethods,
  ...aiMethods,
  ...advancedMethods,
} as const;
