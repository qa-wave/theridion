# Test Report: Theridion — Test Coverage Audit
**Od:** QA Tester
**Pro:** Projektový manažer, Vývojáři
**Datum:** 2026-05-09
**Projekt:** Theridion v0.0.1 — sprint coverage audit

---

## Shrnutí

| Suite | Soubory | Test cases | Stav |
|---|---|---|---|
| Sidecar pytest | 6 souborů | 75 testů | 75 pass, 0 fail |
| Rust unit tests | 1 soubor (sidecar.rs) | 3 testy | všechny pass |
| Playwright E2E | 4 spec soubory | 7 testů | all pass (~9 s) |
| **Celkem** | | **85** | |

Celkový stav: **75 sidecar + 3 Rust + 7 E2E = 85 testů, 0 selhání.**

Doporučení pro release: **podmíněně GO** — core flow funguje, ale existují
závažné mezery v pokrytí pro moduly na roadmapě.

---

## 1. Sidecar pytest — co je pokryto

### test_collections.py (16 testů)
- CRUD kolekcí: create, list, delete, 404 na neznámé ID
- Folder hierarchy: create, nested, save request into folder, delete folder + children
- Edge cases: atomic write, THERIDION_HOME override, legacy soubory bez `is_folder`
- **Pokrytí: vysoké.** Toto je nejlépe pokrytý modul.

### test_environments.py (14 testů)
- CRUD prostředí: create, list, rename, delete, 404
- Substituce `{{var}}`: known vars, unknown passthrough, disabled vars,
  whitespace inside braces, None env passthrough
- Integration přes `/api/requests/execute`: URL + headers + body substituce,
  unknown env 404, execute bez env

### test_curl.py (23 testů)
- Parser: GET, headers, POST data, `--data-raw`, Bearer, Basic `--user`,
  multiline, `$`-prefix, ignorované flags (`--compressed`, `--insecure`, `-L`)
- Generator: GET, POST s body, Bearer, Basic, API key header/query
- API endpoint round-trip: parse → generate → parse

### test_auth.py (9 testů)
- `_apply_auth`: Bearer, Basic (base64), API key header/query mode, noop pro None
- S env substitucí pro Bearer i Basic
- Persistence auth v kolekci, null při vynechání

### test_soap.py (5 testů)
- inspect: services + operations, soap action, invalid WSDL → 400
- execute: unknown operation → 404, transport error → fault

### test_advanced.py (8 testů)
- OpenAPI import/export + contract validation
- Variable inspector + dependency graph
- Vault snapshot diff + HAR roundtrip
- Flow runner + collection-backed mock
- Contract drift reports
- Proxy recorder (HAR)
- TLS inspector (certificate fields)
- Git review (collection JSON diff)

---

## 2. Playwright E2E — co je pokryto

### smoke.spec.ts (2 testy)
- App boots, status bar zobrazí "sidecar vX.Y.Z"
- Env dropdown defaultuje na "No env"
- **MISSING:** žádný test nepošle skutečný HTTP request přes UI

### collections.spec.ts (2 testy)
- Seed collection přes API → viditelné v sidebaru po reload
- Folder + nested request seed přes API → viditelné v tree
- **MISSING:** žádný test neotevře request z kolekce kliknutím,
  žádný test pro save flow (SavePopover), rename, delete přes UI

### environments.spec.ts (2 testy)
- Seed env přes API → zobrazí se v dropdownu
- Variables CRUD round-trip přes API
- **MISSING:** žádný test neověří, že vybraný env skutečně substituuje
  proměnné při odeslání requestu v UI

### soap.spec.ts (1 test)
- Inspect přes fixture WSDL → operations se zobrazí v modálu
- **MISSING:** execute SOAP operace přes UI

---

## 3. Analýza pokrytí — 114 API modulů

