# Produktová vize: Theridion — Feature Proposals 2026-2027

**Od:** Produktový manažer
**Pro:** Business analytik, UX Designér, tým
**Datum:** 2026-05-09
**Projekt:** Theridion — open-source API testing platform

---

## Kontext a východisko

Theridion v0.1 je launch-ready s fungujícím core: REST/SOAP/GraphQL/gRPC/WebSocket,
file-based collections, Ollama AI testgen, 9 témat, 157 testů. Tržní podmínky v 2026
se výrazně posunuly — AI-first testing, MCP integrace a git-native workflows
jsou nové standardy, ne novinky.

Tento dokument mapuje 30 prioritizovaných funkcí pro 2026-2027.

---

## Strategická pozice pro 2026-2027

Naše propozice se vyostřuje:

> **Theridion = Bruno (git-native) + SoapUI (WS-* síla) + Playwright (trace runner)
> + AI, která pracuje lokálně a nikdy neodesílá data ven.**

AI je nyní osa, ne doplněk. Každý competitor přidává AI — ale všichni ho
dělají cloud-first (Postman Postbot = cloud API). Naše odpověď:
**AI-first, privacy-first, git-native**. Tři slova, která dohromady nikdo jiný nenabídne.

Postman přidal diffable YAML collections v březnu 2026 — to potvrzuje, že
git-native je winning bet. Theridion to má od začátku.

---

## CATEGORY A — Unique Differentiators (žádný competitor tohle nemá)

### A1 — AI Test Generation s Ollama (lokální, privacy-first)
**Popis:** Vygeneruj asserty, test scénáře a edge cases z response/schématu,
celé lokálně přes Ollama — žádný cloud API call.

**Proč to záleží:** Postman Postbot posílá data na Anthropic. Insomnia AI
posílá data na OpenAI. Theridion Ollama mode neposílá nic nikam. Pro enterprise
s NDA a regulovanými daty (banky, zdravotnictví) je tohle dealbreaker.
Gartner: 80% enterprise adoptuje AI testing do 2027 — a mnohé z nich nemohou
použít cloud AI nástroje.

**Effort:** M (základ existuje v docs/ai-test-generation.md, potřebuje UI polish
a prompt engineering)

---

### A2 — MCP Server — Theridion jako AI tool
**Popis:** Vystavit Theridion collections jako MCP server, takže Claude Desktop,
Cursor, Windsurf a jiní AI agenti mohou spouštět requests, číst responses
a generovat testy přímo z IDE.

**Proč to záleží:** MCP je de facto standard pro AI tool integration v 2026.
Vývojář v Cursoru napíše "otestuj tenhle endpoint" a AI spustí request
přes Theridion MCP — bez přepínání kontextu. Žádný API tester tohle dnes
nenabízí. Zombie modul `mcp_server` v backendu existuje — potřebuje
dokončení a UI.

**Effort:** M (backend základ existuje, potřebuje MCP protocol implementaci
a transport — stdio nebo SSE)

---

### A3 — Playwright-style HTML Trace Viewer pro Collection Runner
**Popis:** HTML report z test runu se waterfall timeline, request/response detail,
screenshotem chyby a diff view — vizuálně identický zážitek jako Playwright traces.

**Proč to záleží:** QA engineers kteří znají Playwright milují trace viewer.
Žádný API tester dnes nemá ekvivalent. JUnit XML je čitelný pro CI, ne pro lidi.
Trace viewer je naše unikátní diferenciace pro Petru (QA persona).

**Effort:** L (potřebuje CLI runner + HTML template engine + waterfall renderer)

---

### A4 — WS-Security: XML Signature a X.509
**Popis:** Kompletní WS-Security stack — UsernameToken, XML Signature (RSA-SHA256),
XML Encryption, X.509 certifikáty. Konfigurovatelné per-request nebo per-collection.

**Proč to záleží:** SoapUI / ReadyAPI je jedinou alternativou, stojí $699-7000/rok.
Enterprise SOAP integrace (banky, pojišťovny, státní správa) bez tohoto nemohou
existovat. Aktuálně máme UsernameToken — dokončit na full XML Signature
a X.509 je killer move.

**Effort:** M (signxml + xmlsec Python libs, UI pro certifikát upload)

---

### A5 — Self-Healing Test Assertions
**Popis:** AI detekuje, když assert selže kvůli změně schématu (ne kvůli bugu),
a navrhne opravu — "response.data.user_id se přejmenoval na response.data.id,
chceš aktualizovat assert?"

