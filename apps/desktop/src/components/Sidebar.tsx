import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FolderClosed,
  FolderOpen,
  FolderPlus,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { HTTP_METHOD_COLOR } from "../state/types";
import type { CollectionItem, StoredCollection, FavoriteItem } from "../lib/sidecar";
import { sidecar } from "../lib/sidecar";

interface Props {
  collections: StoredCollection[];
  loading: boolean;
  onOpen: (collectionId: string, item: CollectionItem) => void;
  onNewCollection: () => void;
  onGenerateTests: () => void;
  onNewFolder: (collectionId: string, parentFolderId: string | null) => void;
  onDeleteCollection: (id: string) => void;
  onDeleteRequest: (collectionId: string, requestId: string) => void;
  onDeleteFolder: (collectionId: string, folderId: string) => void;
  onRenameCollection: (id: string, name: string) => void;
  onRenameItem: (collectionId: string, itemId: string, name: string) => void;
  onRefresh: () => void;
  onContextMenu?: (e: React.MouseEvent, collectionId: string, item: CollectionItem) => void;
}

export function Sidebar({
  collections,
  loading,
  onOpen,
  onNewCollection,
  onGenerateTests,
  onNewFolder,
  onDeleteCollection,
  onDeleteRequest,
  onDeleteFolder,
  onRenameCollection,
  onRenameItem,
  onRefresh,
  onContextMenu,
}: Props) {
  const [query, setQuery] = useState("");
  const filter = query.toLowerCase();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [favOpen, setFavOpen] = useState(true);

  useEffect(() => {
    sidecar.listFavorites().then((r) => setFavorites(r.items)).catch(() => {});
  }, [collections]);

  async function toggleFavorite(collectionId: string, item: CollectionItem) {
    const exists = favorites.some((f) => f.collection_id === collectionId && f.request_id === item.id);
    try {
      if (exists) {
        const res = await sidecar.removeFavorite(collectionId, item.id);
        setFavorites(res.items);
      } else {
        const res = await sidecar.addFavorite({
          collection_id: collectionId,
          request_id: item.id,
          name: item.name,
          method: item.method ?? "GET",
          url: item.url ?? "",
        });
        setFavorites(res.items);
      }
    } catch {
      // non-critical
    }
  }

  return (
    <aside className="flex h-full flex-col border-r border-glass bg-neutral-925/90">
      {/* Favorites section */}
      {favorites.length > 0 && (
        <div className="border-b border-glass">
          <div className="flex items-center gap-1 px-3 pt-2 pb-1">
            <button type="button" onClick={() => setFavOpen(!favOpen)} className="shrink-0 text-neutral-500">
              {favOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
            <Star className="h-3 w-3 text-amber-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Favorites</span>
            <span className="ml-auto text-[10px] text-neutral-600">{favorites.length}</span>
          </div>
          {favOpen && (
            <div className="px-1 pb-2">
              {favorites.map((f) => (
                <button
                  key={`${f.collection_id}-${f.request_id}`}
                  type="button"
                  onClick={() => onOpen(f.collection_id, { id: f.request_id, name: f.name, is_folder: false, method: f.method as CollectionItem["method"], url: f.url })}
                  className="group flex w-full items-center gap-2 rounded px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800/60"
                >
                  <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                  <span className={`w-9 shrink-0 font-mono text-[10px] font-bold tabular-nums ${HTTP_METHOD_COLOR[f.method as keyof typeof HTTP_METHOD_COLOR] ?? "text-neutral-400"}`}>
                    {f.method}
                  </span>
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
          onClick={onGenerateTests}
          className="rounded p-1 text-neutral-500 transition hover:bg-neutral-800 hover:text-cobweb-300"
          title="Generate tests from a service definition (OpenAPI / WSDL)"
        >
          <Sparkles className="h-3.5 w-3.5" />
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
            className="w-full rounded-md border border-glass bg-neutral-900/50 py-1.5 pl-7 pr-2 text-xs placeholder-neutral-600 focus:border-cobweb-500/40 focus:outline-none"
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
              onRenameCollection={(name) => onRenameCollection(c.id, name)}
              onRenameItem={(itemId, name) => onRenameItem(c.id, itemId, name)}
              favorites={favorites}
              onToggleFavorite={(item) => toggleFavorite(c.id, item)}
              onContextMenu={onContextMenu ? (e, item) => onContextMenu(e, c.id, item) : undefined}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function EmptyState({ onNewCollection }: { onNewCollection: () => void }) {
  return (
    <div className="mx-2 mt-6 rounded-lg border border-dashed border-neutral-800/60 bg-neutral-900/20 px-4 py-8 text-center">
      <div className="mx-auto mb-3 w-fit rounded-full bg-neutral-800/40 p-3">
        <FolderClosed className="h-5 w-5 text-neutral-600" />
      </div>
      <p className="text-xs font-medium text-neutral-400">No collections yet</p>
      <p className="mt-1.5 text-[11px] text-neutral-600">
        Save a request with{" "}
        <kbd className="rounded border border-neutral-800 bg-neutral-900/80 px-1 py-0.5 font-mono text-[10px] shadow-inner-glow">
          &#x2318;S
        </kbd>
      </p>
      <button
        type="button"
        onClick={onNewCollection}
        className="mt-3 rounded-md bg-cobweb-600/20 px-3 py-1.5 text-xs font-medium text-cobweb-400 transition hover:bg-cobweb-600/30"
      >
        + New collection
      </button>
    </div>
  );
}

function InlineRenameInput({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <input
      ref={ref}
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value.trim() && value !== initial) onCommit(value.trim());
        else onCancel();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (value.trim() && value !== initial) onCommit(value.trim());
          else onCancel();
        } else if (e.key === "Escape") {
          onCancel();
        }
      }}
      className="w-full rounded-md border border-cobweb-500/50 bg-neutral-900/60 px-1 py-0 text-xs text-neutral-100 focus:outline-none"
      spellCheck={false}
    />
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
  onRenameCollection,
  onRenameItem,
  favorites,
  onToggleFavorite,
  onContextMenu,
}: {
  collection: StoredCollection;
  filter: string;
  onOpen: (item: CollectionItem) => void;
  onNewFolder: (parentId: string | null) => void;
  onDeleteCollection: () => void;
  onDeleteFolder: (id: string) => void;
  onDeleteRequest: (id: string) => void;
  onRenameCollection: (name: string) => void;
  onRenameItem: (itemId: string, name: string) => void;
  favorites?: FavoriteItem[];
  onToggleFavorite?: (item: CollectionItem) => void;
  onContextMenu?: (e: React.MouseEvent, item: CollectionItem) => void;
}) {
  const [open, setOpen] = useState(true);
  const [renaming, setRenaming] = useState(false);
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
          className="shrink-0 text-neutral-500"
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        {open ? (
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
        ) : (
          <FolderClosed className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
        )}
        {renaming ? (
          <InlineRenameInput
            initial={collection.name}
            onCommit={(name) => { onRenameCollection(name); setRenaming(false); }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            onDoubleClick={() => setRenaming(true)}
            className="flex-1 truncate text-left text-xs font-semibold text-neutral-100"
          >
            {collection.name}
          </button>
        )}
        <button
          type="button"
          onClick={() => setRenaming(true)}
          className="rounded p-0.5 text-neutral-600 opacity-0 transition hover:bg-neutral-800 hover:text-neutral-200 group-hover:opacity-100"
          title="Rename"
        >
          <Pencil className="h-3 w-3" />
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
          onRenameItem={onRenameItem}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          collectionId={collection.id}
          onContextMenu={onContextMenu}
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
  onRenameItem,
  favorites,
  onToggleFavorite,
  collectionId,
  onContextMenu,
}: {
  items: CollectionItem[];
  depth: number;
  onOpen: (item: CollectionItem) => void;
  onNewFolder: (parentId: string | null) => void;
  onDeleteFolder: (id: string) => void;
  onDeleteRequest: (id: string) => void;
  onRenameItem: (itemId: string, name: string) => void;
  favorites?: FavoriteItem[];
  onToggleFavorite?: (item: CollectionItem) => void;
  collectionId?: string;
  onContextMenu?: (e: React.MouseEvent, item: CollectionItem) => void;
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
            onRenameItem={onRenameItem}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
            collectionId={collectionId}
            onContextMenu={onContextMenu}
          />
        ) : (
          <RequestRow
            key={it.id}
            request={it}
            depth={depth}
            onOpen={() => onOpen(it)}
            onDelete={() => onDeleteRequest(it.id)}
            onRename={(name) => onRenameItem(it.id, name)}
            isFavorite={favorites?.some((f) => f.collection_id === collectionId && f.request_id === it.id)}
            onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(it) : undefined}
            onContextMenu={onContextMenu ? (e) => onContextMenu(e, it) : undefined}
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
  onRenameItem,
  favorites,
  onToggleFavorite,
  collectionId,
  onContextMenu,
}: {
  folder: CollectionItem;
  depth: number;
  onOpen: (item: CollectionItem) => void;
  onNewFolder: (parentId: string | null) => void;
  onDeleteFolder: (id: string) => void;
  onDeleteRequest: (id: string) => void;
  onRenameItem: (itemId: string, name: string) => void;
  favorites?: FavoriteItem[];
  onToggleFavorite?: (item: CollectionItem) => void;
  collectionId?: string;
  onContextMenu?: (e: React.MouseEvent, item: CollectionItem) => void;
}) {
  const [open, setOpen] = useState(true);
  const [renaming, setRenaming] = useState(false);
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
          className="shrink-0 py-1 text-neutral-500"
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        {open ? (
          <FolderOpen className="mx-1 h-3 w-3 shrink-0 text-neutral-400" />
        ) : (
          <FolderClosed className="mx-1 h-3 w-3 shrink-0 text-neutral-400" />
        )}
        {renaming ? (
          <InlineRenameInput
            initial={folder.name}
            onCommit={(name) => { onRenameItem(folder.id, name); setRenaming(false); }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            onDoubleClick={() => setRenaming(true)}
            className="flex-1 truncate py-1 pr-2 text-left text-neutral-200"
          >
            {folder.name}
          </button>
        )}
        <button
          type="button"
          onClick={() => setRenaming(true)}
          className="rounded p-0.5 text-neutral-600 opacity-0 transition hover:bg-neutral-800 hover:text-neutral-200 group-hover:opacity-100"
          title="Rename"
        >
          <Pencil className="h-3 w-3" />
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
          onRenameItem={onRenameItem}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          collectionId={collectionId}
          onContextMenu={onContextMenu}
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
  onRename,
  isFavorite,
  onToggleFavorite,
  onContextMenu,
}: {
  request: CollectionItem;
  depth: number;
  onOpen: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const padLeft = `${1.25 + depth * 0.75}rem`;
  return (
    <div className="group flex items-center rounded text-xs hover:bg-neutral-800/60" onContextMenu={onContextMenu}>
      {renaming ? (
        <div className="flex flex-1 items-center gap-2 py-0.5" style={{ paddingLeft: padLeft }}>
          <span
            className={`w-9 shrink-0 font-mono text-[10px] font-bold tabular-nums ${
              request.method ? HTTP_METHOD_COLOR[request.method] : "text-neutral-400"
            }`}
          >
            {request.method ?? ""}
          </span>
          <InlineRenameInput
            initial={request.name}
            onCommit={(name) => { onRename(name); setRenaming(false); }}
            onCancel={() => setRenaming(false)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          onDoubleClick={(e) => { e.stopPropagation(); setRenaming(true); }}
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
      )}
      {onToggleFavorite && (
        <button
          type="button"
          onClick={onToggleFavorite}
          className={`rounded p-0.5 transition ${
            isFavorite
              ? "text-amber-500"
              : "text-neutral-600 opacity-0 hover:text-amber-400 group-hover:opacity-100"
          } hover:bg-neutral-800`}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Star className={`h-3 w-3 ${isFavorite ? "fill-amber-500" : ""}`} />
        </button>
      )}
      <button
        type="button"
        onClick={() => setRenaming(true)}
        className="rounded p-0.5 text-neutral-600 opacity-0 transition hover:bg-neutral-800 hover:text-neutral-200 group-hover:opacity-100"
        title="Rename"
      >
        <Pencil className="h-3 w-3" />
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