### Plně pokryté (dedicated test file nebo integration testy)
| Modul | Kde pokryt |
|---|---|
| `collections.py` | test_collections.py |
| `environments.py` | test_environments.py |
| `curl.py` | test_curl.py |
| `requests.py` | test_environments.py (execute), test_auth.py (_apply_auth) |
| `soap.py` | test_soap.py |
| `mock.py` | test_advanced.py (collection-backed mock) |
| `advanced.py` | test_advanced.py (8 scénářů) |

### Parciálně pokryté (nepřímý kontakt přes jiný test)
| Modul | Poznámka |
|---|---|
| `health.py` | E2E smoke test čte `/api/health` implicitně přes status bar |
| `diagnostics.py` | Není přímý test; endpoint existuje a je dokumentován |
| `auth` (model) | Testován přes `_apply_auth` v test_auth.py |

### NULOVÉ přímé pokrytí — 104 modulů

Níže jsou všechny moduly bez jediného testu. Rozděleny podle priority:

#### Priorita P1 — KRITICKÉ (na roadmapě Sprint 1–2, produktová propozice)

| Modul | Proč kritické |
|---|---|
| `runner.py` | Collection runner — Sprint 2 backbone; `_collect_requests` rekurze, assertions evaluation, env substituce — vše komplexní, žádný test |
| `assertions.py` | 273 řádků, 4 třídy, `evaluate()`, `_eval_json_path()`, `_resolve_path()`, `_loose_eq()` — čistá business logika, nulové pokrytí |
| `cookies.py` | Cookie jar s file persistence — Sprint 1 credibility feature; `load/save/clear/to_httpx_cookies/from_httpx_response` — 103 řádků, 0 testů |
| `globals.py` | Global variables s file persistence — analogické k environments.py, ale bez testu |
| `graphql.py` | GraphQL execution + introspection — Sprint 3, ale používá se v UI teď |
| `websocket.py` | WS proxy relay — Sprint 3 protokol |
| `loadtest.py` | Load testing core — Sprint 5; asyncio + httpx, statistiky, percentily |
| `oauth2.py` | OAuth2 — Sprint 1 auth helper |
| `oauth1.py` | OAuth1 — Sprint 1 auth helper |
| `ws_security.py` | WS-Security — Sprint 4 killer feature (naše propozice) |
| `xsd_validator.py` | XSD validation — Sprint 4 |
| `mtom.py` | MTOM/XOP attachments — Sprint 4 |

#### Priorita P2 — DŮLEŽITÉ (producence utility, UI-facing)

| Modul |
|---|
| `schema_validation.py` |
| `multipart.py` |
| `scripts.py` |
| `chaining.py` |
| `runner.py` (viz P1) |
| `jwt_inspect.py` |
| `cors_test.py` |
| `injection_scan.py` |
| `sensitive_data.py` |
| `ssl_inspect.py` |
| `redirect_chain.py` |
| `bru_format.py` |
| `yaml_collections.py` |
| `importer.py` |
| `codegen.py` |

#### Priorita P3 — NÍZKÁ (roadmapa Sprint 3–6, nebo "extra")

Zbývajících ~87 modulů bez pokrytí — kompletní seznam:
`ai`, `amf_protocol`, `api_catalog`, `api_governance`, `api_versioning`,
`apidocs`, `assertions` (viz P1), `batchrunner`, `body_modes`, `cli_reporters`,
`collection_branching`, `collection_docs`, `composite_project`,
`compression_stats`, `connection_stats`, `content_type_validator`,
`contract_drift`, `conversational_ai`, `cookie_manager`, `cookie_scripting`,
`curl_log`, `custom_dashboard`, `data_generator`, `data_loop`, `dns_inspect`,
`envdiff`, `error_patterns`, `examples`, `extras`, `favorites`, `flow_graph`,
`flows`, `groovy_engine`, `grpc_api`, `idempotency_check`, `integrations`,
`jdbc_query`, `jms_client`, `junit_reporter`, `kafka`, `keybindings`,
`latency_histogram`, `loadtest_compare`, `loadtest_patterns`, `mcp_server`,
`mock_diff`, `monitors`, `mqtt_client`, `multi_env_runner`, `npm_loader`,
`openapi_sync`, `pac_proxy`, `pagination_walker`, `project_encryption`,
`ratelimit_detect`, `request_console`, `response_trends`, `retry_tester`,
`secret_encryption`, `secret_managers`, `security_audit`, `servicemap`,
`sla_check`, `soap_coverage`, `team_workspaces`, `terminal`, `testgen`,
`throughput_timeline`, `timeline`, `token_refresh`, `universal_import`,
`user_simulation`, `visual_test_builder`, `visualizer`, `vscode_api`,
`waterfall`, `webhooks`, `workspace`, `wsdl_mock_gen`, `wsdl_refactor`

