# Bezpecnostni audit: Theridion Sidecar
**Od:** Security specialista
**Pro:** Projektovy manazer, Vyvojari, DevOps
**Datum:** 2026-05-12
**Projekt:** Theridion v0.x (pre-release)

---

## Shrnutí

- **Celkové hodnocení:** Kritické riziko
- **Kritických nalezů:** 3
- **Vysokých nalezů:** 4
- **Strednich nalezů:** 3
- **Nízkých nalezů:** 2
- **Doporučení:** BLOKUJE release — kritické nálezy SEC-001 a SEC-002 musí být opraveny před jakýmkoliv veřejným vydáním nebo sdílením binárky s nedůvěryhodnými uživateli.

---

## Kontext a rizikový model

Theridion sidecar je FastAPI server běžící na loopbacku (127.0.0.1), spawnovaný Tauri shellem. Primárním útočníkem v rámci desktop aplikace je:

1. **Lokální webový obsah (malicious web page)** — prohlížeč na stejném stroji může posílat cross-origin requesty na 127.0.0.1:PORT. CORS to z prohlížeče blokuje korektně — ale pouze pro browsery. Lokální skripty, malware, jiné aplikace CORS nerespektují.
2. **Škodlivý import** — soubor kolekce nebo workspace ZIP může být podvrzený externím zdrojem.
3. **Insider threat** — uživatel aplikace (nebo skript spuštěný v jeho kontextu) může přímo zavolat sidecar API bez omezení autentizace.

Tato architektura je standardní pro desktop API testery (Postman, Bruno, Insomnia mají totéž). Klíčový bezpečnostní požadavek: **sidecar nesmí být zneužit k útoku mimo jeho mandát** (tj. nesmí sloužit jako backdoor pro spouštění shellu nebo exfiltraci dat z filesystemu nad rámec ~/.theridion).

---

## OWASP Top 10 Check

| # | Kategorie | Status | Poznámky |
|---|-----------|--------|----------|
| A01 | Broken Access Control | fail | Žádná autentizace mezi frontendem a sidecarem. Terminal endpoint bez jakékoli autorizace. |
| A02 | Cryptographic Failures | fail | XOR místo AES v project_encryption.py a secret_encryption.py. |
| A03 | Injection | fail | terminal.py: `create_subprocess_shell` s nevalidovaným vstupem. npm_loader.py: přímé předání module_name do `npm install`. |
| A04 | Insecure Design | varování | Záměrně neomezená plocha útoku (80+ routerů, terminal, npm, git). |
| A05 | Security Misconfiguration | varování | docs_url="/docs" je dostupný bez autentizace — exponuje kompletní API schéma. |
| A06 | Vulnerable Components | varování | Nutno ověřit `uv audit` — nebylo součástí tohoto auditu. |
| A07 | Auth Failures | fail | Sidecar nemá žádnou autentizaci. Přijme jakýkoli request na loopbacku. |
| A08 | Data Integrity Failures | varování | workspace.py import: ZipSlip risk je zmírněn Path(name).name, ale ne úplně ošetřen. |
| A09 | Logging Failures | varování | access_log=False — žádné HTTP access logy pro audit. Bezpečnostní události se nelogují. |
| A10 | SSRF | varování | injection_scan.py, oauth2.py, ai.py: sidecar fetchuje user-controlled URL bez omezení sítě. |

---

## Nálezy

### SEC-001: Neomezené spouštění shellu
**Závažnost:** Kritická
**Kategorie:** A03 Injection / A01 Broken Access Control
**Soubor:** `apps/sidecar/theridion_sidecar/api/terminal.py`, řádky 27-32

**Popis:**
Endpoint `POST /api/terminal/exec` přijme libovolný string `command` a předá ho přímo do `asyncio.create_subprocess_shell()`. Shell-level injection je triviální: command `; rm -rf ~/important; echo` projde bez jakékoliv filtrace.

