/**
 * Environment types + sidecar methods.
 */

import { call, getSidecarBaseUrl } from "./client";
import type { EnvVariable, Environment, EnvironmentSummary } from "./types";

// ---- Env Diff types ------------------------------------------------------

export interface EnvDiffOutput {
  left_name: string;
  right_name: string;
  diffs: Array<{ name: string; left_value: string | null; right_value: string | null; status: string }>;
  total: number;
  changed: number;
  added: number;
  removed: number;
}

export const environmentsMethods = {
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
  compareEnvs: (leftId: string, rightId: string) =>
    call<EnvDiffOutput>("/api/envdiff/compare", {
      method: "POST",
      body: JSON.stringify({ left_id: leftId, right_id: rightId }),
    }),
  getGlobals: () =>
    call<{ variables: Array<{ name: string; value: string; enabled: boolean }> }>("/api/globals"),
  putGlobals: (variables: Array<{ name: string; value: string; enabled: boolean }>) =>
    call<{ variables: Array<{ name: string; value: string; enabled: boolean }> }>("/api/globals", {
      method: "PUT",
      body: JSON.stringify({ variables }),
    }),
} as const;