---

## 4. Nalezené bugy a rizika

### BUG-001: Žádný conftest.py — client fixture je duplikovaný ve 4 test souborech
**Závažnost:** Střední
**Priorita:** P2
**Popis:** Každý z test_collections.py, test_environments.py, test_advanced.py,
test_auth.py definuje vlastní `client` fixture identickým kódem
(`monkeypatch.setenv("THERIDION_HOME", ...)` + `TestClient(create_app())`).
Kdykoli se změní způsob inicializace aplikace, je nutné to opravit na 4 místech.
**Oprava:** Extrahovat do `tests/conftest.py`.
**Přiřazeno:** Backend vývojář

### BUG-002: assertions.py — 273 řádků business logiky bez jediného testu
**Závažnost:** Vysoká
**Priorita:** P1
**Popis:** `_resolve_path()` (JSONPath navigation), `_loose_eq()` (type coercion),
`_eval_json_path()` (missing-key chování) — to jsou přesně místa kde tichá
regrese může způsobit špatné výsledky assertion evaluace bez jakéhokoliv signálu.
Obzvláště riziková je `_loose_eq()` — porovnává čísla jako stringy, None handling.

### BUG-003: runner.py — collection runner bez testu
**Závažnost:** Vysoká
**Priorita:** P1
**Popis:** `_collect_requests()` dělá rekurzivní DFS přes folder tree, `run_collection()`
volá `evaluate_all()` z assertions.py (taky bez testu). Kombinace dvou nepokrytých
komponent = riziko silent regrese při jakékoliv změně storage modelu.

### BUG-004: cookies.py — file persistence bez testu
**Závažnost:** Střední
**Priorita:** P1
**Popis:** `from_httpx_response()` mapuje `httpx.Response` cookies do `StoredCookie`
modelu — tato funkce je volána z `requests.py` execute po každém requestu.
Neexistuje test, který by ověřil persist → load → inject cycle.

### BUG-005: Chybějící test pro `requests.py` — timeout, network error, follow_redirects
**Závažnost:** Střední
**Priorita:** P2
**Popis:** `execute()` endpoint má logiku pro `timeout_seconds`, `follow_redirects`,
a `httpx.TimeoutException` → 502. Pouze env substituce path je pokryta.
HTTP error (4xx/5xx), timeout, a invalid URL nejsou testovány.

### BUG-006: E2E — žádný test pro odesílání requestu přes UI
**Závažnost:** Vysoká
**Priorita:** P1
**Popis:** Nejdůležitější uživatelský flow — vyplnit URL, kliknout Send, vidět response —
nemá žádný E2E test. Komentář v collections.spec.ts odkazuje na `save.spec.ts`,
který neexistuje. Regrese v RequestPanel nebo sidecar execute endpoint by
prošla bez povšimnutí.

### BUG-007: E2E — workers=1, sdílené /tmp/theridion-e2e, pořadí souborů
**Závažnost:** Nízká (latentní riziko)
**Priorita:** P3
**Popis:** globalSetup vymaže `/tmp/theridion-e2e` jednou před celou suitou.
collections.spec.ts dělá beforeEach DELETE cleanup, ale ostatní specs
na čistý stav spoléhají implicitně (smoke.spec.ts komentář to přiznává).
Pokud se přidá spec, který zanechá "dirty state", může to rozbít testy
závislé na prázdném prostředí — a debug bude záludný kvůli pořadí
abecedního spuštění (collections → environments → smoke → soap).

