# UX Navrh: Pokrocile funkce — AI, Flow Builder, Traffic, Monitoring, Presence
**Od:** UX Designer
**Pro:** UI Designer, Frontend vyvojar
**Datum:** 2026-05-09
**Projekt:** Theridion — Sprint 2–6 pokrocile funkce

---

## Kontext: Stavajici layout

Aplikace dnes bezi na tomto rozlozeni:

```
┌─────────────────────────────────────────────────────────────────┐
│  SIDEBAR (260 px)  │  TAB BAR + ENV PICKER (flex row, ~36 px)  │
│                    ├──────────────────────────────────────────── │
│  Collections       │  URL BAR (Cmd+Enter, Save, cURL)           │
│  tree with         ├─────────────────────┬────────────────────── │
│  folders +         │  REQUEST PANEL      │  RESPONSE PANEL       │
│  requests          │  (Headers/Body/Auth │  (Body/Headers/       │
│                    │   Assertions/Script)│   Console/Timing)     │
├────────────────────┴─────────────────────┴────────────────────── │
│  STATUS BAR (sidecar health, req count, last status, settings)  │
└─────────────────────────────────────────────────────────────────┘
```

Klicova omezeni:
- Sidebar je pevnych 260 px, rozdelovac neni.
- Main area je `grid-cols-2` (request | response), rozsiritelny na
  `grid-cols-[1fr_1fr_240px]` kdyz je History panel otevren.
- Vsechna "tezka" UI jsou modaly (FlowEditorModal, ProxyRecorderModal,
  PerformanceDashboardModal, MonitorsModal...). Tento vzor uz existuje
  a funguje.
- StatusBar je `col-span-2` — jedina zona, ktera preklene oba sloupce.

---

## Informacni architektura: makro pohled

Navrhuju rozdelit aplikaci do dvou urovni navigace:

### Uroven 1: Mod aplikace (Activity Bar — vlevo od sidebaru)

Inspirace: VS Code activity bar. Pridame uzky pruh (~40 px) zcela
vlevo. Sidebar se pak meni podle aktivniho modu.

```
┌────┬────────────────────────────────────────────────────────────┐
│    │  SIDEBAR (260 px, obsah se meni dle aktivity)             │
│ A  │                                                            │
│ C  ├───────────────────────────────────────────────────────────┤
│ T  │  TAB BAR (mode-aware — "Request" tabs vs "Flow" tabs vs   │
│ I  │           "Traffic" tabs vs "Monitor" tabs)               │
│ V  │                                                            │
│ I  │  MAIN PANEL (meni se dle mode, zachovava grid-cols-2 pro  │
│ T  │             Request mode)                                  │
│ Y  ├───────────────────────────────────────────────────────────┤
│    │  STATUS BAR                                               │
└────┴───────────────────────────────────────────────────────────┘
```

Activity bar ikony (shora dolu):

```
[Requests]    — aktualni request/collection editor (vychozi)
[Flows]       — Visual Flow Builder
[Traffic]     — Traffic Recording Dashboard
[Monitors]    — API Health Dashboard
─────
[AI]          — AI Assistant (toggle right panel)
─────
[Settings]    — otevre SettingsModal
```

Proc activity bar:
- Sidebar uz ma 260 px — pridani dalsich sekci do nej by ho
  preplnilo. Activity bar je bezna konvence (VS Code, Figma,
  Linear), uzivatele ji znaji.
- Kazdy "mod" ma vlastni kontext sidebaru — Flows ma seznam flow,
  Traffic ma filtr/search, Monitors ma seznam koncovych bodu.
- Request mod zustava vychozi — zadna regrese pro soucasne uzivatele.

---

## 1. AI Test Assistant

### Kde zije

Pravy panel, skryvatelny. NENI stale-visible sidebar (vlevo je uz
Collections, AI by o pozornost soutezilo). Misto toho: AI je
**right-side drawer** uvnitr main area — rozsiri Response panel
o dalsi tab, nebo se objevi jako overlay panel vpravo.

Doporucuji: **AI tab uvnitr ResponsePanel**.

Duvod: ResponsePanel uz ma taby (Body / Headers / Console). Pridani
"AI" tabu je nulovy layout overhead. Uzivatel si rekne "chci videt
co AI rika o teto odpovedi" a klikne na tab — stejny mentalni model
jako Console.

Alternativa pro power users: Cmd+Shift+A otevri AI jako samostatny
panel napravo od Response (grid-cols-[1fr_1fr_280px], treti sloupec
AI misto History — History uz ma presedent pro toto rozsireni).

