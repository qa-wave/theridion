import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FolderClosed,
  FolderOpen,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { HTTP_METHOD_COLOR } from "../state/types";
import type { StoredCollection, SavedRequest } from "../lib/sidecar";

interface Props {
  collections: StoredCollection[];
  loading: boolean;
  onOpen: (collectionId: string, item: SavedRequest) => void;
  onNewCollection: () => void;
  onDeleteCollection: (id: string) => void;
  onDeleteRequest: (collectionId: string, requestId: string) => void;
  onRefresh: () => void;
}

export function Sidebar({
  collections,
  loading,
  onOpen,
  onNewCollection,
  onDeleteCollection,
  onDeleteRequest,
  onRefresh,
}: Props) {
  const [query, setQuery] = useState("");
  const filter = query.toLowerCase();

  return (
    <aside className="flex h-full flex-col border-r border-neutral-800/80 bg-neutral-925">
      <div className="flex items-center gap-1 px-3 pt-3 pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          Collections
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="ml-auto rounded p-1 text-neutral-500 transition hover:bg-neutral-800 hover:text-neutral-200"
          title="Refresh"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={onNewCollection}
          className="rounded p-1 text-neutral-500 transition hover:bg-neutral-800 hover:text-neutral-200"
          title="New collection"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter…"
            className="w-full rounded border border-neutral-800 bg-neutral-900 py-1.5 pl-7 pr-2 text-xs placeholder-neutral-600 focus:border-neutral-600 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1 pb-3">
        {collections.length === 0 ? (
          <EmptyState onNewCollection={onNewCollection} />
        ) : (
          collections.map((c) => (
            <CollectionNode
              key={c.id}
              collection={c}
              filter={filter}
              onOpen={(req) => onOpen(c.id, req)}
              onDelete={() => onDeleteCollection(c.id)}
              onDeleteRequest={(rid) => onDeleteRequest(c.id, rid)}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function EmptyState({ onNewCollection }: { onNewCollection: () => void }) {
  return (
    <div className="mx-2 mt-4 rounded border border-dashed border-neutral-800 px-3 py-6 text-center">
      <p className="text-xs text-neutral-500">No collections yet</p>
      <p className="mt-1 text-[11px] text-neutral-600">
        Hit <kbd className="rounded border border-neutral-700 bg-neutral-900 px-1 text-[10px]">⌘S</kbd> on a request, or
      </p>
      <button
        type="button"
        onClick={onNewCollection}
        className="mt-2 text-xs text-emerald-500 hover:text-emerald-400"
      >
        + New collection
      </button>
    </div>
  );
}

function CollectionNode({
  collection,
  filter,
  onOpen,
  onDelete,
  onDeleteRequest,
}: {
  collection: StoredCollection;
  filter: string;
  onOpen: (req: SavedRequest) => void;
  onDelete: () => void;
  onDeleteRequest: (requestId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const items = filter
    ? collection.items.filter(
        (r) =>
          r.name.toLowerCase().includes(filter) ||
          r.url.toLowerCase().includes(filter),
      )
    : collection.items;

  if (filter && items.length === 0) return null;

  return (
    <div className="select-none">
      <div className="group flex items-center gap-1 rounded px-2 py-1 hover:bg-neutral-800/60">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex flex-1 items-center gap-1 text-left text-xs font-semibold text-neutral-100"
        >
          {open ? (
            <ChevronDown className="h-3 w-3 text-neutral-500" />
          ) : (
            <ChevronRight className="h-3 w-3 text-neutral-500" />
          )}
          {open ? (
            <FolderOpen className="h-3.5 w-3.5 text-neutral-400" />
          ) : (
            <FolderClosed className="h-3.5 w-3.5 text-neutral-400" />
          )}
          <span className="truncate">{collection.name}</span>
          <span className="ml-1 text-[10px] font-normal text-neutral-600">
            {collection.items.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete collection "${collection.name}"? This cannot be undone.`)) {
              onDelete();
            }
          }}
          className="rounded p-0.5 text-neutral-600 opacity-0 transition hover:bg-neutral-800 hover:text-rose-400 group-hover:opacity-100"
          title="Delete collection"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {open &&
        items.map((req) => (
          <RequestRow
            key={req.id}
            request={req}
            onOpen={() => onOpen(req)}
            onDelete={() => onDeleteRequest(req.id)}
          />
        ))}
      {open && collection.items.length === 0 && (
        <p className="px-8 py-1 text-[11px] italic text-neutral-600">
          (empty)
        </p>
      )}
    </div>
  );
}

function RequestRow({
  request,
  onOpen,
  onDelete,
}: {
  request: SavedRequest;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center rounded text-xs hover:bg-neutral-800/60">
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 items-center gap-2 px-2 py-1 pl-8 text-left text-neutral-300"
        title={request.url}
      >
        <span
          className={`w-9 shrink-0 font-mono text-[10px] font-bold tabular-nums ${HTTP_METHOD_COLOR[request.method]}`}
        >
          {request.method}
        </span>
        <span className="truncate">{request.name}</span>
      </button>
      <button
        type="button"
        onClick={() => {
          if (confirm(`Delete request "${request.name}"?`)) onDelete();
        }}
        className="mr-1 rounded p-0.5 text-neutral-600 opacity-0 transition hover:bg-neutral-800 hover:text-rose-400 group-hover:opacity-100"
        title="Delete request"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