### BUG-008: websockets DeprecationWarning v test_advanced.py
**Závažnost:** Nízká
**Priorita:** P3
**Popis:**
```
DeprecationWarning: websockets.legacy is deprecated
DeprecationWarning: websockets.server.WebSocketServerProtocol is deprecated
```
Tyto warnings se zobrazují při `test_flow_runner_and_collection_backed_mock`.
Naznačuje použití `websockets.legacy` API, které bude v budoucí verzi odstraněno.
**Přiřazeno:** Backend vývojář (migrovat na websockets 14+ API)

### BUG-009: `# noqa: E731` — lambda assignment v requests.py
**Závažnost:** Nízká
**Priorita:** P3
**Umístění:** `apps/sidecar/theridion_sidecar/api/requests.py:63`
```python
sub = lambda v: environments.substitute(v, env) if v else ""  # noqa: E731
```
Suppress zakrývá ruff warning. Funkci pojmenovat `_sub()` by bylo čistší.

### BUG-010: `# type: ignore[arg-type]` — 3 výskyty v advanced.py + curl.py
**Závažnost:** Nízká
**Priorita:** P3
**Umístění:**
- `advanced.py:315`, `advanced.py:1286`, `advanced.py:1508`
- `curl.py:136`

Všechny se vztahují k `method=method` kde `method` je `str` místo `Literal[...]`.
Žádný test nezachytí, pokud se literal type změní. Snadná oprava: explicitní
`cast()` nebo `assert method in VALID_METHODS`.

---

## 5. Automatizované testy — pokrytí

### Aktuální stav

| Typ | Počet | Prošlo | Selhalo |
|---|---|---|---|
| Sidecar pytest | 75 | 75 | 0 |
| Rust unit (sidecar handshake) | 3 | 3 | 0 |
| E2E — Playwright | 7 | 7 | 0 |

### Pokrytí API modulů

| Kategorie | Počet modulů | Pokryto | Nepokryto |
|---|---|---|---|
| Plně pokryto | 7 | 7 | 0 |
| Parciálně | 3 | — | — |
| Nulové pokrytí | 104 | 0 | 104 |
| **Celkem** | **114** | **~9%** | **~91%** |

---

## 6. Test data management

### Co funguje dobře
- `tmp_path` + `monkeypatch.setenv("THERIDION_HOME", ...)` = hermetic sidecar tests
- `global-setup.ts` maže `/tmp/theridion-e2e` před každým E2E runem
- `calculator.wsdl` fixture je checked-in → SOAP testy nepoužívají síť

### Problémy

**E2E sdílená state:** Workers=1 a jediný global cleanup nestačí pro budoucí
paralelní testy nebo testy co potřebují konzistentní prázdný stav v každém testu.
`collections.spec.ts` to řeší vlastním `beforeEach` DELETE — ostatní specs by měly
dělat totéž nebo sdílet helper.

**Žádné httpbin-style echo server:** `test_environments.py` popisuje `execute`
test "using httpbin-style echo" ale ve skutečnosti mockuje transport error.
Testy pro HTTP responses (status codes, response body, headers) závisí na
síťovém přístupu k `httpbin.org` nebo alternativě. Pro CI je to fragile.
Doporučení: bundlovat minimální echo server (např. `uvicorn` app s `httpx`) jako
pytest fixture.

**Fixture coverage:** Pouze `calculator.wsdl` je jako fixture. Pro testy jako
injection_scan, schema_validation, xsd_validator by byly potřeba XML/JSON schema
fixtures.

---

## 7. Flaky test rizika