### User flow

```
[Uzivatel posle request]
        |
        v
[Response prichazi]
        |
        +---> [AI tab automaticky zobrazuje spinner "Analyzing..."]
        |              |
        |              v
        |     [AI zobrazi suggestion karty do 2 s]
        |
        v
[Uzivatel klikne na "AI" tab v ResponsePanel]
        |
        v
[Vidi suggestion karty]
        |
        +---> [Klikne "Add assertion" na karte]
        |              |
        |              v
        |     [Assertion se prida do Assertions tabu v RequestPanel]
        |     [Vizualni potvrzeni: karta se "zabarvila" = pripojena]
        |
        +---> [Klikne "Explain error"]
        |              |
        |              v
        |     [Rozbalitelny panel s vysvetlenim + odkazem na docs]
        |
        +---> [Klikne "Find similar in collection"]
                       |
                       v
              [Sidebar zvyrazni podobne requesty]
```

### Wireframe: AI tab v ResponsePanel

```
┌─── Response ──────────────────────────────────────────────┐
│ [Body] [Headers] [Console] [Timing] [AI ✦]               │
│                              ↑ smaragdovy dot = nova zprava│
├───────────────────────────────────────────────────────────┤
│ AI Test Assistant                            [v] collapse  │
│ ─────────────────────────────────────────────────────────  │
│                                                            │
│ ┌── Suggestion card ──────────────────────────────────┐   │
│ │ ✦  Status je 200, ale body obsahuje "error": true   │   │
│ │    Doporuc assertion: body.error === false           │   │
│ │    [+ Pridat assertion]          [Ignorovat]         │   │
│ └────────────────────────────────────────────────────── │   │
│                                                            │
│ ┌── Suggestion card ──────────────────────────────────┐   │
│ │ ✦  Chybi Content-Type validace                      │   │
│ │    Response vraci application/json                   │   │
│ │    [+ Assert header]             [Ignorovat]         │   │
│ └────────────────────────────────────────────────────── │   │
│                                                            │
│ ┌── Issue card (cervena) ─────────────────────────────┐   │
│ │ !  Response time 4 200 ms — nad P95 pro tento env   │   │
│ │    [Vysvetlit]    [Pridat performance assertion]      │   │
│ └────────────────────────────────────────────────────── │   │
│                                                            │
│  Chatbox ─────────────────────────────────────────────    │
│  [ Zeptej se na tuto odpoved...            ] [Odeslat] │   │
└───────────────────────────────────────────────────────────┘
```

### Klic: co NEDELAT

- Neotvirat AI automaticky. Jen zvyraznit tab dot. Uzivatel rozhoduje
  kdy chce AI videt — nechceme rozptylovat pri focusu na request.
- Neblokovat response panel. AI je extra tab, ne overlay.
- Neposkytnout prazdny stav bez kontext — pokud nebyl poslany zadny
  request, AI tab rika "Posli request a ja analyzuju odpoved."

### Stavy

| Stav | Co se zobrazuje |
|---|---|
| Zadny request podan | "Posli request — AI zanalyzuje odpoved a navrhne assertiony." |
| Analyzuji | Skeleton loader + "Analyzing response..." |
| Vysledky | Suggestion karty (max 5, prioritizovane) |
| Bez navrhu | "Vypada dobre. Zadne narizeni nebyly nalezeny." |
| AI nedostupne | Subtle banner "AI neni dostupne. Zkontroluj API klic v Nastaveni." |

---

## 2. Visual Flow Builder

### Kde zije

Vlastni mod v activity bar: **[Flows]**. Otevre se jako plnoplochovy
editor v main area — sidebar se zmeni na seznam flow, main panel
se stane canvas.

Proc NE modal: FlowEditorModal uz existuje jako modal. Ale Flow
Builder je spise "prace" nez "nastroj" — uzivatel bude travit v nem
dlohou dobu, menit vrstvy, debugovat. Modal je spatny kontejner pro
dlouhy workflow. Navrhuji modal pouze pro "rychle otevreni" z command
palette — po otevreni se prepne do Flows modu.

### Informacni architektura Flows modu

```
Flows sidebar (260 px):
├── [+ Novy flow]
├── My Flows
│   ├── Login + Create Resource    [last run: 2 min ago]
│   ├── Full E2E Checkout          [last run: never]
│   └── Auth token rotation        [last run: 5 min ago]
└── From Collection: Payments API
    └── [Import requests as flow]
```