**Proč to záleží:** 60-80% testing time jde na maintenance, ne authoring.
Self-healing je #1 pain point v 2026. Nikdo tohle v API testování neřeší dobře
(Selenium má Healenium, API space je prázdný). Privacy-first: analýza probíhá
lokálně přes Ollama nebo volitelně přes cloud model.

**Effort:** L (vyžaduje diff engine, Ollama integration, UI pro "accept suggestion")

---

### A6 — Git-Native Collection Format s Diff-Friendly YAML
**Popis:** Primární formát collections přepsat na YAML (kompatibilní s Postman
diffable YAML z března 2026) s lidsky čitelným diff — každý request je
samostatný soubor, folders jsou adresáře.

**Proč to záleží:** Postman přidal diffable YAML v březnu 2026 — potvrzení
našeho kurzu. Bruno format je populární. Naše JSON je funkční ale méně
čitelná v PR diffech. YAML-per-file umožní skutečné code review API testů.

**Effort:** M (storage.py refactor + migrace z JSON + UI pro "open folder as collection")

---

## CATEGORY B — Market Parity (musí mít pro adopci)

### B1 — CLI Runner (`theridion test`)
**Popis:** `theridion test collections/api.yaml --env prod --reporter html`
spustí collection v headless módu, vrátí exit code 0/1, volitelně HTML trace.

**Proč to záleží:** CI/CD integrace je table stakes. Petra (QA) nemůže
doporučit tool týmu bez CLI. GitHub Actions, GitLab CI, Jenkins — všude
se potřebuje `theridion test`. Toto je #1 feature request od QA komunity.

**Effort:** M (FastAPI server existuje, potřebuje headless mode + CLI entry point)

---

### B2 — Auth: OAuth2, API Key, Bearer, Basic — kompletní sada
**Popis:** Auth tab v RequestPanel doplnit o OAuth2 Authorization Code + PKCE,
Client Credentials, Implicit flow. API Key jako header nebo query param.

**Proč to záleží:** Moderní API používá OAuth2. Jakub (enterprise dev) potřebuje
Client Credentials pro service-to-service. Bearer a Basic existují jako stub —
dokončit na production quality. Bez toho nemůžeme testovat 70% moderních API.

**Effort:** S (UI tab + httpx auth flows, OAuth2 token refresh automaticky)

---

### B3 — cURL Import a "Copy as cURL"
**Popis:** Importovat request z cURL příkazu (paste), exportovat request jako
cURL příkaz (clipboard).

**Proč to záleží:** Každý developer ví jak cURL. Je to lingua franca pro sdílení
requests. Postman to má od r. 2013. Bez tohoto je onboarding zbytečně těžký.
Stack Overflow odpovědi jsou cURL — developer chce paste a go.

**Effort:** S (curl parser v Pythonu, curl serializer, UI paste dialog)

---

### B4 — OpenAPI / Swagger Import a Sync
**Popis:** Importovat celou API kolekci z OpenAPI 3.x spec (JSON/YAML/URL).
Volitelně sync — pokud se spec změní, Theridion nabídne aktualizaci collection.

**Proč to záleží:** Většina moderních API má OpenAPI spec. Manuální vytváření
requestů z dokumentace je ztráta času. Import ze specifikace je fastest path
to value pro nového uživatele. Zombie modul `openapi_sync` existuje — dokončit.

**Effort:** M (openapi3 parser + collection generator + sync diff UI)

---

### B5 — Cookie Jar per Environment
**Popis:** Automaticky ukládat a posílat cookies per-environment. UI pro
prohlížení a editaci cookies. Session cookies pro přihlašovací flow testy.

**Proč to záleží:** Testování session-based autentikace (login → cookie → use)
je běžný pattern. httpx.AsyncClient to supportuje — potřebuje persistence a UI.

**Effort:** S (httpx cookies + JSON persistence + UI panel)

---

### B6 — Request History Panel
**Popis:** Posledních 500 requestů s timestamp, status, latencí. Replay libovolného
historického requestu. Filtrovat/hledat v historii.

**Proč to záleží:** "Jaký přesně request jsem poslal před hodinou?" je denní
potřeba každého API developera. Postman to má. Bruno to má. My chybíme.

**Effort:** S (SQLite log + UI panel + replay button)

---

### B7 — Inline Rename a Drag-Drop v Sidebar
**Popis:** Double-click na název requestu nebo složky pro inline rename. Drag-drop
pro přesun requestů mezi složkami.

**Proč to záleží:** Aktuální `prompt()` dialog pro rename je UX antipattern z 2005.
Pro uživatele migrující z Bruno nebo Postman je tohle první friction point.
Dobrý UX detail signalizuje "tenhle produkt je seriózní".

