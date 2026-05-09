import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FolderClosed,
  FolderOpen,
  FolderPlus,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { HTTP_METHOD_COLOR } from "../state/types";
import type { CollectionItem, StoredCollection } from "../lib/sidecar";

interface Props {
  collections: StoredCollection[];
  loading: boolean;
  onOpen: (collectionId: string, item: CollectionItem) => void;
  onNewCollection: () => void;
  onNewFolder: (collectionId: string, parentFolderId: string | null) => void;
  onDeleteCollection: (id: string) => void;
  onDeleteRequest: (collectionId: string, requestId: string) => void;
  onDeleteFolder: (collectionId: string, folderId: string) => void;
  onRefresh: () => void;
}

export function Sidebar({
  collections,
  loading,
  onOpen,
  onNewCollection,
  onNewFolder,
  onDeleteCollection,
  onDeleteRequest,
  onDeleteFolder,
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
              onOpen={(item) => onOpen(c.id, item)}
              onNewFolder={(parentId) => onNewFolder(c.id, parentId)}
              onDeleteCollection={() => onDeleteCollection(c.id)}
              onDeleteFolder={(fid) => onDeleteFolder(c.id, fid)}
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
  onNewFolder,
  onDeleteCollection,
  onDeleteFolder,
  onDeleteRequest,
}: {
  collection: StoredCollection;
  filter: string;
  onOpen: (item: CollectionItem) => void;
  onNewFolder: (parentId: string | null) => void;
  onDeleteCollection: () => void;
  onDeleteFolder: (id: string) => void;
  onDeleteRequest: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const visibleItems = filter
    ? filterTree(collection.items, filter)
    : collection.items;

  if (filter && visibleItems.length === 0) return null;

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
        </button>
        <button
          type="button"
          onClick={() => onNewFolder(null)}
          className="rounded p-0.5 text-neutral-600 opacity-0 transition hover:bg-neutral-800 hover:text-neutral-200 group-hover:opacity-100"
          title="New folder at root"
        >
          <FolderPlus className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete collection "${collection.name}"? This cannot be undone.`)) {
              onDeleteCollection();
            }
          }}
          className="rounded p-0.5 text-neutral-600 opacity-0 transition hover:bg-neutral-800 hover:text-rose-400 group-hover:opacity-100"
          title="Delete collection"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {open && (
        <ItemList
          items={visibleItems}
          depth={1}
          onOpen={onOpen}
          onNewFolder={onNewFolder}
          onDeleteFolder={onDeleteFolder}
          onDeleteRequest={onDeleteRequest}
        />
      )}
      {open && collection.items.length === 0 && (
        <p className="px-8 py-1 text-[11px] italic text-neutral-600">
          (empty)
        </p>
      )}
    </div>
  );
}

function ItemList({
  items,
  depth,
  onOpen,
  onNewFolder,
  onDeleteFolder,
  onDeleteRequest,
}: {
  items: CollectionItem[];
  depth: number;
  onOpen: (item: CollectionItem) => void;
  onNewFolder: (parentId: string | null) => void;
  onDeleteFolder: (id: string) => void;
  onDeleteRequest: (id: string) => void;
}) {
  return (
    <>
      {items.map((it) =>
        it.is_folder ? (
          <FolderNode
            key={it.id}
            folder={it}
            depth={depth}
            onOpen={onOpen}
            onNewFolder={onNewFolder}
            onDeleteFolder={onDeleteFolder}
            onDeleteRequest={onDeleteRequest}
          />
        ) : (
          <RequestRow
            key={it.id}
            request={it}
            depth={depth}
            onOpen={() => onOpen(it)}
            onDelete={() => onDeleteRequest(it.id)}
          />
        ),
      )}
    </>
  );
}

function FolderNode({
  folder,
  depth,
  onOpen,
  onNewFolder,
  onDeleteFolder,
  onDeleteRequest,
}: {
  folder: CollectionItem;
  depth: number;
  onOpen: (item: CollectionItem) => void;
  onNewFolder: (parentId: string | null) => void;
  onDeleteFolder: (id: string) => void;
  onDeleteRequest: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const padLeft = `${0.5 + depth * 0.75}rem`;
  return (
    <div>
      <div
        className="group flex items-center rounded text-xs hover:bg-neutral-800/60"
        style={{ paddingLeft: padLeft }}
      >
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex flex-1 items-center gap-1 py-1 pr-2 text-left text-neutral-200"
        >
          {open ? (
            <ChevronDown className="h-3 w-3 text-neutral-500" />
          ) : (
            <ChevronRight className="h-3 w-3 text-neutral-500" />
          )}
          {open ? (
            <FolderOpen className="h-3 w-3 text-neutral-400" />
          ) : (
            <FolderClosed className="h-3 w-3 text-neutral-400" />
          )}
          <span className="truncate">{folder.name}</span>
        </button>
        <button
          type="button"
          onClick={() => onNewFolder(folder.id)}
          className="rounded p-0.5 text-neutral-600 opacity-0 transition hover:bg-neutral-800 hover:text-neutral-200 group-hover:opacity-100"
          title="New subfolder"
        >
          <FolderPlus className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete folder "${folder.name}" and everything inside? This cannot be undone.`)) {
              onDeleteFolder(folder.id);
            }
          }}
          className="mr-1 rounded p-0.5 text-neutral-600 opacity-0 transition hover:bg-neutral-800 hover:text-rose-400 group-hover:opacity-100"
          title="Delete folder"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {open && (folder.items?.length ?? 0) > 0 && (
        <ItemList
          items={folder.items ?? []}
          depth={depth + 1}
          onOpen={onOpen}
          onNewFolder={onNewFolder}
          onDeleteFolder={onDeleteFolder}
          onDeleteRequest={onDeleteRequest}
        />
      )}
    </div>
  );
}

function RequestRow({
  request,
  depth,
  onOpen,
  onDelete,
}: {
  request: CollectionItem;
  depth: number;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const padLeft = `${1.25 + depth * 0.75}rem`;
  return (
    <div className="group flex items-center rounded text-xs hover:bg-neutral-800/60">
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 items-center gap-2 py-1 pr-2 text-left text-neutral-300"
        style={{ paddingLeft: padLeft }}
        title={request.url}
      >
        <span
          className={`w-9 shrink-0 font-mono text-[10px] font-bold tabular-nums ${
            request.method ? HTTP_METHOD_COLOR[request.method] : "text-neutral-400"
          }`}
        >
          {request.method ?? ""}
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

/** Filter the tree, keeping any branch where some descendant matches. */
function filterTree(items: CollectionItem[], q: string): CollectionItem[] {
  const out: CollectionItem[] = [];
  for (const it of items) {
    if (it.is_folder) {
      const subItems = filterTree(it.items ?? [], q);
      const selfMatches = it.name.toLowerCase().includes(q);
      if (subItems.length > 0 || selfMatches) {
        out.push({ ...it, items: subItems });
      }
    } else {
      if (
        it.name.toLowerCase().includes(q) ||
        (it.url ?? "").toLowerCase().includes(q)
      ) {
        out.push(it);
      }
    }
  }
  return out;
}