### Canvas layout

```
┌─── Flow: Login + Create Resource ─────────────────────────────┐
│ [Run] [Run Step-by-step] [Save] [Export as collection runner] │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Sidebar palette       │  Canvas (hlavni plocha)              │
│  ──────────────        │                                       │
│  [+] Request block     │  ┌────────────────┐                  │
│  [+] Extract variable  │  │  POST /auth/   │                  │
│  [+] Assert block      │  │  login         │ ── OK ──>        │
│  [+] Delay             │  │  [Edit] [Run]  │         |        │
│  [+] Loop              │  └────────────────┘         v        │
│  [+] Condition         │                    ┌──────────────┐  │
│                        │                    │ Extract:     │  │
│  Request library       │                    │ token ←      │  │
│  ──────────────        │                    │ body.token   │  │
│  [drag from here]      │                    └──────┬───────┘  │
│  Payments API          │                           |          │
│   └ POST /login        │                           v          │
│   └ GET /accounts      │                    ┌──────────────┐  │
│   └ POST /transfer     │                    │ GET /profile │  │
│                        │                    │ Auth: Bearer │  │
│                        │                    │ {{token}}    │  │
│                        │                    └──────────────┘  │
├────────────────────────┴───────────────────────────────────── │
│  Run log (collapsible, ~120 px)                               │
│  Step 1 POST /auth/login        200  142 ms  [OK]            │
│  Step 2 Extract token           OK                            │
│  Step 3 GET /profile            401  — token expired? [!]    │
└───────────────────────────────────────────────────────────────┘
```

### Interakcni vzory

**Pridani bloku:**
- Drag z palety na canvas
- Nebo: dvouklick na prazdnou plochu = popup menu bloku
- Nebo: kliknutim na "+"-uzel za existujicim blokem

**Propojeni bloku:**
- Kliknout na vystupni "slot" bloku, tahnout na vstupni "slot" dalsiho
- OK-hrana = zelena cesta, ERROR-hrana = cervena (pro error handling vetev)

**Editace bloku:**
- Kliknout na blok = otevrit mini-panel vpravo (ne full modal)
- Mini-panel ma url, method, headers, body — stejne jako RequestPanel
  ale zkraceny

**Spustit step-by-step:**
- Aktivni blok se zvyrazni (outline emerald), log se scrolluje
- Pauza na kazdem bloku, uzivatel muze editovat promennou nebo
  pokracovat

**Extract variable:**
- JSONPath vizualni picker: kliknout na hodnotu v response logu =
  nabidne "Extract as variable" s navrhem nazvu

### Stavy bloku na canvasu

| Stav | Vizualni |
|---|---|
| Nedotceny | Neutralni border, neutral-800 |
| Aktivni (bezi) | Pulzujici emerald outline + spinner |
| OK | Zeleny check badge, elapsed ms |
| Error | Cerveny border, "!" badge, tooltip s chybou |
| Preskocen (disabled) | Sedy, strikethrough nazev |

---

## 3. Traffic Recording Dashboard

### Kde zije

Vlastni mod v activity bar: **[Traffic]**. Opet plnoplochovy mod
(stejny princip jako Flows).

Duvod: ProxyRecorderModal uz existuje. Stejny problem jako u Flow —
sledovani live traffic je "prace", ne "nastroj". Modal je prilis maly
a otevre a zavre se, uzivatel ztrati kontext.

### Layout Traffic modu

```
Sidebar (260 px):
├── Proxy status: [ON] port 8888   [Stop]
├── ─────────────────────────────
├── Filtr:
│   [ Hledat URL...              ]
│   Method: [ALL v] Status: [ALL v]
│   Host: [           ]
├── ─────────────────────────────
├── Zdroje:
│   ● localhost:3000    47 req
│   ● api.stripe.com   12 req
│   ● fonts.gstatic.com 3 req  [Exclude]
└── [Vycistit zaznam]  [Export HAR]
```