**Effort:** S (React dnd-kit nebo vlastní drag logic + inline edit component)

---

### B8 — Environment Variable Diff a Multi-env Runner
**Popis:** Spustit stejnou collection na více prostředích (dev/staging/prod)
najednou a zobrazit diff výsledků vedle sebe.

**Proč to záleží:** "Proč tohle funguje na staging ale ne na prod?" je klasická
otázka. Multi-env run s diff view odpoví okamžitě. Zombie modul `multi_env_runner`
existuje — dokončit a přidat diff UI.

**Effort:** M (parallel runner + diff engine + side-by-side UI)

---

### B9 — Test Assertions DSL — 10+ typů assertů
**Popis:** Deklarativní asserty: status code, JSON path, XMLPath, response time,
header hodnota, body regex, JSON schema validace, GraphQL error check.

**Proč to záleží:** Aktuálně máme 7 typů — doplnit o XMLPath (pro SOAP response),
JSON schema (pro OpenAPI validaci) a GraphQL error (speciální case).
Bez XML asserts jsou SOAP testy neúplné.

**Effort:** S (jsonschema lib + lxml xpath + GraphQL error path parser)

---

### B10 — Template Functions
**Popis:** `{{$uuid}}`, `{{$timestamp}}`, `{{$isodate}}`, `{{$randomInt}}`,
`{{$faker.name}}`, `{{$faker.email}}` — generované hodnoty v requestech.

**Proč to záleží:** Testování s dynamickými daty (unique ID per request, current
timestamp) je nutné pro idempotent testy. Postman to má. Bruno to má.
Vývojář chce `{{$uuid}}` v request body bez psaní script.

**Effort:** S (Python template engine rozšíření + faker lib)

---

### B11 — GitHub Actions / GitLab CI Integration
**Popis:** Official GitHub Action `theridion/run-tests@v1` a GitLab CI template.
Vstupy: collection path, environment, fail threshold. Výstup: test report
jako artifact + PR status check.

**Proč to záleží:** CLI runner (B1) je nutný předpoklad. Action je distribuční
kanál — vývojář najde action v GitHub Marketplace, přidá do workflow,
začne používat Theridion v CI bez instalace. Toto je growth flywheel.

**Effort:** S (YAML action definition + Docker image nebo Node wrapper)

---

## CATEGORY C — Future Bets (emerging trends)

### C1 — AI Agentic Exploration — "Explore this API"
**Popis:** Uživatel zadá base URL nebo OpenAPI spec, AI agent autonomně prozkoumá
endpointy, najde edge cases, vygeneruje test kolekci a reportuje anomálie
(neočekávané 500, security headers chybí, etc.).

**Proč to záleží:** Agentic AI testing je emerging trend 2026-2027. Gartner
predikuje autonomní testování jako mainstream do 2028. Pro nás: privacy-first
agent přes Ollama je unikátní. Developer řekne "otestuj tuhle API" a
Theridion vrátí kolekci testů — bez manuální práce.

**Effort:** L (agent loop + tool calling + Ollama function calling support + UI)

---

### C2 — Production Traffic Replay (Speedscale approach)
**Popis:** Nahrát HTTP traffic (z proxy, pcap nebo log souboru) a přehrát
ho jako test suite. Anonymizovat PII automaticky před uložením.

**Proč to záleží:** Production replay je emerging trend — testovat se skutečnými
user interakcemi je nejrealističtější. Speedscale a Microcks jdou touto cestou.
Pro nás: místní replay bez cloud uploadu je diferenciace.
Privacy-first PII anonymizace je povinnost pro regulated industries.

**Effort:** L (HTTP proxy capture + pcap parser + anonymizer + replay engine)

---

### C3 — MCP Client — importovat API tools z MCP serverů
**Popis:** Připojit se k libovolnému MCP serveru a importovat jeho tools
jako testovatelné "endpointy" v Theridion. Test MCP-based AI agents stejně
jako REST API.

**Proč to záleží:** MCP je explodující ekosystém — stovky MCP serverů pro
GitHub, Notion, Postgres, filesystém. Testovat AI agenty, kteří MCP používají,
je nová kategorie potřeby. Theridion jako "MCP tester" by byl první a jediný
nástroj v této kategorii.

**Effort:** M (MCP client SDK + tool-to-request mapping + response inspector)

---

### C4 — Schema-First Contract Testing
**Popis:** Validovat API responses proti OpenAPI schema v každém testu.
Automaticky detekovat breaking changes — "field X byl required, teď chybí".
Consumer-driven contract testing (Pact-style) jako first-class feature.

