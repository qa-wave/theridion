import { useEffect, useRef, useState } from "react";
import { KeyRound, Loader2, X, ExternalLink, RefreshCw, Check, Copy } from "lucide-react";
import {
  sidecar,
  type OAuth2AuthorizeUrlOutput,
  type OAuth2TokenOutput,
} from "../lib/sidecar";

interface Props {
  open: boolean;
  onClose: () => void;
  onUseToken?: (token: string) => void;
}

type Step = "configure" | "waiting" | "result";

interface ProviderPreset {
  label: string;
  auth_url: string;
  token_url: string;
  scope: string;
}

const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    label: "GitHub",
    auth_url: "https://github.com/login/oauth/authorize",
    token_url: "https://github.com/login/oauth/access_token",
    scope: "read:user repo",
  },
  {
    label: "Google",
    auth_url: "https://accounts.google.com/o/oauth2/v2/auth",
    token_url: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
  },
  {
    label: "Auth0",
    auth_url: "https://YOUR_DOMAIN.auth0.com/authorize",
    token_url: "https://YOUR_DOMAIN.auth0.com/oauth/token",
    scope: "openid profile email",
  },
  {
    label: "Okta",
    auth_url: "https://YOUR_DOMAIN.okta.com/oauth2/default/v1/authorize",
    token_url: "https://YOUR_DOMAIN.okta.com/oauth2/default/v1/token",
    scope: "openid profile email",
  },
];