```
Main panel:
┌─── Traffic [LIVE] ────────────────────────────────────────────┐
│ [REC] 00:03:42   62 requests   3 errors                       │
├───────┬────────────────────────────────────────────────────────┤
│ Meth  │ URL                         │ Status │ Size │ Time     │
├───────┼────────────────────────────────────────────────────────┤
│ POST  │ /api/auth/login             │  200   │ 1.2K │  142 ms  │
│ GET   │ /api/user/profile           │  401   │  420 │   89 ms  │  <- červená
│ GET   │ /api/products?page=1        │  200   │  18K │  230 ms  │
│ POST  │ /api/cart/items             │  422   │  800 │   55 ms  │  <- červená
│  ...  │  ...                        │  ...   │  ... │  ...     │
├───────┴────────────────────────────────────────────────────────┤
│  Detail vybrane polozky (dolni panel, ~40% vysky)             │
│                                                               │
│  POST /api/auth/login                          142 ms  200    │
│  ─────────────────────────────────────────────────────────    │
│  [Request] [Response] [Timing] [Convert to Test]              │
│                                                               │
│  Headers: Authorization: Bearer ...                           │
│  Body: {"email":"user@test.com","password":"..."}            │
│                                                               │
│         [+ Pridat do kolekce]   [Otevrit v Request tabu]      │
└───────────────────────────────────────────────────────────────┘
```

### Klic CTA: "Convert to Test"

Jeden klik = otevre dialog:
1. "Jak se jmenuje tento request?" (predvyplneno z URL)
2. "Do ktere kolekce?" (dropdown)
3. "Generovat assertiony automaticky?" (checkbox, vychozi: zaskrtnuto)
4. [Ulozit]

Toto je "killer feature" flow — uzivatel nemusel nic nastavovat,
proxy zachytila real traffic a jednim klikem vznikne regresstni test.

### Filtrovani traffiku (sidebar)

- Hledani URL: live, po kazdem znaku
- Method filter: multiselect (GET, POST, PUT, DELETE, PATCH, ...)
- Status filter: 2xx / 3xx / 4xx / 5xx / Error
- Host: exclude/include konkretni domenou (google fonts mimo zajmu)
- Sesion filter: ulozene relace (dnesi, vcera, ...)

---

## 4. API Health Dashboard

### Kde zije

Vlastni mod v activity bar: **[Monitors]**. MonitorsModal uz existuje —
stejny upgrade jako u Flow a Traffic: pretvoreni modalu na plnohodnotny mod.

### Duvod pro integrovany mod (ne modal)

Monitoring je sluzba, ktera bezi na pozadi. Uzivatel bude chtit:
- Videt stav behem prace v Request modu (side-by-side)
- Rychle prepnout na Monitors kdyz status bar nebo activity bar ukazuje
  problem

### Layout Monitors modu

```
Sidebar (260 px):
├── [+ Novy monitor]
├── ─────────────────────
├── Filtry:
│   [ALL] [OK] [Warning] [Down]
│   [ Hledat...          ]
├── ─────────────────────
├── Skupiny:
│   Production
│   ● /api/health         200ms  [OK]
│   ● /api/users          890ms  [WARN]
│   ○ /api/payments       —      [DOWN]  <- cervena
│
│   Staging
│   ● /api/health         120ms  [OK]
└── ─────────────────────
```

```
Main panel:
┌─── Monitors ──────────────────────────────────────────────────┐
│ Celkovy stav: 14/16 OK  |  2 WARN  |  1 DOWN                 │
├───────────────────────────────────────────────────────────────┤
│  Vybrana sluzba: GET /api/payments  [Production]              │
│  ─────────────────────────────────────────────────────────    │
│                                                               │
│  Stav: [DOWN] Posledni uspesny: 14 min ago                   │
│                                                               │
│  Response time (posledni 24h):                               │
│  ▁▂▃▄▂▁▂▄▅▇████░░░░░░░░░░░░░░░░░░░░░  <- sparkline         │
│  ^--- dnes 10:00                       ^--- ted (no data)    │
│                                                               │
│  Posledni pokusy:                                            │
│  10:47  timeout 30s    [DOWN]                                │
│  10:42  timeout 30s    [DOWN]                                │
│  10:37  200   890ms    [WARN]  (nad threshold 500ms)         │
│  10:32  200   430ms    [OK]                                   │
│                                                               │
│  Alert nastaveni:                                            │
│  Threshold: 500ms   |   Na: email@firma.cz, Webhook          │
│  [Editovat]         [Spustit manualne]  [Pozastavit]         │
│                                                               │
│  [Otevrit request v editoru]  <- prejde do Request modu      │
└───────────────────────────────────────────────────────────────┘
```

### Integrace se StatusBar

StatusBar (jiz `col-span-2`) dostane novy indikator napravo od
sidecar statusu:

```
[● sidecar v0.0.1]  [● 14/16 monitors OK]  [2 WARN]  [1 DOWN v]
                                                         ↑ klik = prepne do Monitors modu
```

