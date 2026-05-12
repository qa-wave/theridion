# Marketingová strategie: Theridion
**Od:** Marketér
**Pro:** Projektový manažer, Web Designér, Copywriter
**Datum:** 2026-05-09
**Projekt:** Theridion — open-source API testing platform

---

## 1. Positioning statement

**Pro vývojáře a QA inženýry, kteří testují enterprise API** (SOAP, REST, GraphQL
dohromady), **kteří** jsou uvězněni mezi zastaralým SoapUI a cloudem Postmanu,
**je Theridion** open-source desktop API tester, **který** jako jediný kombinuje
moderní UI, WS-Security podporu a Playwright-style trace report v jednom nástroji
bez cloud lock-inu — **na rozdíl od** Postmanu (bez WS-Security, bez gitu)
a SoapUI (UI z 2008, $700/seat), **náš produkt** je bezplatný, MIT licencovaný
a vaše collections jsou git diffable od prvního dne.

**Jednověta pro veřejnost:**

> Theridion is the first open-source desktop API tester that does REST, SOAP,
> GraphQL, gRPC and WS-Security in one tool — with git-friendly file storage
> and a Playwright-style test trace viewer.

---

## 2. Tagline

**"One tool. Every API. Your git repo."**

Záložní varianty (pro A/B testování):
- "API testing without the cloud tax."
- "SoapUI power. Bruno simplicity. Playwright traces."
- "Your APIs in git. Your tests with traces."

---

## 3. Klíčová sdělení (hero sekce landing page)

### Bullet 1 — Diferenciátor #1 (SOAP / WS-Security)
> **Full WS-Security — the only modern API tester that does it.**
> UsernameToken, XML Signature, X.509 certificates. Stop paying $700/seat
> for ReadyAPI to test your bank integrations.

### Bullet 2 — Diferenciátor #2 (Git-native)
> **Your collections live in your git repo — not in Postman's cloud.**
> Diff them, review them, version them. Works completely offline,
> zero telemetry, zero accounts.

### Bullet 3 — Diferenciátor #3 (Test runner + trace)
> **Playwright-style HTML trace reports for your API tests.**
> See exactly which assertion failed, how long each step took,
> what the response body was — visually, not in JUnit XML.

---

## 4. Launch strategie

Cíl launche: **minimálně 500 GitHub stars za první měsíc**,
**1 000 unikátních stažení**, **50+ GitHub Issues od komunity**.

### Fáze 0: Pre-launch (T-3 týdny) — příprava

| Kdy | Aktivita | Zodpovědný | Výstup |
|-----|----------|------------|--------|
| T-3 | Přepsat README — produktová komunikace, hero copy, GIF demo | Copywriter + UX | README v1 |
| T-3 | Natočit 90s demo video (asciinema nebo QuickTime) | Dev tým | `demo.gif` nebo MP4 |
| T-2 | Napsat launch blog post: "Why I built yet another API tester" | Copywriter | Hotový draft |
| T-2 | Nastavit GitHub Discussions (ne Discord jako primárum) | Marketér | Zapnuto |
| T-2 | Vytvořit `CONTRIBUTING.md` + `good first issue` labels | Dev tým | Hotové |
| T-2 | Připravit binaries na GitHub Releases (macOS + Linux) | Dev tým | CI pipeline |
| T-1 | Připravit HN Show post (text hotový, načasování úterý ráno UTC) | Marketér | Draft |
| T-1 | Připravit Reddit posts pro r/programming, r/webdev, r/softwaretesting | Marketér | Drafty |
| T-1 | Identifikovat 10 relevantních SOAP/enterprise bloggerů a newsletterů | Marketér | Seznam |
| T-1 | Soft launch post na X a LinkedIn — "something is coming" | Marketér | Tweet/post |

### Fáze 1: Launch (den D) — announcements ve správném pořadí

