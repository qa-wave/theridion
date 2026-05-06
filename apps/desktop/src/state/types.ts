import type { ExecuteResponse, ExecuteRequestInput } from "../lib/sidecar";

export type Method = ExecuteRequestInput["method"];

export const METHODS: Method[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

export interface RequestTab {
  id: string;
  name: string;
  method: Method;
  url: string;
  headersRaw: string;
  body: string;
  response: ExecuteResponse | null;
  error: string | null;
  busy: boolean;
  /** Wall-clock time of last successful run, used for sort/render. */
  lastRunAt: number | null;
}

export interface CollectionItem {
  id: string;
  name: string;
  method: Method;
  url: string;
}

export interface Collection {
  id: string;
  name: string;
  folders: {
    id: string;
    name: string;
    items: CollectionItem[];
  }[];
}

export const HTTP_METHOD_COLOR: Record<Method, string> = {
  GET: "text-sky-400",
  POST: "text-emerald-400",
  PUT: "text-amber-400",
  PATCH: "text-violet-400",
  DELETE: "text-rose-400",
  HEAD: "text-neutral-400",
  OPTIONS: "text-neutral-400",
};

export function newRequestTab(partial?: Partial<RequestTab>): RequestTab {
  return {
    id: crypto.randomUUID(),
    name: "Untitled request",
    method: "GET",
    url: "",
    headersRaw: "",
    body: "",
    response: null,
    error: null,
    busy: false,
    lastRunAt: null,
    ...partial,
  };
}