| Riziko | Pravděpodobnost | Dopad |
|---|---|---|
| test_flow_runner: WebSocket legacy API deprecated | Střední — bude breaking change v websockets 15 | Střední |
| E2E ordering dependency (collections dirtying smoke state) | Nízká (smoke neassertuje prázdný stav) | Nízká |
| `/tmp/theridion-e2e` collision mezi parallel CI runners | Vysoká pokud CI spustí matici | Vysoká |
| `test_execute_returns_fault_when_transport_unreachable` závisí na chybovém chování síťového stacku | Nízká | Nízká |
| PyInstaller cold start > 10 s na pomalém CI → E2E sidecar startup timeout | Střední | Střední |

---

## 8. Doporučení

### Před jakýmkoliv releasem (blocker)

1. **Napsat `tests/test_assertions.py`** — pokrýt `evaluate()` pro všechny
   `type` hodnoty (status, header, json_path, response_time, body_contains),
   `_resolve_path()` pro nested paths a missing keys, `_loose_eq()` pro edge
   cases (number/string, None, bool).

2. **Napsat `tests/test_runner.py`** — pokrýt `_collect_requests()` s nested
   folders, `run_collection()` s assertions, 404 na neznámou collection/env.

3. **E2E: přidat `send.spec.ts`** — vyplnit URL (lokální echo endpoint), kliknout
   Send, ověřit response panel zobrazí status 200 a body. Toto je kritický uživatelský
   flow bez jakéhokoli pokrytí.

### Sprint 1 (před auth/cookie features)

4. **Napsat `tests/test_cookies.py`** — pokrýt persist → load → inject cycle.
   Obzvláště `from_httpx_response()` a `to_httpx_cookies()`.

5. **Napsat `tests/test_globals.py`** — analogicky k test_environments.py (CRUD +
   persistence).

6. **Extrahovat `client` fixture do `tests/conftest.py`** — odstraní 4× duplicitu.

7. **Přidat pytest fixture pro lokální echo server** — nahradit závislost na síti
   v execute testech (`httpbin.org` je fragile v CI).

### Sprint 2 (před collection runner UI)

8. **E2E: přidat `runner.spec.ts`** — seed collection, spustit runner přes UI,
   ověřit výsledky.

9. **Napsat `tests/test_requests.py`** — pokrýt timeout → 502, 4xx/5xx response,
   follow_redirects=False, invalid URL.

10. **Opravit WebSocket legacy API** (BUG-008) — migrovat na websockets 14+ API
    před tím, než se WebSocket feature dostane do UI.

### Housekeeping (kdykoli)

11. **Refaktorovat `requests.py:63`** — pojmenovat lambda jako `_sub()`.
12. **Opravit `type: ignore` v curl.py a advanced.py** — přidat explicitní cast.
13. **Per-test storage isolation v E2E** — zvážit per-test `THERIDION_HOME` tmpdir
    pro budoucí paralelní Playwright workers.

---

## Další kroky
- BUG-001 (conftest.py) a BUG-002 (assertions tests) může udělat backend vývojář
  nezávisle
- BUG-006 (send.spec.ts E2E) je blokováno tím, že musí existovat lokální echo
  endpoint nebo veřejný mock server
- BUG-008 (websockets deprecation) — backend task

---

```
---HANDOFF---
OD: QA Tester
KOMU: projektovy-manazer
STATUS: hotovo
VÝSTUP: /Users/tm/workspaces/projects/theridion/docs/qa-test-coverage-audit.md
DALŠÍ KROK: PM rozhodne prioritu — doporučuji začít s BUG-002 (test_assertions.py)
  a BUG-006 (send.spec.ts) jako prvními dvěma tasky pro backend a frontend vývojáře.
OTÁZKY:
  1. Má smysl dodat lokální echo server jako pytest + playwright fixture hned nyní,
     nebo až před Sprint 2?
  2. assertions.py a runner.py — kdo má kapacitu napsat testy (backend vývojář)?
---/HANDOFF---
```