export function OAuth2FlowModal({ open, onClose, onUseToken }: Props) {
  const [step, setStep] = useState<Step>("configure");
  const [authUrl, setAuthUrl] = useState("");
  const [tokenUrl, setTokenUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [scope, setScope] = useState("");
  const [redirectUri, setRedirectUri] = useState("http://localhost:9876/oauth2/callback");
  const [usePkce, setUsePkce] = useState(true);

  const [, setAuthorizeResult] = useState<OAuth2AuthorizeUrlOutput | null>(null);
  const [tokenResult, setTokenResult] = useState<OAuth2TokenOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up polling on unmount or close
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  if (!open) return null;

  function reset() {
    setStep("configure");
    setAuthorizeResult(null);
    setTokenResult(null);
    setError(null);
    setBusy(false);
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function applyPreset(preset: ProviderPreset) {
    setAuthUrl(preset.auth_url);
    setTokenUrl(preset.token_url);
    setScope(preset.scope);
  }

  async function startFlow() {
    if (!authUrl.trim() || !tokenUrl.trim() || !clientId.trim()) return;
    setBusy(true);
    setError(null);

    try {
      // 1. Start callback server
      await sidecar.oauth2StartCallback(9876, 300);

      // 2. Generate authorize URL
      const result = await sidecar.oauth2AuthorizeUrl({
        auth_url: authUrl,
        client_id: clientId,
        redirect_uri: redirectUri,
        scope,
        use_pkce: usePkce,
      });
      setAuthorizeResult(result);

      // 3. Open URL in system browser
      window.open(result.url, "_blank");

      // 4. Switch to waiting step and start polling
      setStep("waiting");
      setBusy(false);

      pollRef.current = setInterval(async () => {
        try {
          const poll = await sidecar.oauth2PollResult();
          if (poll.status === "received" && poll.code) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            await exchangeCode(poll.code, result.code_verifier);
          } else if (poll.status === "expired" || poll.status === "not_running") {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setError("Authorization timed out or callback server stopped.");
            setStep("configure");
          } else if (poll.error) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setError(`Authorization error: ${poll.error}`);
            setStep("configure");
          }
        } catch {
          // Ignore transient poll errors
        }
      }, 1000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  async function exchangeCode(code: string, codeVerifier: string | null) {
    setBusy(true);
    setError(null);
    try {
      const result = await sidecar.oauth2Token({
        token_url: tokenUrl,
        client_id: clientId,
        client_secret: clientSecret || undefined,
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier || undefined,
      });
      setTokenResult(result);
      setStep("result");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setStep("configure");
    } finally {
      setBusy(false);
    }
  }

  async function handleRefresh() {
    if (!tokenResult?.refresh_token) return;
    setBusy(true);
    setError(null);
    try {
      const result = await sidecar.oauth2Refresh({
        token_url: tokenUrl,
        refresh_token: tokenResult.refresh_token,
        client_id: clientId,
        client_secret: clientSecret || undefined,
      });
      setTokenResult(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function handleUseToken() {
    if (tokenResult?.access_token && onUseToken) {
      onUseToken(tokenResult.access_token);
      onClose();
    }
  }

  async function handleCancel() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    try {
      await sidecar.oauth2StopCallback();
    } catch {
      // ignore
    }
    reset();
  }

  function copyToken() {
    if (tokenResult?.access_token) {
      navigator.clipboard.writeText(tokenResult.access_token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="glass flex h-[620px] w-[640px] max-h-[90vh] max-w-[95vw] animate-slide-in flex-col overflow-hidden rounded-xl border border-glass-light shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-glass px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-100">
            <KeyRound className="h-4 w-4 text-cobweb-400" /> OAuth2 Authorization (PKCE)
          </div>
          <button
            type="button"
            onClick={() => { handleCancel(); onClose(); }}
            className="rounded-md p-1 text-neutral-500 transition hover:bg-white/[0.05] hover:text-neutral-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="border-b border-rose-800/30 bg-rose-950/20 px-4 py-2 text-xs text-rose-400">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Step: Configure */}
          {step === "configure" && (
            <>
              {/* Provider presets */}
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-wider text-neutral-500">
                  Provider Templates
                </p>
                <div className="flex flex-wrap gap-2">
                  {PROVIDER_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className="rounded-md border border-glass bg-neutral-900/50 px-2.5 py-1 text-xs text-neutral-300 transition hover:border-cobweb-500/40 hover:text-cobweb-300"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form fields */}
              <div className="space-y-3">
                <Field label="Authorization URL" value={authUrl} onChange={setAuthUrl} placeholder="https://provider.com/oauth2/authorize" />
                <Field label="Token URL" value={tokenUrl} onChange={setTokenUrl} placeholder="https://provider.com/oauth2/token" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Client ID" value={clientId} onChange={setClientId} placeholder="your-client-id" />
                  <Field label="Client Secret (optional)" value={clientSecret} onChange={setClientSecret} placeholder="your-client-secret" type="password" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Scope" value={scope} onChange={setScope} placeholder="openid email profile" />
                  <Field label="Redirect URI" value={redirectUri} onChange={setRedirectUri} placeholder="http://localhost:9876/oauth2/callback" />
                </div>
                <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usePkce}
                    onChange={(e) => setUsePkce(e.target.checked)}
                    className="rounded border-neutral-600 bg-neutral-800 text-cobweb-500 focus:ring-cobweb-500/30"
                  />
                  Use PKCE (S256) — recommended for public clients
                </label>
              </div>

              <button
                type="button"
                onClick={startFlow}
                disabled={busy || !authUrl.trim() || !tokenUrl.trim() || !clientId.trim()}
                className="mt-2 inline-flex items-center gap-2 rounded-md bg-cobweb-600/20 px-4 py-2 text-xs font-medium text-cobweb-400 transition hover:bg-cobweb-600/30 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                Authorize in Browser
              </button>
            </>
          )}

          {/* Step: Waiting */}
          {step === "waiting" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-cobweb-400" />
              <p className="text-sm text-neutral-300">Waiting for authorization...</p>
              <p className="text-xs text-neutral-500">
                Complete the login in your browser. The callback will be captured automatically.
              </p>
              <button
                type="button"
                onClick={handleCancel}
                className="mt-4 rounded-md border border-glass px-3 py-1.5 text-xs text-neutral-400 transition hover:border-neutral-600 hover:text-neutral-200"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Step: Result */}
          {step === "result" && tokenResult && (
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-wider text-neutral-500">Access Token</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md border border-glass bg-neutral-900/50 px-3 py-2 font-mono text-xs text-emerald-400 break-all max-h-20 overflow-y-auto">
                    {tokenResult.access_token}
                  </code>
                  <button
                    type="button"
                    onClick={copyToken}
                    className="rounded-md p-1.5 text-neutral-500 transition hover:bg-white/[0.05] hover:text-neutral-200"
                    title="Copy token"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-[10px] uppercase text-neutral-500">Token Type</p>
                  <p className="text-neutral-300">{tokenResult.token_type}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-neutral-500">Expires In</p>
                  <p className="text-neutral-300">{tokenResult.expires_in ? `${tokenResult.expires_in}s` : "N/A"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-neutral-500">Scope</p>
                  <p className="text-neutral-300">{tokenResult.scope || "N/A"}</p>
                </div>
              </div>

              {tokenResult.refresh_token && (
                <div>
                  <p className="mb-1 text-[11px] uppercase tracking-wider text-neutral-500">Refresh Token</p>
                  <code className="block rounded-md border border-glass bg-neutral-900/50 px-3 py-2 font-mono text-xs text-neutral-400 break-all max-h-16 overflow-y-auto">
                    {tokenResult.refresh_token}
                  </code>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                {onUseToken && (
                  <button
                    type="button"
                    onClick={handleUseToken}
                    className="inline-flex items-center gap-2 rounded-md bg-emerald-600/20 px-3 py-1.5 text-xs font-medium text-emerald-400 transition hover:bg-emerald-600/30"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Use as Bearer Token
                  </button>
                )}
                {tokenResult.refresh_token && (
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-md bg-cobweb-600/20 px-3 py-1.5 text-xs font-medium text-cobweb-400 transition hover:bg-cobweb-600/30 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Refresh Token
                  </button>
                )}
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-md border border-glass px-3 py-1.5 text-xs text-neutral-400 transition hover:border-neutral-600 hover:text-neutral-200"
                >
                  Start Over
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Internal helper component ----

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] uppercase tracking-wider text-neutral-500">{label}</p>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-glass bg-neutral-900/50 px-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-600 focus:border-cobweb-500/40 focus:outline-none"
        spellCheck={false}
      />
    </div>
  );
}