```python
proc = await asyncio.create_subprocess_shell(
    body.command,          # <-- přímý user input, shell=True ekvivalent
    ...
    cwd=body.cwd,          # <-- libovolný cwd bez validace
)
```

**Dopad:**
- Libovolné spouštění příkazů pod uživatelským účtem.
- Jiný lokální proces nebo malicious web page (pokud projde CORS — v prohlížeči ne, ale curl/fetch ze skriptu ano) může exfiltrovat SSH klíče, provést persistence, apod.
- Kombinace s `cwd` umožňuje traversal — spuštění binárky z libovolného adresáře.

**Doporučení:**
Buď endpoint úplně odstraňte (není ve veřejné roadmapě, CLAUDE.md to nezmiňuje), nebo ho omezte na striktní allowlist příkazů (např. pouze `node`, `curl`) přes `create_subprocess_exec` (ne shell). Žádná sanitizace stringu na `shell=True` není bezpečná.

```python
# Bezpecne: exec misto shell, fixni binary, zadny shell expansion
ALLOWED_BINARIES = {"node", "curl"}
binary = shlex.split(body.command)[0]
if binary not in ALLOWED_BINARIES:
    raise HTTPException(status_code=403, detail="command not allowed")
proc = await asyncio.create_subprocess_exec(*shlex.split(body.command), ...)
```

**Přiřazeno:** Backend vývojář

---

### SEC-002: Broken encryption — XOR místo AES
**Závažnost:** Kritická
**Kategorie:** A02 Cryptographic Failures
**Soubory:** `api/project_encryption.py` (celý soubor), `api/secret_encryption.py` (celý soubor)

**Popis:**
Oba moduly jsou pojmenovány "AES256" v docstringu i komentáři, ale implementují prostý XOR-based cipher:

```python
def _xor_crypt(data: bytes, key: bytes) -> bytes:
    # Simple XOR-based encryption for portability (no external deps).
    # For production, use a proper AES library.
    return bytes(b ^ key[i % len(key)] for i, b in enumerate(data))
```

XOR s opakujícím se klíčem je Vigenère cipher — prolomitelný statistickou analýzou bez znalosti hesla. PBKDF2 pro odvozování klíče je správně použito, ale key material je pak aplikován jako XOR — bezpečnostní efekt PBKDF2 je tím zcela zmařen.

Přitom projekt **již má** správnou implementaci Fernet (AES128-CBC + HMAC) v `advanced.py` (secrets vault, řádky 607-614):

```python
from cryptography.fernet import Fernet
kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=390_000)
return base64.urlsafe_b64encode(kdf.derive(passphrase.encode("utf-8")))
```

**Dopad:**
Útočník s přístupem k `~/.theridion/` (nebo exportovanému workspace ZIPu) může dekryptovat všechny "zašifrované" kolekce a tajemství bez znalosti hesla.

**Doporučení:**
Nahradit `_xor_crypt` implementací Fernet identickou s `advanced.py`. `cryptography` je již v závislostech. Zároveň přidat migraci: při prvním decryptu starého formátu oznámit uživateli, že musí re-šifrovat.

```python
# Znovupouzit z advanced.py:
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

def _derive_fernet_key(passphrase: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=390_000)
    return base64.urlsafe_b64encode(kdf.derive(passphrase.encode("utf-8")))
```

**Přiřazeno:** Backend vývojář

---

### SEC-003: npm_loader — neomezená instalace balíčků
**Závažnost:** Kritická
**Kategorie:** A03 Injection / A04 Insecure Design
**Soubor:** `apps/sidecar/theridion_sidecar/api/npm_loader.py`, řádky 35-83

**Popis:**
Endpoint `POST /api/scripts/install-module` přijme `module_name` a předá ho přímo do:
```python
proc = await asyncio.create_subprocess_exec(
    "npm", "install", body.module_name,   # <-- nevalidovano
    cwd=tmpdir,
    ...
)
```

Následně `POST /api/scripts/execute-with-modules` nainstaluje libovolné moduly a spustí libovolný JS skript — bez sandboxu, s plnými OS oprávněními Node.js procesu.