**Proč to záleží:** Shift-left je strategický trend — zachytit breaking changes
v CI, ne v produkci. Pact je populární ale složitý. Theridion může nabídnout
jednodušší verzi integrovanou přímo do collection runneru.

**Effort:** M (jsonschema validace existuje, potřebuje breaking change detection + diff engine)

---

### C5 — WSDL Mock Server Generátor
**Popis:** Z WSDL specifikace automaticky vygenerovat mock SOAP server.
Konfigurovatelné responses per-operation. Spustit lokálně bez externích dependencies.

**Proč to záleží:** Enterprise SOAP integrace vyžaduje mock servery pro izolované
testování. WireMock a SoapUI Mock Service jsou alternativy — ale SoapUI je těžký
a WireMock neumí WSDL nativně. Zombie modul `wsdl_mock_gen` existuje — dokončit.

**Effort:** M (zeep WSDL parsing + FastAPI dynamic router + response templating)

---

### C6 — Load Testing s locust Embedded
**Popis:** "Run as load test" button spustí collection jako locust scenario.
Konfigurovatelné VU (virtual users), ramp-up, duration. Výsledky v Theridion UI.

**Proč to záleží:** k6 je dobrý standalone load tester, ale vyžaduje separátní
nástroj a JavaScript scripting. Theridion embedded load test ze stávající
collection je "jedno kliknutí" path. SoapUI to má — my bychom to měli taky
a s lepším UX.

**Effort:** L (locust Python integration + real-time results UI + charts)

---

### C7 — OWASP Security Scanning
**Popis:** Automatizované security scany z collection — SQL injection, XSS,
auth bypass, IDOR, rate limiting absence. Výsledky kategorizované dle OWASP Top 10.

**Proč to záleží:** Shift-left security je trend 2026. Bezpečnostní týmy
hledají nástroj, který vývojáři skutečně používají — ne separátní DAST tool.
Integrace security scanů přímo do API testů je killer feature pro DevSecOps.

**Effort:** L (fuzzing engine + OWASP rules + report UI — velký scope)

---

### C8 — Diff Response View
**Popis:** Porovnat response z dvou runs (nebo dvou prostředí) side-by-side.
Zvýraznit přidané, odebrané a změněné hodnoty v JSON/XML.

**Proč to záleží:** "Co se přesně změnilo po deployi?" je denní otázka.
Aktuálně neexistuje v žádném API testeru jako first-class feature.
Jednoduchý, ale vysoký dopad na UX — zvlášť pro regression testing.

**Effort:** S (json-diff lib + Monaco diff editor — Monaco to umí nativně)

---

### C9 — VS Code Extension
**Popis:** VS Code extension pro spuštění Theridion collections přímo z IDE.
Zobrazit výsledky testů v Test Explorer panelu VS Code.

**Proč to záleží:** Vývojář nechce přepínat mezi VS Code a Theridion desktop.
VS Code Test Explorer je standard — integrace tam je discovery kanál.
Zombie modul `vscode_api` existuje — ale desktop app verze je scope creep.
Spíše lightweight extension, která volá CLI runner (B1).

**Effort:** M (VS Code extension API + CLI runner jako backend — závisí na B1)

---

### C10 — Pre-request Scripts (JavaScript Sandbox)
**Popis:** JavaScript sandbox pro pre-request logiku — generovat dynamické hodnoty,
modifikovat headers, implementovat custom auth flow. Kompatibilní s Postman
pre-request script API pro snadnou migraci.

**Proč to záleží:** Komplexní auth flows (custom HMAC signing, dynamic token refresh,
timestamp-based signatures) nelze řešit declarativně. JavaScript scripting je
standard (Postman, Insomnia, Bruno to mají). Postman kompatibilita snižuje
migrační bariéru.

**Effort:** L (Tauri webview sandbox + Postman API kompatibilita + security sandboxing)

---

## Prioritizační matice

