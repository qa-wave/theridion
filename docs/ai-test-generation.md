# AI Test Generation — design

Status: **design / not yet implemented**.
Owner: next session.
Distinct from `apps/sidecar/theridion_sidecar/api/testgen.py` — *that one*
is spec-driven (OpenAPI / WSDL → categorised collection). *This one* is
**request-context-driven**: takes the active request + its last response
+ a user-picked category and asks an LLM (default: local Ollama) to
return an assertion list the user can review and apply.

## User-facing flow

1. **First-time setup** — in `Settings → AI`:
   - **Provider**: Ollama (default), OpenAI, Anthropic.
   - For Ollama: `base_url` (default `http://localhost:11434`) and
     `model` picked from a dropdown populated by hitting
     `GET {base_url}/api/tags`. "Test connection" button.
   - For OpenAI / Anthropic: API key + model. (Later — Ollama-first
     because it's local, free, and offline-safe.)
   - **Privacy footnote**: tell the user explicitly that request and
     response bodies leave the loopback only when they pick a cloud
     provider.

2. **Per-request** — every tab has a sparkles button (e.g. in the
   request-panel header next to "Tests"):

   ```
   [Params] [Headers] [Body] [Auth] [Tests] [✨ AI generate ▾]
   ```

   The dropdown picks the category:
   - **Health check** — one minimal assertion: status is success, fast.
   - **Smoke** — a handful of "obvious-things-must-hold" assertions
     based on the response shape.
   - **Regression** — a thorough set, including edge cases the LLM
     can hypothesise from the schema (null fields, negative paths,
     length / range / enum constraints).

3. **Preview panel** appears as a modal:
   - Generated assertions listed with checkboxes (user can deselect).
   - LLM "narrative" — one paragraph explaining what it did.
   - "Apply" pushes selected assertions into the active tab's
     `assertions[]` (the field already exists on `CollectionItem`).
   - "Regenerate" with a free-form note (e.g. "be stricter on
     `total_count`").

## Backend

### File-backed settings

```
~/.theridion/settings.json
```

```python
# theridion_sidecar/settings.py
class AISettings(BaseModel):
    provider: Literal["ollama", "openai", "anthropic"] = "ollama"
    ollama_base_url: str = "http://localhost:11434"
    model: str = "llama3.2"  # whatever's most common; user picks
    api_key: SecretStr | None = None  # for cloud providers
    request_timeout_seconds: float = 60.0

class Settings(BaseModel):
    ai: AISettings = Field(default_factory=AISettings)
    # Future: theme, telemetry opt-in, etc.
```

Same atomic-write pattern as `storage.py` / `environments.py`.

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/settings` | Read settings. Mask `api_key` to `***`. |
| PUT | `/api/settings` | Replace settings. |
| GET | `/api/ai/models` | Proxy to provider's "list models" — for Ollama hits `{base_url}/api/tags`. Returns `[{id, size}]`. |
| POST | `/api/ai/ping` | Round-trip a tiny prompt to verify connectivity. Returns `{ok, latency_ms, model_loaded}`. |
| POST | `/api/ai/testgen` | The main event — see below. |

### `/api/ai/testgen` contract

```python
class TestKind = Literal["health", "smoke", "regression"]

class AITestGenInput(BaseModel):
    kind: TestKind
    method: HttpMethod
    url: str
    request_headers: dict[str, str] = {}
    request_body: str | None = None
    # The most recent successful response — what the model uses as
    # ground truth for shape. Optional: if missing, the model gets the
    # request only and asserts on schema-agnostic things (status).
    response: ExecuteResponse | None = None
    user_note: str | None = None  # for "regenerate with..."

class AITestGenOutput(BaseModel):
    assertions: list[Assertion]  # reuse the existing Assertion schema
    narrative: str  # 1-3 sentences
    model: str  # echo back which model was used
    elapsed_ms: float
```

Why echo the model: when the user iterates ("regenerate"), the diff
between two runs is easier to reason about when the model is visible.

### Ollama HTTP client

Single file `theridion_sidecar/ai/ollama.py`:

```python
async def chat(base_url: str, model: str, messages: list[Message],
               format: Literal["json"] | None = None,
               timeout: float = 60.0) -> str:
    """POST {base}/api/chat with {model, messages, stream: false, format}.
    Returns content of the last assistant message."""
```

Important: Ollama supports `format: "json"` which forces the model to
return parseable JSON. **Use it** — saves us from regex extracting JSON
out of free-form prose.

### Prompt templates

`theridion_sidecar/ai/prompts.py` — one template per kind. Keep them in
Python so they're version-controlled and unit-testable.

Skeleton:

```
SYSTEM: You generate API test assertions. Output strictly JSON
matching the schema: { assertions: [...], narrative: "..." }.
Each assertion is one of:
  - { kind: "status", op: "eq"|"lt"|"gte", value: <int> }
  - { kind: "header", name: "...", op: "exists"|"eq"|"matches", value?: "..." }
  - { kind: "jsonpath", path: "$.foo.bar", op: "eq"|"exists"|"type"|"length", value?: <any> }
  - { kind: "latency", op: "lt", value: <ms> }
  - { kind: "body_contains", value: "..." }
Do NOT invent fields not present in the example response.

USER (health):
  Generate the **minimum** viable health check for this request.
  Exactly 1 assertion if the response is 2xx, otherwise 2 (status +
  one header / latency).

USER (smoke):
  Generate 3-6 happy-path assertions: status, content-type, one or two
  JSON-path checks on top-level required fields, and a generous
  latency cap.

USER (regression):
  Generate 8-15 assertions including:
  - exact status + status_text
  - content-type and content-length presence
  - every top-level JSON field's existence and type
  - any obvious invariants (non-negative counts, ISO date format,
    UUID format)
  - a tight latency cap (1.5× observed)
  Prefer breadth over depth.

THEN: the actual request + response JSON in fenced code blocks.
```

Keep the JSON schema definition in one place (`assertions.py`) and
**import** it into the prompt module — don't hand-type it twice.

### Determinism

For tests: keep the Ollama interaction injectable. The endpoint
should accept an overridable `client` param so unit tests can pass a
fake `chat()` that returns a canned response. Mock at the `ollama.chat`
boundary, not at httpx.

## Frontend

### Settings modal

New component `SettingsModal.tsx`, opened from:
1. **Status bar** — gear icon left of the version readout.
2. **Cmd+,** (Mac convention) — wire in App.tsx keyboard handler.

Layout: left rail of sections ("AI" is the first; later: Appearance,
Privacy, Network). Each section is its own functional component so
adding sections is cheap.

The AI section needs:
- Provider radio
- Conditional fields per provider
- "Test connection" button → POST `/api/ai/ping`, render
  `{ok, latency_ms, model_loaded}` inline.
- "Available models" dropdown — populated from `/api/ai/models` once
  the base URL is valid. Refresh button next to it.

### AI generate button

In `RequestPanel.tsx`, next to the existing tabs. A split button:

```tsx
<button className="…">
  <Sparkles /> AI generate
  <ChevronDown /> {/* opens the kind picker */}
</button>
```

Clicking the body sends with the **default kind** (= last used, default
"smoke"). Clicking the chevron opens a menu with the three kinds.

Disabled when:
- Settings not configured (`/api/settings` returns no model)
- Active tab has no response yet (let user run it first)

### Result modal

New `AITestPreviewModal.tsx`:
- List of assertions with checkboxes (`enabled` per row).
- The `narrative` paragraph at top.
- A "Regenerate with note…" textarea + button — re-fires
  `/api/ai/testgen` with `user_note`.
- "Apply" — calls `patchActive({ assertions: [...current,
  ...selected] })` and closes.

## Implementation order (one PR per step)

1. **Settings backend** — `settings.py`, `api/settings.py`, tests.
   GET/PUT round-trip.
2. **Settings UI** — `SettingsModal.tsx`, status-bar gear, Cmd+,.
3. **Ollama client + `/api/ai/ping` + `/api/ai/models`** — tests
   against a fake httpx transport.
4. **Prompt templates + `/api/ai/testgen`** — tests with a stubbed
   Ollama client.
5. **AI generate button + result modal** — wire to the active tab.
6. **E2E test** — Playwright spec that boots a fake Ollama server
   (just a tiny FastAPI handler) and walks the full flow:
   set settings → ping → generate → apply.

## Open questions

- **Streaming** — Ollama supports streaming responses (token-by-token).
  Worth it? For 8-15 assertions probably not — the model finishes in
  a few seconds and the UI shows a spinner. Skip streaming for v1.
- **Model warm-up** — first hit to Ollama loads the model into VRAM
  and is slow (~10 s for 7B models on Apple Silicon). The "Test
  connection" button should send a 1-token prompt to pre-warm.
- **Cost telemetry** — for cloud providers, sum token counts and show
  in the modal footer. Out of scope for v1.
- **Where to store the "last used kind" preference** — localStorage
  is fine; not worth a backend trip.

## Why Ollama-first

- **Privacy** — request/response bodies often contain secrets, PII, or
  proprietary schemas. Defaulting to a local model means the user
  opts in to leaving the machine, never out.
- **Offline** — desktop tool, devs on flights / VPN-restricted
  environments still get value.
- **Cost** — zero per-request cost lets us use the feature
  generously (regenerate twice, no-one cares).
- **Quality** — for assertion JSON, Llama 3.2 / Qwen 2.5 are easily
  good enough; this isn't a frontier reasoning task.

Cloud providers are additive, not the foundation.