**Pořadí záleží — HN je rychlý trh, přijdou kommentáři "why not Postman",
musíme být připraveni odpovídat.**

| Pořadí | Kdy (UTC) | Kanál | Formát |
|--------|-----------|-------|--------|
| 1. | D, 9:00 | Hacker News "Show HN" | 1 odstavec + odkaz |
| 2. | D, 9:30 | X / Twitter | Thread (3 tweety, screenshot, GIF) |
| 3. | D, 10:00 | LinkedIn | Strukturovaný post, screenshot, "why" story |
| 4. | D, 11:00 | Reddit r/softwaretesting | Post s kontextem |
| 5. | D, 12:00 | Reddit r/programming | Cross-post |
| 6. | D, 14:00 | Dev.to / Hashnode | Blog post publikovat (byl napsán T-2) |
| 7. | D, 15:00 | Bruno GitHub Discussions | Respektfull "built this as complement to Bruno" |
| 8. | D+1 | Product Hunt | Listed (ne primární kanál — Bruno tam šel, měl 300+ upvotů) |
| 9. | D+2 | Email outreach — 10 bloggerů, 3 newslettery | Personalizovaný email |

**HN timing pravidlo:** "Show HN" posts mají nejvyšší traction úterý–čtvrtek,
mezi 8:00–12:00 UTC. Vyhýbej se pondělí a pátek.

**Bruno Discussions poznámka:** Neútočit na Bruno. Framing:
*"Theridion started as Bruno-inspired but added WS-Security and trace runner
for teams that test SOAP integrations. Great for using alongside Bruno."*

### Fáze 2: Post-launch momentum (D+1 týden – D+2 měsíce)

| Kdy | Aktivita | Kanál |
|-----|----------|-------|
| D+3 | Follow-up post: "What we learned from HN comments" | Dev.to |
| D+7 | Tutorial: "Testing SOAP with WS-Security from scratch" | Blog + YouTube |
| D+14 | Comparison post: "Theridion vs SoapUI — side by side" | Blog (SEO) |
| D+21 | Tutorial: "Replace Postman with git-friendly Theridion in 10 min" | Blog (SEO) |
| D+30 | Community roundup newsletter — "Month 1 stats" | GitHub Discussions |
| D+45 | Reach out do 5 tech podcasts (Software Engineering Daily, changelog) | Email |
| D+60 | "v0.2 announced" post — CLI runner + AI asserty | Všechny kanály |

---

## 5. Komunitní strategie

### Primární centrum: GitHub

GitHub Discussions je základna. Důvody:
1. Indexovaný Googlem — každá otázka se stává SEO obsahem
2. Zůstává v repozitáři — není závislá na třetí straně
3. Přirozené místo pro open-source projekt — contributors tam jsou

**Nastavení GitHub Discussions:**
- Kategorie: `Q&A`, `Ideas`, `Show & tell`, `Announcements`
- Pinned post: "Welcome + roadmap + how to get help"
- Template pro Issues: bug report a feature request s checklistem

### Discord — ano, ale ne primárně

Discord je dobrý pro real-time chat a engagement, ale ztratí historii.
Doporučení: Otevřít Discord **až po 200+ GitHub stars** — dřív je prázdný
a vypadá to špatně.

Alternativa před Discordem: **Matrix/Element room** — decentralizovaný,
open-source komunity to ocení.

### Co pomáhá organickému růstu

1. **`examples/` složka** v repozitáři s ukázkovými collections:
   - `petstore-rest.json` — základní REST
   - `calculator-soap-wssecurity.json` + `calculator.wsdl` — killer demo
   - `github-graphql.json` — GraphQL showcase

2. **Public roadmap** jako GitHub Project board — uživatelé hlasují thumbs-up
   na Issues. To vytváří pocit participace a retention.

3. **"good first issue"** labely s jasným popisem — onboarding contributorů.
   Cíl: 5 externích PR do 3 měsíců od launch.