Toto je "passive monitoring" — uzivatel pracuje v Request modu a na
perifeii vidi ze neco spadlo. Jedno kliknuti ho dostane do kontextu.

---

## 5. Collaboration Presence

### Kontextova poznamka

Realtimova kolaborace zatim neni v roadmape. Navrhuju UX tak, aby
byl implementacne co nejjednodussi v budoucnu a NEBLOKOVAL stavajici
funkce. Presence je proto navrzena jako "graceful enhancement" —
pokud neni k dispozici server, komponenta se jednoduche nezobrazi.

### Kde zije

Presence indikatoru jsou na dvou mistech:

**1. Sidebar — u nazvu kolekce / requestu**

```
My Payments API                [+]
├── POST /auth/login           [TM] [PK]   <- avatary editoru
├── GET  /users                [TM]
└── POST /transfer
```

Avatary jsou malicke (16px kruh s initialami nebo fotkou), max 3 —
pak "+2 more". Hover = tooltip "Tomas Maly (editing)", "Pavel Kratky (viewing)".

Proc sidebar: uzivatel uz se diva na seznam requestu. Presence je
extra informace v existujicim kontextu — nevyrusi flow, jen doplni.

**2. Tab bar — u aktivniho tabu**

```
[POST /login  TM]  [GET /profile]  [+]
       ↑ 12px avatar u aktivniho tabu kdyz nekdo jiny ma stejny request otevreny
```

Proc tab bar: uzivatel prave pracuje s timto requestem — relevantni
upozorneni.

### Conflict prevention (ne resolution)

Nesnazime se resit merge konflikty (to je problem pro synkronizaci
backendu, ne UX). Navrhuju jednoduchy "soft lock":

- Kdyz dva lide otevrou stejny request, oba uvidí presence avatar.
- Kdyz jeden klikne "Edit" a zacne menit, druhy vidi banner:
  "Tomas Maly prave edituje tento request."
- Druhy muze editovat stejne — ale bude varovany ze muze dojit ke
  konfliktu pri ulozeni.

```
┌─── Request: POST /auth/login ─────────────────────────────────┐
│ [TM] Tomas Maly prave edituje tento request.   [X] zavrit     │
└───────────────────────────────────────────────────────────────┘
```

### Cursor presence (budoucnost)

Kurzory v RequestPanel (ukazat kde nekdo pise v body editoru) jsou
mozne pres Monaco editor API (cursor positions). Navrhuju to az v
dobe kdy mame realtimovy backend — tato vrstva UX navrhu neblokuje.

---

## Celkova informacni architektura (po vsech pridanich)

### Sitemap

```
Theridion Desktop App
├── [Activity Bar — vzdy viditelna, 40px]
│   ├── Requests (vychozi)
│   ├── Flows
│   ├── Traffic
│   ├── Monitors
│   ├── ─ oddelovac ─
│   ├── AI (toggle right panel)
│   └── Settings → SettingsModal
│
├── [Sidebar — 260px, kontext dle activity]
│   ├── Requests mode: Collections tree
│   ├── Flows mode: Flow list
│   ├── Traffic mode: Filter + Host list
│   └── Monitors mode: Monitor list + status
│
├── [Main area — vsechny mody]
│   ├── Requests mode:
│   │   ├── Tab bar + Env picker
│   │   ├── URL bar
│   │   └── Request | Response grid
│   │       └── Response: [Body][Headers][Console][Timing][AI]
│   ├── Flows mode:
│   │   ├── Flow tab bar (otevrene flows)
│   │   └── Canvas + Run log
│   ├── Traffic mode:
│   │   ├── Recording controls + stats bar
│   │   ├── Traffic table (live)
│   │   └── Detail panel (dolni)
│   └── Monitors mode:
│       ├── Summary bar
│       └── Monitor detail + sparkline
│
└── [Status bar — col-span-2, permanentni]
    ├── Sidecar health
    ├── Monitor summary badge (novy)
    ├── Request count
    └── Settings ikona
```

### Navigace

- **Hlavni navigace:** Activity bar (5 ikon)
- **Kontextova navigace:** Sidebar (meni se dle modu)
- **Sesunova navigace:** Tab bar v Request modu (zachovava open requests)
- **Globalní zkratky:** Cmd+K (command palette), Cmd+T (novy tab), Cmd+Shift+F (Flows), Cmd+Shift+T (Traffic), Cmd+Shift+M (Monitors)

---

## Principy koexistence s existujicim layoutem

### Pravidlo 1: Modaly jako vstupni bod, mody jako pracoviste