Navíc není validováno ani `module_name` — lze zadat `../../malicious` (npm path install) nebo `malicious@npm:../../../etc/passwd` (npm alias attack).

**Dopad:**
- Instalace a spuštění libovolného kódu z npm registru (nebo z filesystemu via relativní cesta).
- Eskalace ze "sandboxovaného JS scriptu" na plný OS přístup přes native addons (`child_process`, `fs`).

**Doporučení:**
1. Omezte `module_name` na `^[a-zA-Z0-9@][a-zA-Z0-9@/_.-]{0,213}$` a zakažte relativní cesty.
2. Zvažte, zda tento endpoint je vůbec potřeba před Sprint 2 — není v roadmapě Sprint 1.
3. Pokud ponecháte: spouštějte Node s `--disallow-code-generation-from-strings --no-experimental-fetch` a bez přístupu k síti kde to jde.

**Přiřazeno:** Backend vývojář

---

### SEC-004: ZipSlip při workspace importu
**Závažnost:** Vysoká
**Kategorie:** A01 Broken Access Control / A08 Data Integrity Failures
**Soubor:** `apps/sidecar/theridion_sidecar/api/workspace.py`, řádky 69-86

**Popis:**
Při importu workspace ZIP se cílový soubor konstruuje takto:
```python
dest = home_dir() / "collections" / Path(name).name
```

`Path(name).name` extrahuje pouze poslední komponentu cesty — tzn. `../../etc/passwd` se stane `passwd`. To je správné chování pro kolekce a environments.

Nicméně pro `globals.json` a `settings.json` se jméno vůbec nekontroluje:
```python
elif name == "globals.json":
    (home_dir() / "globals.json").write_text(data)
elif name == "settings.json":
    (home_dir() / "settings.json").write_text(data)
```

Tato cesta je fixní — v tomto konkrétním případě ZipSlip nehrozí. Ale **settings.json import přepíše AI API klíče** (openai_api_key, anthropic_api_key) bez upozornění uživatele. Škodlivý ZIP může podvrhnout settings tak, že AI requesty půjdou na útočníkův server (`ollama_base_url`).

Navíc: `data = zf.read(name).decode("utf-8")` + `dest.write_text(data)` — obsah souboru není validován přes Pydantic model před zápisem na disk. Malformovaný nebo enormně velký ZIP může způsobit DoS (OOM).

**Doporučení:**
1. Před zápisem validovat obsah JSON souborů přes příslušný Pydantic model (`Collection(**data)`, `AppSettings(**data)`).
2. Upozornit uživatele, pokud ZIP obsahuje `settings.json` — explicitní potvrzení před přepsáním.
3. Přidat limit velikosti ZIP (např. 50 MB).

**Přiřazeno:** Backend vývojář

---

### SEC-005: Chybějící validace token_url v OAuth2
**Závažnost:** Vysoká
**Kategorie:** A10 SSRF
**Soubor:** `apps/sidecar/theridion_sidecar/api/oauth2.py`, řádky 33-81

**Popis:**
`token_url` je přijímán jako libovolný string a předáván přímo do `httpx.AsyncClient().post()`. Sidecar tak poslouží jako SSRF proxy:

```python
response = await client.post(req.token_url, data=form_data)
```

