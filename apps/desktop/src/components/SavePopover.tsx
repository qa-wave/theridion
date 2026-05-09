import { useEffect, useRef, useState } from "react";
import { FolderClosed, FolderPlus, X } from "lucide-react";
import type { StoredCollection } from "../lib/sidecar";

interface Props {
  open: boolean;
  collections: StoredCollection[];
  defaultName: string;
  onClose: () => void;
  onSave: (input: { collectionId: string; name: string }) => Promise<void>;
  onCreateCollection: (name: string) => Promise<StoredCollection>;
}

/** Floating popover anchored under the URL bar's Save button. */
export function SavePopover({
  open,
  collections,
  defaultName,
  onClose,
  onSave,
  onCreateCollection,
}: Props) {
  const [name, setName] = useState(defaultName);
  const [pickedId, setPickedId] = useState<string | null>(
    collections[0]?.id ?? null,
  );
  const [creatingNew, setCreatingNew] = useState(collections.length === 0);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Reset state whenever the popover opens.
  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setPickedId(collections[0]?.id ?? null);
    setCreatingNew(collections.length === 0);
    setNewCollectionName("");
    setError(null);
  }, [open, defaultName, collections]);

  // Close on Escape and outside-click.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener("keydown", onKey);
    // Defer the click-listener attach by a tick so the same click that
    // opened the popover doesn't immediately close it.
    const t = window.setTimeout(
      () => window.addEventListener("mousedown", onClick),
      0,
    );
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  async function handleSave() {
    setError(null);
    setBusy(true);
    try {
      let collectionId = pickedId;
      if (creatingNew) {
        const trimmed = newCollectionName.trim();
        if (!trimmed) {
          setError("Collection name can't be empty.");
          setBusy(false);
          return;
        }
        const created = await onCreateCollection(trimmed);
        collectionId = created.id;
      }
      if (!collectionId) {
        setError("Pick a collection or create one.");
        setBusy(false);
        return;
      }
      await onSave({ collectionId, name: name.trim() || defaultName });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Save request"
      className="absolute right-4 top-full z-30 mt-1 w-80 rounded-lg border border-neutral-700 bg-neutral-925 shadow-xl shadow-black/40"
    >
      <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Save request
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-3 p-3">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Search repos"
            className="w-full rounded border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 placeholder-neutral-600 focus:border-neutral-600 focus:outline-none"
            autoFocus
          />
        </Field>

        <Field label="Collection">
          <div className="max-h-44 overflow-y-auto rounded border border-neutral-800">
            {collections.map((c) => (
              <label
                key={c.id}
                className={`flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm transition ${
                  pickedId === c.id && !creatingNew
                    ? "bg-emerald-950/30 text-emerald-200"
                    : "text-neutral-200 hover:bg-neutral-800/60"
                }`}
              >
                <input
                  type="radio"
                  name="collection"
                  checked={pickedId === c.id && !creatingNew}
                  onChange={() => {
                    setPickedId(c.id);
                    setCreatingNew(false);
                  }}
                  className="h-3 w-3 cursor-pointer accent-emerald-500"
                />
                <FolderClosed className="h-3.5 w-3.5 text-neutral-400" />
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-[10px] text-neutral-500">
                  {c.items.length}
                </span>
              </label>
            ))}
            <label
              className={`flex cursor-pointer items-center gap-2 border-t border-neutral-800 px-2 py-1.5 text-sm transition ${
                creatingNew
                  ? "bg-emerald-950/30 text-emerald-200"
                  : "text-neutral-300 hover:bg-neutral-800/60"
              }`}
            >
              <input
                type="radio"
                name="collection"
                checked={creatingNew}
                onChange={() => setCreatingNew(true)}
                className="h-3 w-3 cursor-pointer accent-emerald-500"
              />
              <FolderPlus className="h-3.5 w-3.5 text-neutral-400" />
              <span>New collection…</span>
            </label>
          </div>
        </Field>

        {creatingNew && (
          <Field label="New collection name">
            <input
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="e.g. Onboarding"
              className="w-full rounded border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 placeholder-neutral-600 focus:border-neutral-600 focus:outline-none"
            />
          </Field>
        )}

        {error && (
          <p className="rounded border border-rose-900/60 bg-rose-950/30 px-2 py-1 text-xs text-rose-300">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300 transition hover:border-neutral-600 hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-neutral-700"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      {children}
    </label>
  );
}