4. **Monthly changelog** v GitHub Discussions — co bylo přidáno, co se chystá.
   Krátký, konkrétní.

---

## 6. Content strategie

### Blog (GitHub Pages nebo dev.to jako start — vlastní web až v0.2)

**Launch blog post (den D):**
- Titulek: *"Why I built yet another API tester (and why this one is different)"*
- Obsah: osobní příběh, konkrétní frustrace se SoapUI + Postmanem,
  screenshot srovnání, 3 klíčové diferenciátory, CTA "Try it"
- Délka: 1200-1500 slov — dost pro SEO, ne moc pro čtení

**SEO pillar posts (týdny 2-8 po launch):**

| Titulek | Klíčové slovo | Priorita |
|---------|--------------|----------|
| "Best free SoapUI alternative in 2026" | `soapui alternative free` | VYSOKÁ |
| "Theridion vs SoapUI: full comparison" | `theridion vs soapui` | VYSOKÁ |
| "How to test WS-Security SOAP APIs without SoapUI" | `ws-security testing tool` | VYSOKÁ |
| "Postman alternative with git storage" | `postman alternative open source` | VYSOKÁ |
| "Bruno vs Theridion: which API tester for your team?" | `bruno api tester` | STŘEDNÍ |
| "WS-Security tutorial: UsernameToken step by step" | `ws-security usernametoken` | STŘEDNÍ |
| "API testing in CI/CD without Postman cloud" | `postman ci cd alternative` | STŘEDNÍ |
| "WSDL testing with modern tools in 2026" | `wsdl testing tools 2026` | STŘEDNÍ |
| "Collection runner with HTML trace report for APIs" | `api test runner trace report` | NÍZKÁ |
| "Replace ReadyAPI: open source enterprise API testing" | `readyapi alternative` | NÍZKÁ |

### Video content

**Priorita 1 — Demo GIF/video (před launch):**
- 90 sekund, bez hlasu, titulky
- Příběh: "Open app → import WSDL → add WS-Security → run → see trace"
- Formát: GIF pro README, MP4 pro Twitter/LinkedIn, YouTube pro SEO

**Priorita 2 — YouTube tutoriály (měsíc 1-2 po launch):**
1. "Testing SOAP services with WS-Security — Theridion walkthrough" (~8 min)
2. "Move from Postman to Theridion in 10 minutes" (~6 min)
3. "API test automation: Theridion collection runner + CI/CD" (~10 min)

YouTube kanal vytvořit ihned, i prázdný — rezervace jména.

### Social media

**X / Twitter:**
- Frekvence: 3-4x týdně ve fázi launch, pak 1-2x týdně
- Obsah: screenshots, tipy ("did you know"), retweet community posts,
  progress updates ("just shipped: cookie jar support")
- Engagovat v threadech o Postman, SoapUI, Bruno, API testing

**LinkedIn:**
- Frekvence: 1-2x týdně
- Obsah: longer form "why" posts, link na blog, milestone announcements
- Cílit hashtags: `#APITesting`, `#QA`, `#OpenSource`, `#SOAP`, `#DevTools`
- Persona: Jakub (enterprise backend dev) je na LinkedIn aktivní

**Reddit — spíš community než marketing:**
- Nepostovat reklamu. Přispívat do diskusí o API testing nástrojích.
- Zmínit Theridion organicky když je relevantní.
- Subreddity: r/softwaretesting, r/webdev, r/programming, r/QualityAssurance

---

## 7. SEO strategie

### Primární klíčová slova