| Funkce | Kategorie | Effort | Dopad | Priorita |
|--------|-----------|--------|-------|----------|
| B1 CLI Runner | B | M | Kritický | **Sprint 1** |
| A3 HTML Trace Viewer | A | L | Kritický | Sprint 1 (závisí na B1) |
| B2 Auth: OAuth2 komplet | B | S | Vysoký | **Sprint 1** |
| B3 cURL Import/Export | B | S | Vysoký | **Sprint 1** |
| A1 AI Testgen Ollama UI | A | M | Vysoký | **Sprint 1** |
| A4 WS-Security XML Sig + X.509 | A | M | Vysoký | Sprint 1 |
| B7 Inline Rename + Drag-Drop | B | S | Střední | Sprint 1 |
| B6 History Panel | B | S | Střední | Sprint 1 |
| B10 Template Functions | B | S | Střední | Sprint 1 |
| B4 OpenAPI Import | B | M | Vysoký | **Sprint 2** |
| A2 MCP Server | A | M | Vysoký | Sprint 2 |
| A6 YAML Collection Format | A | M | Střední | Sprint 2 |
| B9 Assert DSL rozšíření | B | S | Střední | Sprint 2 |
| B5 Cookie Jar | B | S | Střední | Sprint 2 |
| B8 Multi-env Runner | B | M | Střední | Sprint 2 |
| B11 GitHub Actions | B | S | Vysoký | Sprint 2 (závisí na B1) |
| C8 Diff Response View | C | S | Střední | Sprint 2 |
| A5 Self-Healing Assertions | A | L | Vysoký | Sprint 3 |
| C4 Contract Testing | C | M | Vysoký | Sprint 3 |
| C3 MCP Client | C | M | Střední | Sprint 3 |
| C5 WSDL Mock Server | C | M | Střední | Sprint 3 |
| C6 Load Testing (locust) | C | L | Střední | Sprint 4 |
| C10 Pre-request Scripts | C | L | Střední | Sprint 4 |
| C9 VS Code Extension | C | M | Střední | Sprint 4 |
| C1 AI Agentic Exploration | C | L | Vysoký | Sprint 5 |
| C2 Production Traffic Replay | C | L | Střední | Sprint 5 |
| C7 OWASP Security Scanning | C | L | Střední | Sprint 5 |

---

## Klíčové rozhodnutí pro tým

### 1. AI-first positioning je nyní povinný, ne volitelný

Gartner 80% enterprise AI adoption do 2027 + MCP standard + agentic testing
znamenají, že Theridion musí mít AI story před koncem 2026. Naše výhoda:
**lokální Ollama = privacy-first**. Toto musí být v headline na README, ne
v sekci "features".

### 2. CLI runner (B1) je unlock pro vše ostatní

HTML Trace Viewer, GitHub Actions, VS Code Extension, Multi-env Runner —
všechno závisí na fungujícím `theridion test` CLI. Toto je Sprint 1 blocker
a musí být first priority po launch.

### 3. MCP je strategická sázka, ne hype

A2 (MCP Server) a C3 (MCP Client) dohromady dají Theridion unikátní pozici:
"API tester, který mluví jazykem AI agentů". Claude Desktop, Cursor a Windsurf
jsou nástroje, kde vývojáři tráví čas. Theridion přítomný v těchto nástrojích
jako MCP tool = organic discovery.

### 4. Zombie moduly vs. nové features

Před implementací A2 (MCP Server), C5 (WSDL Mock), B8 (Multi-env) ověřit,
zda zombie backend modul je dostatečný základ nebo tech debt, který brzdí.
Preferovat smazání a clean implementaci nad "dokončením zombie kódu".

---

## Další kroky

**Business analytik:**
- Detailní user stories pro B1 (CLI runner) — acceptance criteria pro Sprint 1
- Zmapovat MCP ekosystém — top 10 MCP serverů, které by uživatelé chtěli testovat
- Competitive analysis: co přidal Bruno za posledních 6 měsíců

**UX Designér:**
- Navrhnout CLI output format a HTML trace viewer template (závisí na A3)
- Auth tab redesign pro OAuth2 flows (závisí na B2)
- AI panel UX — kde v UI žije "Generate tests with AI" a jak vypadá výstup

**Marketér:**
- AI-first messaging: "Privacy-first AI testing — your data never leaves your machine"
- MCP integrace jako PR story: "Test AI agents with Theridion MCP"
- Target komunity: MLOps/LLMOps komunity pro MCP story, DevSecOps pro OWASP

---

```
---HANDOFF---
OD: Produktový manažer
KOMU: projektovy-manazer
STATUS: hotovo
VÝSTUP: /Users/tm/workspaces/projects/theridion/docs/product/feature-proposals-2026.md
DALŠÍ KROK: Projektový manažer rozhodne o Sprint 1 backlogu.
  Klíčové rozhodnutí: potvrdit pořadí B1 (CLI runner) jako #1 priority,
  schválit MCP jako strategickou sázku pro Sprint 2.
OTÁZKY:
  1. Je AI-first positioning (Ollama, MCP) prioritou vedení, nebo stále
     SOAP/WS-Security jako primární diferenciátor?
  2. Má smysl investovat do VS Code Extension (C9) před 2000+ GitHub stars,
     nebo je to příliš brzy?
  3. Self-healing assertions (A5) je L effort — je to Sprint 3 realistické,
     nebo odložit na 2027?
---/HANDOFF---
```
