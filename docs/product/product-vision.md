# Produktová vize: Theridion

**Od:** Produktový manažer
**Pro:** Business analytik, UX Designér, Marketér, tým
**Datum:** 2026-05-09
**Projekt:** Theridion — open-source API testing platform

---

## Problém

Vývojáři a QA inženýři, kteří pracují s enterprise API (SOAP, WS-Security,
REST + GraphQL dohromady), jsou uvězněni mezi dvěma špatnými volbami:

- **Postman/Insomnia** — krásné UI, ale cloud-first (data mimo vaše repo),
  SOAP podpora minimální, WS-Security nulová, žádný skutečný test runner.
- **SoapUI / ReadyAPI** — plná WS-* síla, ale UI pochází z roku 2008,
  licence stojí tisíce USD, a výsledky testů nejsou git-friendly.

Výsledek: týmy kombinují 3-4 nástroje (Postman pro REST, SoapUI pro SOAP,
Locust pro load, vlastní skripty pro security) a nikdo neví, co je stav.

---

## Vize

> Theridion je desktop API tester pro inženýry, kteří chtějí jeden
> git-friendly nástroj místo tří — s první třídní SOAP/WS-Security
> podporou a Playwright-style trace reportem z test runů.

---

## Hodnotová propozice

**Pro vývojáře, kteří chtějí vlastnictví dat:**
- Soubory v gitu (ne v Postman cloudu). Collections jsou diff-able,
  code-reviewovatelné, verzovatelné.

**Pro týmy s SOAP legacy:**
- WS-Security (XML Signature, UsernameToken, X.509) — žádný jiný moderní
  API tester tohle neumí. SoapUI to umí, ale stojí $699/seat/rok.

**Pro QA, kteří znají Playwright:**
- Collection runner s HTML trace reportem — vizuálně vidíte, co prošlo,
  co selhalo, kolik ms každý krok trval. Žádný jiný tester tohle má.

**Cena: $0 navždy** — MIT licence, žádné účty, žádná telemetrie.

---

## Cílová skupina

### Persona 1: "Jakub" — backend developer v enterprise

- Věk: 28-40, Java/Python backend, tech-zdatný
- Firma: 50-500 lidí, integruje SOAP s bankami/pojišťovnami/státní správou
- Problém: SoapUI má UI z 2008, kolega odešel a vzal Postman Pro licenci,
  security testy se dělají ručně jednou za kvartál
- Jak dnes řeší: SoapUI (SOAP) + Postman (REST) + bash skripty (runner)
- Co chce: jedno okno, SOAP i REST, výsledky v gitu, neplatit za cloud

### Persona 2: "Petra" — QA inženýrka v mid-size týmu

- Věk: 25-35, TypeScript a Python, pracuje s CI/CD
- Firma: SaaS produkt, 10-50 devs, API-heavy backend
- Problém: Playwright testy mají krásné trace reporty, API testy jsou jen
  JUnit XML a nic se vizuálně nevidí
- Jak dnes řeší: Postman + Newman CLI, výsledky v Allure
- Co chce: CLI `theridion test` s HTML trace jako Playwright, AI-generované
  asserty aby nemusela psát 15 json_path assertů ručně

### Persona 3: "David" — solo developer / freelancer

- Věk: 22-35, full-stack, pracuje na více projektech najednou
- Problém: Postman free tier omezuje teamové sdílení, platit $14/měsíc
  za nástroj co nepotřebuje cloud je zbytečné
- Jak dnes řeší: Bruno (free, file-based) + curl skripty
- Co chce: Bruno-like UX + SOAP podpora + AI asserty

---

## Konkurenční analýza

