import { useEffect, useMemo, useState } from "react";
import { GitCompare, X } from "lucide-react";
import { sidecar, type CollectionItem, type StoredCollection } from "../lib/sidecar";
import { DiffEditor } from "@monaco-editor/react";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface FlatRequest {
  collectionId: string;
  collectionName: string;
  item: CollectionItem;
  label: string;
}

function flattenRequests(collections: StoredCollection[]): FlatRequest[] {
  const result: FlatRequest[] = [];
  function walk(colId: string, colName: string, items: CollectionItem[]) {
    for (const item of items) {
      if (item.is_folder) {
        if (item.items) walk(colId, colName, item.items);
      } else {
        result.push({
          collectionId: colId,
          collectionName: colName,
          item,
          label: `${item.method ?? "GET"} ${item.name} (${colName})`,
        });
      }
    }
  }
  for (const col of collections) walk(col.id, col.name, col.items);
  return result;
}

function requestToText(item: CollectionItem): string {
  const lines: string[] = [];
  lines.push(`${item.method ?? "GET"} ${item.url ?? ""}`);
  lines.push("");
  lines.push("--- Headers ---");
  if (item.headers && Object.keys(item.headers).length > 0) {
    for (const [k, v] of Object.entries(item.headers)) {
      lines.push(`${k}: ${v}`);
    }
  } else {
    lines.push("(none)");
  }
  lines.push("");
  lines.push("--- Body ---");
  if (item.body) {
    try {
      lines.push(JSON.stringify(JSON.parse(item.body), null, 2));
    } catch {
      lines.push(item.body);
    }
  } else {
    lines.push("(empty)");
  }
  if (item.auth && item.auth.type !== "none") {
    lines.push("");
    lines.push("--- Auth ---");
    lines.push(`Type: ${item.auth.type}`);
  }
  return lines.join("\n");
}

export function RequestDiffModal({ open, onClose }: Props) {
  const [collections, setCollections] = useState<StoredCollection[]>([]);
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open) { setLoaded(false); return; }
    if (loaded) return;
    setLoaded(true);
    sidecar.listCollections().then(async (summaries) => {
      const full = await Promise.all(summaries.map((s) => sidecar.getCollection(s.id)));
      setCollections(full);
    }).catch(() => {});
  }, [open, loaded]);

  const flatRequests = useMemo(() => flattenRequests(collections), [collections]);

  const leftItem = useMemo(
    () => flatRequests.find((r) => `${r.collectionId}/${r.item.id}` === leftId)?.item ?? null,
    [flatRequests, leftId],
  );
  const rightItem = useMemo(
    () => flatRequests.find((r) => `${r.collectionId}/${r.item.id}` === rightId)?.item ?? null,
    [flatRequests, rightId],
  );

  const leftText = leftItem ? requestToText(leftItem) : "";
  const rightText = rightItem ? requestToText(rightItem) : "";

  if (!open) return null;

  const selectClass = "w-full rounded-md border border-glass bg-neutral-900/50 px-3 py-1.5 text-xs text-neutral-100 focus:border-cobweb-500/40 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="glass flex h-[640px] w-[900px] max-h-[90vh] max-w-[95vw] animate-slide-in flex-col overflow-hidden rounded-xl border border-glass-light shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-glass px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-100">
            <GitCompare className="h-4 w-4 text-cobweb-400" /> Request Diff
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-neutral-500 transition hover:bg-white/[0.05] hover:text-neutral-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 border-b border-glass px-4 py-3">
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-neutral-500">Left</p>
            <select value={leftId} onChange={(e) => setLeftId(e.target.value)} className={selectClass}>
              <option value="">Select request...</option>
              {flatRequests.map((r) => (
                <option key={`${r.collectionId}/${r.item.id}`} value={`${r.collectionId}/${r.item.id}`}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-neutral-500">Right</p>
            <select value={rightId} onChange={(e) => setRightId(e.target.value)} className={selectClass}>
              <option value="">Select request...</option>
              {flatRequests.map((r) => (
                <option key={`${r.collectionId}/${r.item.id}`} value={`${r.collectionId}/${r.item.id}`}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {leftItem && rightItem ? (
            <DiffEditor
              original={leftText}
              modified={rightText}
              language="text"
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: "off",
                scrollBeyondLastLine: false,
                renderSideBySide: true,
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-neutral-500">
              Select two requests to compare
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