Útočník (nebo malicious collection importovaná ze ZIPu) může nastavit `token_url` na:
- `http://169.254.169.254/latest/meta-data/` (AWS instance metadata — na serveru)
- `http://127.0.0.1:22/` (port scan loopbacku)
- `file:///etc/passwd` (pokud httpx podporuje file:// — pravděpodobně ne, ale záleží na verzi)

Navíc `grant_type` není validováno — přijme libovolný string a pošle ho token endpointu.

**Doporučení:**
1. Validovat `token_url` — musí být `https://` schéma (nebo `http://` pro dev s explicitním opt-in), hostname nesmí být loopback ani link-local.
2. `grant_type` omezit na Literal["authorization_code", "client_credentials", "refresh_token"].

```python
from pydantic import AnyHttpUrl, validator

class OAuth2TokenRequest(BaseModel):
    token_url: AnyHttpUrl
    grant_type: Literal["authorization_code", "client_credentials", "refresh_token"] = "authorization_code"
```

**Přiřazeno:** Backend vývojář

---

### SEC-006: AI API klíče v plaintextovém JSON
**Závažnost:** Vysoká
**Kategorie:** A02 Cryptographic Failures
**Soubor:** `apps/sidecar/theridion_sidecar/settings.py`

**Popis:**
`openai_api_key` a `anthropic_api_key` se ukládají jako plaintext do `~/.theridion/settings.json`:

```json
{
  "ai": {
    "openai_api_key": "sk-proj-...",
    "anthropic_api_key": "sk-ant-..."
  }
}
```

Workspace export (`GET /api/workspace/export`) tento soubor zahrnuje do ZIP archivu — bez šifrování. Sdílení exportu (backup, sync) může nechtěně exfiltrovat API klíče.

**Doporučení:**
1. Klíče ukládat přes existující secrets vault (Fernet z `advanced.py`), nikoliv jako plaintext.
2. Z workspace exportu `settings.json` vyjmout nebo maskovat pole `*_api_key`.
3. Alternativně: klíče ukládat přes OS keychain (keyring Python library).

**Přiřazeno:** Backend vývojář

---

### SEC-007: injection_scan — SSRF a rate limit bypass
**Závažnost:** Vysoká
**Kategorie:** A10 SSRF
**Soubor:** `apps/sidecar/theridion_sidecar/api/injection_scan.py`, řádky 47-85

**Popis:**
Scanner sám o sobě neobsahuje SQL injection zranitelnosti (payloady jsou konstanty, ne user input). Ale:

1. `url` parametr není validován — opět SSRF proxy na interní sítě.
2. `headers` parametr je předáván bez filtrace — útočník může injektovat `Host:` header pro vhost bypass, nebo `X-Forwarded-For` pro IP spoofing.
3. Timeout je 15 sekund a scanner spustí `N_params × 5_payloads` requestů — bez rate limitingu nebo maximálního počtu parametrů. Lze zneužít k DoS sidecaru nebo floodování cílového serveru.

**Doporučení:**
1. Validovat `url` — pouze HTTP/HTTPS, ne loopback (pokud není v dev módu).
2. Filtrovat zakázané hlavičky v `headers` (`Host`, `Content-Length`, connection hop-by-hop headers).
3. Přidat limit: max 10 parametrů, max 3 payloady per param.

**Přiřazeno:** Backend vývojář

---

### SEC-008: CORS — allow_credentials=False správně, ale wildcard headers
**Závažnost:** Střední
**Kategorie:** A05 Security Misconfiguration
**Soubor:** `apps/sidecar/theridion_sidecar/main.py`, řádky 149-159

**Popis:**
CORS konfigurace:
```python
allow_credentials=False,
allow_methods=["*"],
allow_headers=["*"],
```

`allow_credentials=False` je správně — brání cookie-based útokům. `allow_origin_regex` je správně omezen na loopback a Tauri origins.

Slabina: `allow_methods=["*"]` a `allow_headers=["*"]` jsou zbytečně permisivní. Pokud je regex obejit (typo v budoucí editaci), útočník získá kompletní přístup. Defense in depth říká omezit na nutné minimum.

**Doporučení:**
```python
allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
allow_headers=["Content-Type", "Accept", "Authorization"],
```

**Přiřazeno:** Backend vývojář (nízká priorita, neblokuje)

---

### SEC-009: storage.py UUID validace — správná, ale neúplná
**Závažnost:** Střední
**Kategorie:** A01 Broken Access Control (path traversal)
**Soubor:** `apps/sidecar/theridion_sidecar/storage.py`, řádky 44-46

**Popis:**
```python
def _path_for(collection_id: str) -> Path:
    safe = uuid.UUID(collection_id)  # raises ValueError if malformed
    return collections_dir() / f"{safe}.json"
```

UUID validace je správná a path traversal je tím efektivně znemožněn. Chvalitebná implementace.

Menší problém: `list_summaries()` načítá všechny `*.json` soubory ze složky včetně `sidecar.pid`, `globals.json` nebo `settings.json`, pokud by někdy skončily v `collections/` adresáři. `Collection(**data)` to zachytí přes Pydantic validaci (except blok), ale silhoueta chybového chování není logována.

**Doporučení:** Logovat skip při Pydantic validační chybě na DEBUG level pro diagnosiku. Nelze zneužít, ale ulehčí debugging.

**Přiřazeno:** Backend vývojář (nízká priorita)

---

### SEC-010: Žádná autentizace mezi frontendem a sidecarem
**Závažnost:** Střední
**Kategorie:** A07 Auth Failures
**Soubor:** `main.py` — architekturální rozhodnutí

**Popis:**
Sidecar neověřuje, kdo volá jeho API. Spoléhá výhradně na loopback binding. To je standardní přístup pro desktop aplikace (Postman, Bruno, Insomnia dělají totéž). Nicméně:

- Jiný lokální proces (malware) může volat sidecar API přímo.
- V kombinaci s SEC-001 (terminal) to znamená: malware na stroji = RCE pod uživatelský kontext.

**Doporučení:**
Zvažit přidání shared-secret tokenu (generovaný při startu, předávaný Tauri přes stdout, požadovaný jako header `X-Theridion-Token`). Zvýšilo by to bar pro lokální útoky aniž by to komplikovalo UX. Neblokuje release pro desktop-only použití, ale důležité před případným multi-user nebo cloud-sync scénářem.

**Přiřazeno:** Softwarový architekt (medium-term)

---

### SEC-011: docs_url dostupný bez autentizace
**Závažnost:** Nízká
**Kategorie:** A05 Security Misconfiguration
**Soubor:** `main.py` řádek 140

**Popis:**
`docs_url="/docs"` exponuje kompletní OpenAPI schéma všech 80+ endpointů na `http://127.0.0.1:<port>/docs`. Pro útočníka s lokálním přístupem to poskytuje kompletní mapu API bez nutnosti reverse engineeringu.

**Doporučení:** V produkčním buildu (ne dev) nastavit `docs_url=None`. Nebo chránit tokenem (viz SEC-010).

**Přiřazeno:** Backend vývojář (nízká priorita)

---

### SEC-012: Logování bezpečnostních událostí chybí
**Závažnost:** Nízká
**Kategorie:** A09 Logging Failures

**Popis:**
`access_log=False` v uvicorn konfiguraci. Bezpečnostní události (neúspěšný decrypt, 403 z vault) nejsou logovány na dedikovaný security log. V případě incidentu (exfiltrace dat, zneužití terminalu) nebude k dispozici žádný auditní log.

**Doporučení:** Přidat structured security event log pro: vault access (reveal), terminal exec (command hash, ne content), workspace import (source IP, počet souborů). Nikdy logovat hesla nebo klíče.

**Přiřazeno:** Backend vývojář + DevOps

---

## GDPR Compliance

Theridion je desktop aplikace bez cloud sync. Data se ukládají lokálně na stroji uživatele. GDPR odpovědnost je primárně na uživateli, nikoliv na Theridionu. Nicméně:

| Požadavek | Status | Poznámky |
|-----------|--------|----------|
| Souhlas se zpracováním | OK | Lokální data, uživatel je controller |
| Právo na přístup k datům | OK | ~/.theridion/ je přístupný přímo |
| Právo na smazání | OK | Smazání ~/.theridion/ odstraní vše |
| Právo na export dat | OK | /api/workspace/export |
| Data minimization | varování | settings.json exportuje API klíče — viz SEC-006 |
| Privacy policy | N/A | Open-source desktop tool |
| Cookie consent | N/A | Cookies jsou uživatelovy testovací data, ne tracking |

---

## Bezpecnostni konfigurace

### Binding / Network
| Parametr | Hodnota | Status |
|---|---|---|
| Bind adresa | 127.0.0.1 (loopback) | OK |
| Port | dynamický (náhodný free port) | OK |
| CORS origin | regex loopback + tauri:// | OK |
| CORS credentials | false | OK |
| CORS methods | ["*"] | varování — viz SEC-008 |

### Kryptografie
| Komponenta | Implementace | Status |
|---|---|---|
| Secrets vault (advanced.py) | Fernet + PBKDF2HMAC, 390k iterací | OK |
| project_encryption.py | XOR s PBKDF2 klíčem | FAIL — viz SEC-002 |
| secret_encryption.py | XOR s PBKDF2 klíčem | FAIL — viz SEC-002 |
| settings.json (API klíče) | Plaintext | FAIL — viz SEC-006 |

### Subprocess / Execution
| Endpoint | Metoda | Sandbox | Status |
|---|---|---|---|
| /api/terminal/exec | create_subprocess_shell | Žádný | FAIL — viz SEC-001 |
| /api/scripts/execute | subprocess.run node -e | 5s timeout | varování — viz níže |
| /api/scripts/execute-with-modules | create_subprocess_exec node | 10s timeout | FAIL — viz SEC-003 |
| /api/scripts/install-module | create_subprocess_exec npm | 30s timeout | FAIL — viz SEC-003 |

Poznámka k `/api/scripts/execute` (scripts.py): Node subprocess s `-e` a 5s timeoutem je akceptovatelný pro pre-request skripty v desktop kontextu. Uživatel spouští svůj vlastní kód. Hlavní riziko: `require('child_process')` v uživatelském skriptu projde bez omezení — to je by-design (parity s Postman). Není to bezpečnostní selhání pro desktop tool.

---

## Doporučení pro release

**BLOKUJE release** — kritické nálezy:

1. **SEC-001 (terminal.py)** — musí být odstraněn nebo zásadně omezen před jakýmkoliv vydáním. Toto je RCE vulnerability dostupná každému lokálnímu procesu.
2. **SEC-002 (XOR encryption)** — uživatelé, kteří použijí project/secret encryption, věří AES256 ochraně. Dodat XOR je porušení důvěry.
3. **SEC-003 (npm_loader)** — musí být odstraněn nebo omezen, pokud není součástí Sprint 1 roadmapy.

**Opravit před releasem (vysoká priorita):**
- SEC-004 (workspace import validace)
- SEC-005 (OAuth2 SSRF)
- SEC-006 (API klíče plaintext)
- SEC-007 (injection scan SSRF)

**Akceptovatelné riziko pro desktop beta:**
- SEC-008 (CORS headers wildcard)
- SEC-009 (storage logging)
- SEC-010 (žádná auth token — standard pro desktop API testery)
- SEC-011 (docs_url)
- SEC-012 (security logging)

---

## Dalsi kroky

### Priorita 1 — Okamžitě (blokuje release)
1. `terminal.py` — endpoint smazat. Pokud ho UI potřebuje, refaktorizovat na allowlist příkazů bez shell expansion.
2. `project_encryption.py` + `secret_encryption.py` — nahradit XOR za Fernet (kód již existuje v advanced.py).
3. `npm_loader.py` — smazat nebo přidat strict regex validaci module_name + omezení na `https://registry.npmjs.org`.

### Priorita 2 — Sprint 1 (před public beta)
4. `workspace.py` — validovat importovaný JSON přes Pydantic před zápisem + varování před přepsáním settings.
5. `oauth2.py` — AnyHttpUrl validace pro token_url, Literal pro grant_type.
6. `settings.py` — API klíče uložit přes vault (Fernet) místo plaintext; z exportu maskovat.
7. `injection_scan.py` — SSRF validace URL, filtrovat reserved headers, limit params.

### Priorita 3 — Medium-term
8. Shared-secret token mezi Tauri shellem a sidecarem (SEC-010).
9. Security event log (SEC-012).
10. `docs_url=None` v produkčním buildu.