| Klíčové slovo | Odhadovaný objem | Obtížnost | Fáze |
|--------------|-----------------|-----------|------|
| `soapui alternative` | 1 200/měs | Střední | Launch |
| `soapui alternative free` | 600/měs | Nízká | Launch |
| `postman alternative open source` | 2 400/měs | Vysoká | Měsíc 1 |
| `postman git alternative` | 300/měs | Nízká | Launch |
| `ws-security testing` | 200/měs | Nízká | Launch |
| `api testing desktop` | 800/měs | Střední | Měsíc 1 |
| `bruno api tester alternative` | 150/měs | Nízká | Měsíc 2 |
| `readyapi alternative` | 400/měs | Nízká | Měsíc 2 |
| `api test runner ci cd` | 500/měs | Střední | Měsíc 3 |
| `wsdl testing tool` | 350/měs | Nízká | Měsíc 1 |

### Long-tail (nízká kompetice, vysoká intent)

- "how to test soap api without soapui"
- "ws-security usernametoken example"
- "postman soap wsdl alternative"
- "api collections in git"
- "html test report api testing"
- "theridion api tester download"

### Technické SEO doporučení

1. GitHub README je indexovaný — použít klíčová slova v nadpisech a prvních 160 znacích.
2. GitHub repository description (160 znaků): obsahovat "SOAP", "WS-Security",
   "open source", "git-friendly".
3. GitHub Topics nastavit: `api-testing`, `soap`, `ws-security`, `postman-alternative`,
   `open-source`, `tauri`, `rest`, `graphql`, `testing-tools`.
4. Budoucí web: každá comparison page = samostatná URL, vlastní meta description.
5. Blog posts: minimálně 1200 slov, H2/H3 struktura, interní linky.

---

## 8. Pricing model pro budoucí Pro tier

### Doporučená strategie: Open Core (spustit ne dříve než v1.0, min. 2000 stars)

```
Free (MIT, navždy):
- Desktop app, plné funkce lokálně
- Neomezené collections, environments, requesty
- WS-Security, všechny protokoly
- CLI runner (theridion test)
- Komunitní podpora

Pro ($9/seat/měsíc, roční billing $7/měs):
- Theridion Sync: collections v cloudu (volitelné, end-to-end šifrované)
- Team shared environments
- CI/CD integrace s dashboard (výsledky přímo v Theridion webu)
- Priority email podpora
- Cíl: alternativa k Postman Teams ($14/seat/měs)

Enterprise (custom, min. $500/tým/rok):
- On-premises sync server (self-hosted)
- SSO (SAML, OIDC)
- Audit logy
- SLA a dedikovaná podpora
- Custom WSDL/XSD integrace support
- Cíl: alternativa k ReadyAPI ($700+/seat/rok)
```

**Klíčový princip:** Desktop app zůstane 100% free navždy. Monetizace = cloudové
a enterprise add-ony, ne feature-gate na core funkcích. To je Bruno model
a je to důvod, proč komunita Brunu důvěřuje (na rozdíl od Insomnia, která
cloudizovala open-source verzi a ztratila komunitu).

**Časování:** Nezačínat monetizaci před:
- 2000+ GitHub stars
- 20+ platících testerů (enterprise pilot)
- Stabilní v1.0 release

---

## 9. První 1000 uživatelů — acquisition plán

### Odkud přijdou (kanály seřazené podle priority)

| Kanál | Odhadovaný podíl | Taktika |
|-------|-----------------|---------|
| Hacker News Show HN | 30-40% | Jeden dobrý post v správný čas |
| Organické vyhledávání (GitHub + blog) | 20-25% | SEO blog posty, GitHub topics |
| Reddit | 10-15% | Autentická participace, ne spam |
| LinkedIn (enterprise persona Jakub) | 10-12% | Cílené posty na API testing |
| Dev.to / Hashnode | 5-8% | Launch post a tutoriály |
| Word of mouth / GitHub referrals | 10-15% | Každý spokojený uživatel sdílí |
| Direct search ("theridion") | 5% | Roste s každým mention |

### Konkrétní kroky pro 1000 uživatelů

**Týden 1-2 (cíl: 300 stažení):**
1. Dokonalý "Show HN" post — 1 šance, 1 text, správný timing.
   Musí obsahovat: konkrétní problém, proč ne existující nástroje, screenshot,
   link na live demo nebo GIF.