FlowEditorModal, ProxyRecorderModal, MonitorsModal, PerformanceDashboardModal
existuji. Navrhuju je zachovat pro "rychle naniknuti" (command palette),
ale pridat "Otevrit jako plnohodnotny mod" button uvnitr modalu.

Uzivatel, ktery potrebuje jen rychlou kontrolu, zustane v modalu.
Uzivatel, ktery potrebuje pracovat delsi dobu, prejde do modu.

### Pravidlo 2: Request mod zustava nedotcen

Zadna zmena v `grid-cols-2` strukture, URL baru, tab baru, Sidebar.
Vsechny stajici testy projdou. AI tab je additivni zmena uvnitr
ResponsePanel — ostatni taby jsou nedotceny.

### Pravidlo 3: Progressive disclosure

Activity bar je vzdy viditelna, ale neutralni (ikony bez textu, jen
hover tooltip). Uzivatel se k novym modum dostane kdyz chce —
neviditelna do te doby.

Presence avatary jsou 16px — nerusuji layout, jen doplnuji.

Monitor badge ve status baru je jednoradkovy text — uz ted ma status
bar request count a sidecar status, pridani monitor stavu je konzistentni.

### Pravidlo 4: Kazdy mod ma svuj "navrat do Request modu"

- Flows: "Otevrit request v editoru" button na bloku → prepne mod + otevre tab
- Traffic: "Otevrit v Request tabu" → prepne mod + otevre tab
- Monitors: "Otevrit request v editoru" → prepne mod + otevre tab

Uzivatel nikdy neni "uveznen" v nerequest modu.

---

## Stavy a edge cases

| Obrazovka / situace | Stav | Co se zobrazi |
|---|---|---|
| AI tab, zadny request | Prazdny | "Posli request — AI zanalyzuje odpoved." |
| AI tab, analyza bezi | Loading | Skeleton 3 karty + "Analyzing..." |
| AI tab, bez navrhu | Success-empty | "Odpoved vypada v poradku. Zadne navrhy." |
| Flows canvas, prazdny flow | Prazdny | Velky "+ Pridej prvni blok" CTA uprostred canvasu |
| Traffic sidebar, proxy vypnuta | Idle | "Proxy je vypnuta. Spust ji a zaznamenavej provoz." [Spustit] |
| Traffic table, zadny traffic | Prazdny | Animovany radar/waiting indicator |
| Monitors sidebar, zadny monitor | Prazdny | "Zadne monitory. Pridej prvni endpoint." [+] |
| Monitor DOWN | Alert | Cervena ikona v activity baru, status bar badge |
| Presence, nikdo jiny neni online | Neni pritomen | Zadne avatary — zadna zmena v UI |
| Presence, nekdo edituje | Varuje | Subtle banner v RequestPanel |

---

## Pristupanost

- Touch target minimalne 44x44 px (activity bar ikony: 40x40 px zone —
  potreba overit, mozna pridat padding)
- Activity bar ma ARIA role="navigation" + aria-label="Activity"
- Kazda ikona v activity baru ma aria-label a title (hover tooltip)
- Presence avatary: aria-label="Tomas Maly (editing this request)"
- Flows canvas: keyboard navigation pro bloky (Tab preskoci bloky,
  Enter = editovat, Delete = smazat, sipky = presunout)
- Kontrastni pomer textu: min 4.5:1 (zachovava stavajici palette)
- Sparkline v Monitors: doplnit textovy alt "Response time last 24h:
  average 230ms, current: timeout"

---

## Dalsi kroky pro UI Designera

1. Zpracuj Activity bar vizualne — ikony, aktivni stav (emerald akcent),
   hover, sirka 40px. Pouzij Lucide ikony (Zap pro AI, GitBranch pro
   Flows, Radio pro Traffic, Activity pro Monitors).

2. Navrhni AI suggestion karty — potrebuji ikonu, text, 2 CTA tlacitka.
   Inspirace: GitHub Copilot suggestion chips, ale v dark theme.

3. Flows canvas blok komponenty — 3 typy: Request (s method badge),
   Extract (variable ikona), Assert (check ikona). Kazdy blok ma
   vstupni a vystupni "port" (klikatelny kruh).

4. Presence avatar stack — 16px kruhy s overlappingem (margin-left: -4px),
   max 3 + "+N" badge.

5. Status bar monitor badge — zachovat existujici StatusBar layout,
   pridat badge za sidecar health. Navrhnout 3 barevne stavy:
   neutral (vsechno ok), amber (warning), red (down).

---
