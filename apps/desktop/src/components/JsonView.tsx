/**
 * Lightweight JSON syntax highlighter — no external deps.
 *
 * Tokenizes a (pretty-printed) JSON string into spans for keys, strings,
 * numbers, booleans, null, and punctuation. Falls back to plain text if
 * the input doesn't parse cleanly.
 */

interface Props {
  text: string;
  /** When true, render with line numbers in a gutter. */
  withLineNumbers?: boolean;
}

type Token =
  | { kind: "key"; value: string }
  | { kind: "string"; value: string }
  | { kind: "number"; value: string }
  | { kind: "literal"; value: string }
  | { kind: "punct"; value: string }
  | { kind: "ws"; value: string };

const COLOR: Record<Token["kind"], string> = {
  key: "text-sky-300",
  string: "text-emerald-300",
  number: "text-amber-300",
  literal: "text-violet-300",
  punct: "text-neutral-500",
  ws: "",
};

export function JsonView({ text, withLineNumbers = true }: Props) {
  const tokens = tokenize(text);
  const lines = splitLines(tokens);

  if (!withLineNumbers) {
    return (
      <pre className="overflow-auto p-3 font-mono text-xs leading-relaxed text-neutral-200">
        <code>{renderTokens(tokens)}</code>
      </pre>
    );
  }

  return (
    <div className="flex overflow-auto font-mono text-xs leading-relaxed">
      <div className="select-none border-r border-neutral-800 bg-neutral-925 py-3 pl-3 pr-2 text-right text-neutral-600">
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <pre className="flex-1 py-3 pl-3 pr-3 text-neutral-200">
        <code>
          {lines.map((toks, i) => (
            <div key={i}>
              {toks.length === 0 ? " " : renderTokens(toks)}
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}

function renderTokens(tokens: Token[]): React.ReactNode[] {
  return tokens.map((t, i) => (
    <span key={i} className={COLOR[t.kind]}>
      {t.value}
    </span>
  ));
}

function splitLines(tokens: Token[]): Token[][] {
  const lines: Token[][] = [[]];
  for (const t of tokens) {
    if (t.kind === "ws" && t.value.includes("\n")) {
      const parts = t.value.split("\n");
      // first part stays on current line
      if (parts[0]) lines[lines.length - 1].push({ kind: "ws", value: parts[0] });
      // each newline starts a new line; the leading ws on that line is parts[i]
      for (let i = 1; i < parts.length; i++) {
        lines.push([]);
        if (parts[i]) lines[lines.length - 1].push({ kind: "ws", value: parts[i] });
      }
    } else {
      lines[lines.length - 1].push(t);
    }
  }
  return lines;
}

function tokenize(input: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  const n = input.length;
  while (i < n) {
    const ch = input[i];
    if (ch === '"') {
      // string — peek ahead for the closing quote, account for escapes
      let j = i + 1;
      while (j < n) {
        if (input[j] === "\\") {
          j += 2;
          continue;
        }
        if (input[j] === '"') break;
        j++;
      }
      const end = Math.min(j + 1, n);
      const value = input.slice(i, end);
      // is this a key? check next non-ws char for ':'
      let k = end;
      while (k < n && /\s/.test(input[k])) k++;
      const isKey = input[k] === ":";
      out.push({ kind: isKey ? "key" : "string", value });
      i = end;
      continue;
    }
    if (/\s/.test(ch)) {
      let j = i;
      while (j < n && /\s/.test(input[j])) j++;
      out.push({ kind: "ws", value: input.slice(i, j) });
      i = j;
      continue;
    }
    if (/[-0-9]/.test(ch)) {
      const m = input.slice(i).match(/^-?\d+(\.\d+)?([eE][+-]?\d+)?/);
      if (m) {
        out.push({ kind: "number", value: m[0] });
        i += m[0].length;
        continue;
      }
    }
    if (input.startsWith("true", i)) {
      out.push({ kind: "literal", value: "true" });
      i += 4;
      continue;
    }
    if (input.startsWith("false", i)) {
      out.push({ kind: "literal", value: "false" });
      i += 5;
      continue;
    }
    if (input.startsWith("null", i)) {
      out.push({ kind: "literal", value: "null" });
      i += 4;
      continue;
    }
    if ("{}[]:,".includes(ch)) {
      out.push({ kind: "punct", value: ch });
      i++;
      continue;
    }
    // unknown char — emit as ws to avoid losing it
    out.push({ kind: "ws", value: ch });
    i++;
  }
  return out;
}