2. Reddit r/softwaretesting post — upřímný, s konkrétním use case.
3. LinkedIn post od zakladatele — osobní příběh "proč jsem to postavil".

**Týden 3-4 (cíl: 500 stažení):**
4. Dev.to blog post indexovaný Googlem.
5. Outreach na 5 tech newsletterů:
   - TLDR (tech sekce) — `hello@tldr.tech`
   - Changelog Weekly — GitHub repo submit
   - Python Weekly (sidecar je Python) — editor submission
   - JavaScript Weekly (Tauri/frontend) — editor submission
   - Software Lead Weekly — SOAP enterprise angle
6. GitHub Topics nastavit správně — organický traffic z "explore".

**Měsíc 2 (cíl: 750 stažení):**
7. První SEO pillar post ("best soapui alternative") indexovaný.
8. YouTube demo video — 8 minutový walkthrough.
9. Odpovídat na každou Stack Overflow otázku o "WS-Security testing" s odkazem
   kde je to relevantní (ne spam).
10. Zapojit se v r/QualityAssurance a r/webdev diskusích organicky.

**Měsíc 3 (cíl: 1000 stažení):**
11. "v0.2 announcement" — CLI runner + AI asserty = druhá vlna zájmu.
12. Podcast pitch — Software Engineering Daily, changelog, testingpodcast.com.
13. GitHub Awesome Lists submits:
    - `awesome-testing`
    - `awesome-api-testing`
    - `awesome-open-source`

### Retention (udržení uživatelů)

1000 stažení = nic, pokud se nikdo nevrátí. Klíčové pro retention:

- **Cold start pod 3 s** — každá sekunda čekání ztrácí uživatele
  (aktuálně 6-8 s = problém, zombie moduly musí pryč před launch)
- **Empty state onboarding** — první spuštění musí zobrazit "Start here":
  ukázkovou collection, nebo průvodce vytvoření prvního requestu
- **GitHub Discussions aktivní** — každý nový Issues dostane odpověď do 24 hodin
  (zakladatelský závazek na prvních 6 měsíců)
- **Monthly changelog** — uživatelé se vrátí, pokud vědí, že se něco děje

---

## 10. KPIs a metriky

### Primární metriky (launch)

| Metrika | Cíl měsíc 1 | Cíl měsíc 3 | Cíl měsíc 6 |
|---------|-------------|-------------|-------------|
| GitHub stars | 500 | 1 500 | 3 000 |
| GitHub releases stažení | 1 000 | 3 500 | 7 500 |
| GitHub Issues od komunity | 50 | 120 | 200 |
| GitHub Discussions vlákna | 20 | 60 | 120 |
| Externích PR / contributors | 2 | 10 | 25 |
| 7-denní retention (vrátí se) | 25% | 30% | 35% |

### Sekundární metriky (content / SEO)

| Metrika | Cíl měsíc 1 | Cíl měsíc 3 | Cíl měsíc 6 |
|---------|-------------|-------------|-------------|
| Organický traffic (GitHub + blog) | 2 000/měs | 8 000/měs | 20 000/měs |
| Blog post views (celkem) | 1 500 | 10 000 | 30 000 |
| YouTube video views | 500 | 3 000 | 10 000 |
| HN Show HN points | 100+ | — | — |
| Newsletter mentions | 2 | 6 | 12 |

### Červené vlajky (okamžitá akce)

- GitHub star/download poměr < 10% → README nevysvětluje hodnotu, přepsat hero
- Cold start > 8 s po zombie module cleanup → PyInstaller problém, urgentně řešit
- GitHub Issues s "doesn't work on Windows" > 20% → Windows support priorita
- HN post < 50 points → špatný timing nebo copy, zkusit znovu za 4 týdny

### Co NEMĚŘIT (nebo měřit sekundárně)

