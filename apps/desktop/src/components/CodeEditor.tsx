import { useEffect, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";

interface Props {
  value: string;
  onChange?: (next: string) => void;
  language?: "json" | "xml" | "html" | "javascript" | "typescript" | "plaintext";
  /** Auto-pick a language from a Content-Type or content shape. */
  contentTypeHint?: string | null;
  readOnly?: boolean;
  /** Pixels — when omitted, fills its container via flex. */
  height?: number | string;
  placeholder?: string;
}

const DEFAULT_OPTIONS = {
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
  fontSize: 12,
  lineHeight: 18,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  cursorBlinking: "smooth" as const,
  cursorSmoothCaretAnimation: "on" as const,
  renderLineHighlight: "all" as const,
  guides: { indentation: false, highlightActiveIndentation: false },
  scrollbar: {
    vertical: "auto" as const,
    horizontal: "auto" as const,
    verticalScrollbarSize: 8,
    horizontalScrollbarSize: 8,
  },
  padding: { top: 8, bottom: 8 },
  tabSize: 2,
  wordWrap: "on" as const,
  fixedOverflowWidgets: true,
  formatOnPaste: false,
};

export function CodeEditor({
  value,
  onChange,
  language,
  contentTypeHint,
  readOnly = false,
  height,
  placeholder,
}: Props) {
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const lang = language ?? guessLanguage(value, contentTypeHint);

  const handleMount: OnMount = (editor, monaco) => {
    // Define a theme that matches our UI chrome — slightly lifted background
    // so the editor reads as a panel, not a hole.
    monaco.editor.defineTheme("theridion-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6b7280", fontStyle: "italic" },
        { token: "string.key.json", foreground: "7dd3fc" },
        { token: "string.value.json", foreground: "6ee7b7" },
        { token: "number", foreground: "fcd34d" },
        { token: "keyword.json", foreground: "c4b5fd" },
        { token: "tag", foreground: "f472b6" },
        { token: "attribute.name", foreground: "7dd3fc" },
        { token: "attribute.value", foreground: "6ee7b7" },
      ],
      colors: {
        "editor.background": "#101012",
        "editor.foreground": "#e5e5e5",
        "editorLineNumber.foreground": "#525252",
        "editorLineNumber.activeForeground": "#a3a3a3",
        "editor.lineHighlightBackground": "#161618",
        "editor.lineHighlightBorder": "#161618",
        "editorCursor.foreground": "#10b981",
        "editor.selectionBackground": "#10b98140",
        "editorBracketMatch.background": "#10b98130",
        "editorBracketMatch.border": "#10b98180",
      },
    });
    monaco.editor.setTheme("theridion-dark");
    setReady(true);
    // Re-layout after mount so the editor measures the container correctly
    // when it pops in inside a freshly-shown tab.
    requestAnimationFrame(() => editor.layout());
  };

  // Re-layout on container resize so the editor stays snug inside flex/grid.
  useEffect(() => {
    if (!ready || !containerRef.current) return;
    const obs = new ResizeObserver(() => {
      window.dispatchEvent(new Event("resize"));
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [ready]);

  const showPlaceholder =
    !!placeholder && value.length === 0 && !readOnly && ready;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <Editor
        height={height ?? "100%"}
        language={lang}
        value={value}
        theme="theridion-dark"
        onChange={(v) => onChange?.(v ?? "")}
        onMount={handleMount}
        loading={
          <div className="flex h-full items-center justify-center text-xs text-neutral-600">
            Loading editor…
          </div>
        }
        options={{ ...DEFAULT_OPTIONS, readOnly }}
      />
      {showPlaceholder && (
        <div className="pointer-events-none absolute left-12 top-2 font-mono text-xs text-neutral-700">
          {placeholder}
        </div>
      )}
    </div>
  );
}

function guessLanguage(
  value: string,
  contentType: string | null | undefined,
): Props["language"] {
  const ct = (contentType ?? "").toLowerCase();
  if (ct.includes("json")) return "json";
  if (ct.includes("xml") || ct.includes("soap")) return "xml";
  if (ct.includes("html")) return "html";
  if (ct.includes("javascript")) return "javascript";

  const head = value.trimStart().slice(0, 16);
  if (head.startsWith("{") || head.startsWith("[")) return "json";
  if (head.startsWith("<?xml") || head.startsWith("<")) return "xml";
  return "plaintext";
}