| Nástroj | Silné stránky | Slabé stránky | Naše výhoda |
|---------|---------------|---------------|-------------|
| **Postman** | Polished UX, 10M users, team workspaces, great REST | Cloud-only data, $14/seat/měs, SOAP minimální, WS-Security nulová | File-based git ops, WS-Security, local AI |
| **Insomnia** | Open-source, clean UI | Cloud sync kontroverzní (2023 backlash), SOAP omezená, žádný runner | WS-Security, trace runner |
| **Bruno** | File-based, git-friendly, roste rychle | Žádný SOAP/WS-Security, runner primitivní, žádný trace viewer | SOAP + WS-Security ekosystém |
| **SoapUI / ReadyAPI** | Kompletní WS-* stack, load testing, security scany | UI z 2008, $699-7000/rok pro ReadyAPI, Java overhead | Moderní UX, MIT cena, git-friendly, AI asserty |
| **Hoppscotch** | Krásné web UI, open-source | Web-only (ne desktop), žádný WS-Security, runner slabý | Desktop + offline, WS-Security |
| **k6** | Výborný load tester, developer-friendly | Jen load testing, žádné GUI, žádný SOAP | All-in-one, vizuální runner |

**Největší gap na trhu:** Nikdo nespojuje moderní UX + file-based git ops +
WS-Security + vizuální trace runner v jednom free desktop nástroji. To je
náš prostor.

---

## KRITICKÁ DIAGNÓZA: Feature bloat — stav k 2026-05-09

### Co vidíme v kódu

Backend sidecar má **114 API modulů** registrovaných v `main.py`.
Frontend má **38 modal/panel komponent**.

Kompletní seznam věcí, které existují v backendu ale NEMAJÍ UI ani test coverage:

```
amf_protocol, api_catalog, api_governance, api_versioning,
bru_format, collection_branching, composite_project,
conversational_ai, cors_test, custom_dashboard, data_generator,
data_loop, envdiff, error_patterns, extras, favorites,
flow_graph, flows, globals, groovy_engine, idempotency_check,
injection_scan, integrations, jdbc_query, jms_client, junit_reporter,
kafka, keybindings, latency_histogram, loadtest_compare,
loadtest_patterns, mcp_server, mock_diff, monitors, mqtt_client,
multi_env_runner, npm_loader, oauth1, openapi_sync, pac_proxy,
pagination_walker, project_encryption, ratelimit_detect,
redirect_chain, response_trends, retry_tester, schema_validation,
secret_encryption, secret_managers, sensitive_data, servicemap,
sla_check, soap_coverage, ssl_inspect, team_workspaces,
terminal, throughput_timeline, token_refresh, user_simulation,
visual_test_builder, visualizer, vscode_api, waterfall,
webhooks, wsdl_mock_gen, wsdl_refactor, yaml_collections
```

To je přibližně 70+ "zombie" modulů — existují v backendu, nemají frontend,
nejsou v roadmapě, a zpomalují PyInstaller bundle a cold start.

### Riziko

Toto je klasická "feature factory" past: kód se píše rychleji než se
rozumí a testuje. Výsledek:
1. **Cold start 6-8 s** — PyInstaller bundluje 114 modulů místo 15.
2. **Testovatelnost** — 67 pytestů na 12.000+ řádků kódu = nedostatečné.
3. **Maintenance debt** — zombie moduly jsou bitrot čekající na vydání.
4. **First-impression problém** — uživatel otevře app a 80% features chybí v UI.

---

## MVP — Minimální životaschopný produkt

### Definice "ready to release as v0.1"

Theridion je ready pro veřejné GitHub release a první uživatele,
když tyto podmínky platí:

### MUSÍ MÍT (v0.1 — Release podmínky)

**Core request execution:**
- REST GET/POST/PUT/PATCH/DELETE s headers, body, query params
- Environment variables s `{{var}}` substitucí
- Monaco editor pro request/response body
- Timing breakdown (DNS/TCP/TLS/transfer) v response panelu

**Collections & workspace:**
- File-backed collections s folder hierarchií
- Inline rename, save-to picker
- Git-friendly JSON formát

**Auth:**
- Bearer token, Basic auth, API Key
- `{{var}}` substituce v auth polích