- Social media follower count — vanity metrika, cena neodpovídá úsilí
- Product Hunt ranking — lepší zaměřit energii na HN a Reddit
- Press coverage — nice to have, nevěnovat tomu aktivně čas

---

## Kritické prerekvizity před launch

Toto MUSÍ existovat den D, jinak launch poškodí reputaci víc než pomůže:

1. **Cold start pod 4 s** — zombie moduly odregistrovat z `main.py`
2. **README přepsaný** — hero copy, GIF demo, "why Theridion" sekce
3. **`CONTRIBUTING.md`** — jak přispět, jak spustit dev
4. **GitHub Releases** — macOS + Linux binaries připravené ke stažení
5. **GitHub Topics** — nastavené pro organický discovery
6. **Prázdný stav v UI** — onboarding prompt, ne prázdná obrazovka
7. **Demo GIF nebo video** — 90 sekund, ukazuje WS-Security flow

Bez těchto 7 věcí je lepší launch odložit o 2 týdny než riskovat "meh" reakci
na HN, ze které se těžko zotavuje.

---

## Rozpočet

Theridion je open-source projekt v pre-revenue fázi. Doporučený budget:

| Položka | Měsíčně | Poznámka |
|---------|---------|----------|
| Doménové jméno (`theridion.dev`) | ~150 Kč | Koupit ihned |
| Web hosting (GitHub Pages zdarma, nebo Vercel Free) | 0 Kč | Start zde |
| Blog (dev.to zdarma, nebo Ghost $9/měs) | 0–250 Kč | Start na dev.to |
| YouTube / X / LinkedIn | 0 Kč | Organický obsah |
| Paid ads | 0 Kč | Příliš brzy — bez retence nemá cenu |
| **Celkem (měsíc 1-3)** | **~150 Kč/měs** | Minimální náklady |

Paid ads (Google Ads, cílení "soapui alternative") zvažovat až po dosažení
500 GitHub stars a prokázané retenci. Inzerovat nástroj, který uživatel
nechce vrátit, je vyhazování peněz.

---

## Handoff — co potřebujeme od týmu

### Od Copywritera (do T-2):
- README hero sekce (headline, subheadline, 3 bullet diferenciátory)
- HN Show post text (1 odstavec, max 300 slov)
- Reddit post drafty (2 verze — r/softwaretesting a r/programming)
- Launch blog post "Why I built yet another API tester" (~1200 slov)

### Od UX/Web Designéra (do T-2):
- Demo GIF nebo video (90 sekund, WS-Security flow)
- Screenshot pro social media (1200x630px)
- README hero screenshot nebo animated demo

### Od Dev týmu (do T-1):
- Zombie moduly odregistrovány — cold start pod 4 s
- GitHub Releases pipeline (macOS + Linux binary auto-build)
- GitHub Topics nastaveny
- `CONTRIBUTING.md` vytvořeno
- Empty state onboarding v UI

---

```
---HANDOFF---
OD: Marketér
KOMU: projektovy-manazer
STATUS: hotovo
VÝSTUP: /Users/tm/workspaces/projects/theridion/docs/marketing/marketing-strategy.md
DALŠÍ KROK: Projektový manažer přiřadí úkoly:
  1. Copywriter → README hero copy + launch blog post (do T-2)
  2. UX Designér → demo GIF + screenshot (do T-2)
  3. Dev tým → zombie moduly + cold start + GitHub Releases (do T-1)
  4. Marketér → finalizovat timing HN postu, nastavit GitHub Topics, registrovat theridion.dev
OTÁZKY:
  1. Je datum launch stanoveno? HN timing závisí na konkrétním dnu.
  2. Kdo natočí demo GIF/video — dev tým nebo UX?
  3. Má projekt zakladatele s LinkedIn profilem pro osobní "why I built this" post?
     Ten příběh je klíčový — autentičtější než corporate post.
  4. Je v plánu registrace domény theridion.dev nebo theridion.app?
---/HANDOFF---
```
