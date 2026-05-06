import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FolderClosed,
  FolderOpen,
  Plus,
  Search,
} from "lucide-react";
import type { Collection, CollectionItem } from "../state/types";
import { HTTP_METHOD_COLOR } from "../state/types";

interface Props {
  collections: Collection[];
  onOpen: (item: CollectionItem) => void;
}

export function Sidebar({ collections, onOpen }: Props) {
  const [query, setQuery] = useState("");

  return (
    <aside className="flex h-full flex-col bg-neutral-925 border-r border-neutral-800/80">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          Collections
        </span>
        <button
          type="button"
          className="ml-auto rounded p-1 text-neutral-500 transition hover:bg-neutral-800 hover:text-neutral-200"
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
        {collections.map((coll) => (
          <CollectionNode
            key={coll.id}
            collection={coll}
            filter={query.toLowerCase()}
            onOpen={onOpen}
          />
        ))}
      </div>
    </aside>
  );
}

function CollectionNode({
  collection,
  filter,
  onOpen,
}: {
  collection: Collection;
  filter: string;
  onOpen: (item: CollectionItem) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="select-none">
      <TreeRow
        depth={0}
        open={open}
        onToggle={() => setOpen(!open)}
        icon={open ? FolderOpen : FolderClosed}
        label={collection.name}
        bold
      />
      {open &&
        collection.folders.map((folder) => (
          <FolderNode
            key={folder.id}
            folder={folder}
            filter={filter}
            onOpen={onOpen}
          />
        ))}
    </div>
  );
}

function FolderNode({
  folder,
  filter,
  onOpen,
}: {
  folder: { id: string; name: string; items: CollectionItem[] };
  filter: string;
  onOpen: (item: CollectionItem) => void;
}) {
  const [open, setOpen] = useState(true);
  const items = filter
    ? folder.items.filter(
        (i) =>
          i.name.toLowerCase().includes(filter) ||
          i.url.toLowerCase().includes(filter),
      )
    : folder.items;
  if (filter && items.length === 0) return null;
  return (
    <div>
      <TreeRow
        depth={1}
        open={open}
        onToggle={() => setOpen(!open)}
        icon={open ? FolderOpen : FolderClosed}
        label={folder.name}
      />
      {open &&
        items.map((item) => (
          <button
            key={item.id}
            type="button"
            onDoubleClick={() => onOpen(item)}
            onClick={() => onOpen(item)}
            className="group flex w-full items-center gap-2 rounded px-2 py-1 pl-8 text-left text-xs text-neutral-300 transition hover:bg-neutral-800/60"
            title={item.url}
          >
            <span
              className={`w-9 shrink-0 font-mono text-[10px] font-bold tabular-nums ${HTTP_METHOD_COLOR[item.method]}`}
            >
              {item.method}
            </span>
            <span className="truncate">{item.name}</span>
          </button>
        ))}
    </div>
  );
}

function TreeRow({
  depth,
  open,
  onToggle,
  icon: Icon,
  label,
  bold,
}: {
  depth: number;
  open: boolean;
  onToggle: () => void;
  icon: typeof FolderClosed;
  label: string;
  bold?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="group flex w-full items-center gap-1 rounded px-2 py-1 text-left text-xs text-neutral-200 transition hover:bg-neutral-800/60"
      style={{ paddingLeft: `${0.25 + depth * 0.75}rem` }}
    >
      {open ? (
        <ChevronDown className="h-3 w-3 shrink-0 text-neutral-500" />
      ) : (
        <ChevronRight className="h-3 w-3 shrink-0 text-neutral-500" />
      )}
      <Icon className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
      <span className={`truncate ${bold ? "font-semibold text-neutral-100" : ""}`}>{label}</span>
    </button>
  );
}