**SOAP (diferenciátor #1):**
- WSDL inspect + execute
- WS-Security (UsernameToken minimálně — to je killer feature)

**Test assertions (diferenciátor #2):**
- 7 typů assertů: status, json_path, header, body_contains, latency, regex
- Collection runner (sequential execution s pass/fail reportem)

**UX basics:**
- cURL import + "Copy as cURL"
- Cookie jar per environment
- History panel (last 100, replay)
- Template functions (`{{$uuid}}`, `{{$timestamp}}`)

**Stabilita:**
- Tauri bundle funguje na macOS + Linux (Windows jako bonus)
- Sidecar cold start pod 10 s
- Všechny výše uvedené features mají E2E test

**To je přesně to, co je v aktuálním stavu hotové.** v0.1 je ready.

---

### MĚLO BY MÍT (v0.2 — 4-8 týdnů po launch)

- **CLI runner** (`theridion test collections/my.json --env prod`)
  s HTML trace reportem — to je diferenciátor, dá se odlišit od Postman
- **AI test generation** přes Ollama (design v `docs/ai-test-generation.md`)
  — privacy-first lokální AI je silná story
- **GraphQL** (execute + introspect) — potřebné pro Sprint 3 persona
- **OAuth2 Authorization Code flow** — table stakes pro moderní API
- **gRPC** (proto loading, server reflection)

### BYLO BY FAJN (v0.3+ — neplánujte teď)

- WebSocket native UI (proxy endpoint existuje, UI chybí)
- MTOM/XOP attachments
- Load testing (locust embedded)
- OWASP security scans
- Mock server
- Drag-drop v sidebar
- Pre-request scripts (JS sandbox)
- Diff response view

### ZAHODIT NEBO ZAARCHIVOVAT (zombie features)

Následující moduly existují v backendu ale NEMAJÍ roadmap ani UI.
Doporučení: přesunout do `apps/sidecar/theridion_sidecar/api/_archive/`
nebo smazat a nechat je na komunitní příspěvky:

```
amf_protocol (AMF/Flash — mrtvý protokol)
jdbc_query (databáze není v scope)
jms_client (JMS/ActiveMQ — enterprise nicheware)
groovy_engine (SoapUI legacy, ne naše DNA)
vscode_api (VSCode extension je separátní produkt)
team_workspaces (cloud sync je mimo scope)
npm_loader (nejasné proč existuje)
conversational_ai (duplikuje docs/ai-test-generation.md)
```

---

## Metriky úspěchu

### v0.1 Launch (první 3 měsíce)

- **GitHub stars**: 500 za první měsíc (Bruno měl ~300 za první měsíc)
- **Stažení**: 1000 za první měsíc (macOS + Linux release na GitHub Releases)
- **GitHub Issues otevřené komunitou**: 50+ (signal že lidi to skutečně používají)
- **Core retention**: 30% uživatelů se vrátí po 7 dnech (klíčová metrika)

### v0.2 (6 měsíců)

- **2000 GitHub stars**
- **CLI runner adoption**: 20% stažení použije `theridion test` v CI/CD
- **SOAP users**: 15% uživatelů otevře alespoň jeden SOAP request
  (validace naší diferenciace)
- **Community PR**: 5+ externích contributorů

### Indikátory problémů (červené vlajky)

- Cold start > 10 s po bundlování (PyInstaller přetížený zombie moduly)
- Bounce rate na README > 70% bez GitHub star
- GitHub Issues s "missing feature X" kde X je v zombie modulech

---

## Byznys model

### v0-v1: Čistě open-source (MIT)

- **Financování**: open-source momentum, případně GitHub Sponsors
- **Strategie**: build community first, monetize later
- **Priorita**: GitHub stars, contributors, real user feedback

### v2+: Potenciální cesty (nevybírat teď)

**Možnost A — Open core**
- Core: MIT, zdarma navždy
- Theridion Cloud (volitelné): team sync, shared collections, CI badges
- Cena: $8/seat/měs (méně než Postman, více než $0)

**Možnost B — Enterprise licence**
- Desktop zdarma
- Enterprise: SSO, audit logs, on-prem sync server, SLA
- Cena: $500-2000/tým/rok (vs ReadyAPI $7000+)

**Možnost C — Consultancy / support**
- Core zdarma navždy
- Placená podpora pro enterprise SOAP/WS-Security integrace
- Realistické pro první 2 roky při malém týmu

**Nedoporučuji teď:**
- SaaS API proxy (latency, trust, konkuruje Apigee)
- Plugin marketplace (příliš brzy, community není dost velká)

**Doporučení**: Jít cestou B s "Enterprise add-on" až po dosažení
2000+ stars a 20+ enterprise uživatelů. Neplánovat monetizaci před v1 GA.

---

## Go-to-market strategie

### Fáze 1: Community seeding (launch + první 2 měsíce)

1. **README jako landing page** — README.md musí za 30 vteřin
   vysvětlit: proč ne Postman, proč ne SoapUI, co je jedinečné.
   GIF/video demo je nutné. Aktuální README je technická dokumentace,
   ne sales pitch.

2. **Cílené posts na relevantní komunity:**
   - Hacker News "Show HN" — timing záleží (úterý/středa ráno UTC)
   - Reddit: r/programming, r/webdev, r/softwaretesting
   - Dev.to a Hashnode article: "Why I built yet another API tester"
     — musí mít konkrétní srovnání s Bruno/Postman/SoapUI

3. **SOAP differentiator post** — "WS-Security in 2026: why every API
   tester fails enterprise developers" — cílí přímo na Jakoby persony
   na LinkedIn a X.

4. **Bruno community** — Bruno je nejbližší competitor v git-friendly
   prostoru. Theridion řeší to co Bruno neumí (SOAP, runner). Neútočit
   na Bruno, ale být přítomný v jejich GitHub discussions/Discord.

### Fáze 2: Content & SEO (měsíce 3-6)

5. **Srovnávací stránky** (SEO): "Theridion vs Postman",
   "Theridion vs SoapUI", "Best free SoapUI alternative" —
   lidi to googlí.

6. **Tutorial content**: "Testing SOAP services with WS-Security
   from scratch" — unikatní content, SoapUI tutorials jsou old a ugly.

7. **YouTube/asciinema demo** — 2-3 minutové demo: collections v gitu +
   SOAP WS-Security + collection runner s HTML trace.

### Fáze 3: Enterprise reach (měsíce 6-12)

8. **Cílit na "SoapUI replacement" keywords** — velká firma placená
   $7000/rok za ReadyAPI je ideální target.

9. **Integration s populárními CI** (GitHub Actions, GitLab CI) —
   action/plugin pro `theridion test` v pipeline.

---

## Komunita

### GitHub jako primární centrum

- `CONTRIBUTING.md` musí existovat před launch
- `good first issue` labely — onboarding pro contributors
- GitHub Discussions zapnout (ne Discord jako primární — Discord ztrácí
  historii, GitHub Discussions je indexovaný Googlem)

### Co pomůže organickému růstu

- **Příklady collections** v repu (`examples/` složka) — konkrétní ukázky:
  petstore REST, calculator SOAP s WS-Security, GraphQL GitHub API
- **Test fixtures public** — `calculator.wsdl` je dobrý start
- **Roadmap je public** — uživatelé hlasují Issues přes thumbs-up

---

## Dokumentační potřeby (před launch)

### Minimálně nutné

1. **README přepsat** — aktuální je technická, ne produktová. Struktura:
   - Headline + subheadline (problem/solution in 2 sentences)
   - Screenshot nebo GIF
   - "Why Theridion?" (vs Postman, vs SoapUI, vs Bruno — bullet points)
   - Quick start (5 kroků max)
   - Feature highlights s badges

2. **CONTRIBUTING.md** — jak přispět, jak spustit dev, jak psát testy

3. **Docs site (lze odložit na v0.2)** — Docusaurus nebo Mintlify,
   ale README musí stačit pro v0.1

### Nice to have (v0.2)

4. Tutorial: SOAP + WS-Security walkthrough
5. Tutorial: Collection runner + CI integration
6. Video demo (2-3 min asciinema nebo QuickTime)

---

## Největší rizika adopce

### Riziko #1: Cold start 6-8 sekund (VYSOKÉ RIZIKO)

PyInstaller bundluje 114 modulů. Uživatel čeká 8 vteřin než se app
inicializuje. Pro desktop tool je to dealbreaker.

**Doporučení**: Odregistrovat zombie moduly z `main.py` PŘED launch.
Cíl: pod 20 aktivních modulů, cold start pod 3 s.

### Riziko #2: Feature bloat bez UI (VYSOKÉ RIZIKO)

Uživatel čte "API tester" v README, stáhne, otevře app, vidí 30% slíbených
features. Zbytek je v backendu bez UI.

**Doporučení**: Buď odebrat zombie moduly z backendu, nebo feature-flag
a jasně dokumentovat co je "experimental".

### Riziko #3: Windows support neotestovaný (STŘEDNÍ RIZIKO)

CI nikdy neběželo na Windows pro sidecar bundle. Windows je největší
desktop platforma.

**Doporučení**: Alespoň manuálně ověřit bundle na Windows před launch.

### Riziko #4: Bruno jako competitor roste rychle (STŘEDNÍ RIZIKO)

Bruno přidává features rychle. Pokud přidají SOAP podporu před naším
launch, hlavní diferenciátor oslabí.

**Doporučení**: Launchovat co nejdříve s aktuálním MVP. Nepřidávat
features před launch — ty přijdou po feedbacku.

### Riziko #5: "Yet another API tester" skepticismus (STŘEDNÍ RIZIKO)

Trh je přesycen. Hacker News komentáře budou "proč ne Postman?"

**Doporučení**: README a launch post musí mít konkrétní odpověď.
"Because Postman doesn't do WS-Security and your SOAP files aren't
in git." Specifické, ne obecné.

---

## Doporučené priority pro launch

### Udělat PŘED public launch (1-2 týdny práce)

1. **Odregistrovat zombie moduly z main.py** — rychlé, velký dopad
   na cold start a bundle size
2. **README přepsat** — produktová komunikace, ne technická
3. **Ověřit Windows bundle** — alespoň manuálně
4. **CONTRIBUTING.md** vytvořit
5. **GitHub Releases** nastavit (macOS + Linux binaries)

### První feature po launch (na základě community feedbacku)

6. **CLI runner** (`theridion test`) — toto bude nejžádanější
   feature od QA komunity a umožní CI/CD integraci
7. **AI test generation** (Ollama-first) — unikátní, privacy story
   silná, design je hotový

### Odložit na v0.3+

- Mock server (zajímavé, ale nepotřebné pro core use case)
- gRPC (malá komunita oproti REST/SOAP)
- Load testing (konkuruje k6, těžko vyhrát)
- OAuth2 PKCE (důležité, ale table stakes po WS-Security)

---

## Další kroky pro tým

**Business analytik:**
- Definovat uživatelské stories pro CLI runner (Sprint 2 prio)
- Zmapovat "zombie modul" list — které mají business value, které smazat
- Analyzovat Bruno roadmap (GitHub Issues/Discussions) pro competitive intel

**UX Designér:**
- Redesign README jako landing page (hero, problem/solution, quick start)
- Navrhnout onboarding flow — první spuštění, prázdný stav, "create first request"
- Zkontrolovat AI generate button UX (docs/ai-test-generation.md je dobrý základ)

**Marketér:**
- Napsat "Why Theridion?" copy (vs Postman, SoapUI, Bruno)
- Připravit HN Show post + Reddit posts
- Identifikovat 5-10 relevantních SOAP/enterprise API komunity/forums

---

```
---HANDOFF---
OD: Produktový manažer
KOMU: projektovy-manazer
STATUS: hotovo
VÝSTUP: /Users/tm/workspaces/projects/theridion/docs/product/product-vision.md
DALŠÍ KROK: Projektový manažer rozhodne o prioritách na základě doporučení.
  Klíčové rozhodnutí: odregistrovat zombie moduly před launch (cold start risk),
  přepsat README (go-to-market blocker), ověřit Windows.
OTÁZKY:
  1. Je cíl launch "brzy s MVP" nebo "kompletněji s více features"?
     Doporučuji první — aktuální stav je launch-ready.
  2. Kdo je owner dokumentace a README rewrite?
  3. Je Windows support v scope pro v0.1 nebo "macOS + Linux first"?
---/HANDOFF---
```
