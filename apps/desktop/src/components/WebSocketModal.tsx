import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plug, PlugZap, Send, Trash2, Wifi, X } from "lucide-react";
import { getSidecarBaseUrl } from "../lib/sidecar";

interface WsMessage {
  direction: "sent" | "received";
  data: string;
  timestamp: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function WebSocketModal({ open, onClose }: Props) {
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState("");
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [messages, setMessages] = useState<WsMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  // Cleanup on close.
  useEffect(() => {
    if (!open && wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setStatus("disconnected");
    }
  }, [open]);

  if (!open) return null;

  function parseHeaders(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const line of headers.split("\n")) {
      const idx = line.indexOf(":");
      if (idx > 0) out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    return out;
  }

  async function connect() {
    if (!url.trim()) return;
    setError(null);
    setStatus("connecting");

    const baseUrl = await getSidecarBaseUrl();
    const wsUrl = baseUrl.replace(/^http/, "ws") + "/api/ws/proxy";

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ url: url.trim(), headers: parseHeaders() }));
      };

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === "connected") {
          setStatus("connected");
        } else if (msg.type === "message") {
          setMessages((prev) => [...prev, {
            direction: "received",
            data: msg.data,
            timestamp: msg.timestamp,
          }]);
        } else if (msg.type === "disconnected") {
          setStatus("disconnected");
          wsRef.current = null;
        } else if (msg.type === "error") {
          setError(msg.message);
          setStatus("disconnected");
          wsRef.current = null;
        }
      };

      ws.onerror = () => {
        setError("Connection failed");
        setStatus("disconnected");
        wsRef.current = null;
      };

      ws.onclose = () => {
        setStatus("disconnected");
        wsRef.current = null;
      };
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("disconnected");
    }
  }

  function disconnect() {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "close" }));
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus("disconnected");
  }

  function sendMessage() {
    if (!draft.trim() || !wsRef.current || status !== "connected") return;
    wsRef.current.send(JSON.stringify({ type: "send", data: draft }));
    setMessages((prev) => [...prev, { direction: "sent", data: draft, timestamp: Date.now() }]);
    setDraft("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="glass flex h-[600px] w-[800px] max-h-[90vh] max-w-[95vw] animate-slide-in flex-col overflow-hidden rounded-xl border border-glass-light shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-glass px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-100">
            <Wifi className="h-4 w-4 text-cobweb-400" />
            WebSocket
            {status === "connected" && (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                CONNECTED
              </span>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-neutral-500 transition hover:bg-white/[0.05] hover:text-neutral-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* URL bar */}
        <div className="flex items-center gap-2 border-b border-glass px-4 py-2.5">
          <span className="shrink-0 rounded bg-cobweb-600/20 px-2 py-0.5 text-[10px] font-bold text-cobweb-300">
            WS
          </span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="wss://echo.websocket.org"
            disabled={status === "connected"}
            className="flex-1 rounded-md border border-glass bg-neutral-900/50 px-3 py-1.5 font-mono text-xs text-neutral-100 placeholder-neutral-600 focus:border-cobweb-500/40 focus:outline-none disabled:opacity-50"
            spellCheck={false}
            onKeyDown={(e) => { if (e.key === "Enter" && status === "disconnected") connect(); }}
          />
          {status === "disconnected" ? (
            <button
              type="button"
              onClick={connect}
              disabled={!url.trim()}
              className="bg-accent-gradient inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium text-white shadow-glow-sm transition disabled:opacity-40 disabled:shadow-none"
            >
              <Plug className="h-3.5 w-3.5" />
              Connect
            </button>
          ) : status === "connecting" ? (
            <button disabled className="inline-flex items-center gap-1.5 rounded-md border border-glass px-4 py-1.5 text-xs text-neutral-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Connecting
            </button>
          ) : (
            <button
              type="button"
              onClick={disconnect}
              className="inline-flex items-center gap-1.5 rounded-md border border-rose-800/40 bg-rose-950/20 px-4 py-1.5 text-xs text-rose-400 transition hover:bg-rose-950/40"
            >
              <PlugZap className="h-3.5 w-3.5" />
              Disconnect
            </button>
          )}
        </div>

        {/* Headers (collapsible) */}
        {status === "disconnected" && (
          <div className="border-b border-glass px-4 py-2">
            <p className="mb-1 text-[10px] uppercase tracking-widest text-neutral-500">Headers</p>
            <textarea
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              placeholder="Authorization: Bearer ..."
              rows={2}
              className="w-full rounded-md border border-glass bg-neutral-900/50 px-2 py-1 font-mono text-xs text-neutral-100 placeholder-neutral-600 focus:border-cobweb-500/40 focus:outline-none"
              spellCheck={false}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="border-b border-rose-800/30 bg-rose-950/20 px-4 py-2 text-xs text-rose-400">
            {error}
          </div>
        )}

        {/* Message log */}
        <div ref={logRef} className="flex-1 overflow-y-auto p-2">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-xs text-neutral-600">
              <Wifi className="mb-2 h-8 w-8 text-neutral-800" />
              {status === "connected" ? "Waiting for messages..." : "Connect to start"}
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 rounded-md px-3 py-2 text-xs ${
                    m.direction === "sent"
                      ? "bg-cobweb-950/20 border border-cobweb-800/20"
                      : "bg-neutral-900/40 border border-glass"
                  }`}
                >
                  {m.direction === "sent" ? (
                    <ArrowUp className="mt-0.5 h-3 w-3 shrink-0 text-cobweb-400" />
                  ) : (
                    <ArrowDown className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                  )}
                  <pre className="flex-1 whitespace-pre-wrap break-all font-mono text-neutral-200">
                    {m.data}
                  </pre>
                  <span className="shrink-0 text-[10px] text-neutral-600">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Send bar */}
        {status === "connected" && (
          <div className="flex items-center gap-2 border-t border-glass px-4 py-2.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-md border border-glass bg-neutral-900/50 px-3 py-1.5 font-mono text-xs text-neutral-100 placeholder-neutral-600 focus:border-cobweb-500/40 focus:outline-none"
              spellCheck={false}
              onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
              autoFocus
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!draft.trim()}
              className="bg-accent-gradient inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium text-white shadow-glow-sm transition disabled:opacity-40 disabled:shadow-none"
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </button>
            <button
              type="button"
              onClick={() => setMessages([])}
              className="rounded-md p-1.5 text-neutral-500 transition hover:bg-white/[0.05] hover:text-neutral-300"
              title="Clear messages"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
