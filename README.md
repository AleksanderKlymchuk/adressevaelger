# Adressevælger vs. DAWA

A static, side-by-side comparison tool between two Danish address-lookup APIs:

- **Adressevælger** (`adressevaelger.dk`) — the newer API from Klimadatastyrelsen/SDFI.
- **DAWA** (`dawa.aws.dk`) — the older Danmarks Adressers Web API that Adressevælger is meant to replace.

Type an address and both APIs are queried at the same time; results, timing, and raw responses show up side by side. Click any result to run an ID lookup against both APIs and see a field-by-field diff. Pure HTML/CSS/JS, no build step, no framework, no backend.

## Files

- `index.html` — page markup: mode selector, search input, the two-column live-search comparison, the ID-lookup section, and the developer/debug log.
- `styles.css` — all styling (mobile-friendly).
- `js/config.js` — API base URLs, token, debounce timing, debug log size.
- `js/http.js` — a single instrumented `fetch()` wrapper (`timedFetch`) used by every API call, returning `{ok, status, ms, url, json, error}` and never throwing.
- `js/api-adressevaelger.js` / `js/api-dawa.js` — search and ID-lookup functions for each API.
- `js/normalize.js` — maps each API's raw response into a common `{text, id, road, houseNo, floor, door, postcode, city, confidence}` shape.
- `js/diff.js` — field-level diff and a shallow top-level-key-set comparison between the two APIs' lookup results.
- `js/render.js` — HTML rendering helpers, including a hand-rolled JSON syntax highlighter and the copy-to-clipboard button logic.
- `js/debug-log.js` — a capped (20-entry) log of every API call made, feeding the developer/debug section.
- `js/app.js` — wires everything together: debounced dual search with per-column abort/race handling, click-to-lookup routing, manual ID lookup, diff rendering.

`js/*.js` are loaded as native ES modules (`<script type="module">`) — no bundler, no build step, and GitHub Pages serves them as-is.

## Important caveats on field mapping

Neither API's exact response shape was verified against a live call while building this (the sandbox this was built in blocks both `adressevaelger.dk` and `dawa.aws.dk`), so:

- **Adressevælger search results** only ever expose `id`, `type`, and a flat `titel` display string — there are no decomposed road/house-number/floor/door/postcode/city fields at the search level. The road/house-number/etc. columns for Adressevælger search rows are **parsed from `titel` with a regex**, not authoritative — the raw `titel` is always shown too.
- **Adressevælger ID-lookup results** return a real but undocumented object (a Danish DAR-registry-style nested structure). `js/normalize.js` tries several plausible field paths defensively and falls back gracefully; it may need adjusting once checked against a real response.
- **DAWA's** shape follows its long-documented convention but also wasn't live-verified here — treated with the same "parsed, not authoritative" caveat rather than assumed correct.
- The token used (`adressevaelger123`) is the placeholder value from Adressevælger's own quick-start docs. Get a real token via the [implementation guide](https://github.com/Klimadatastyrelsen/adressevaelger/blob/main/GUIDE.md) if needed.
- DAWA (`dawa.aws.dk`) has a planned shutdown (currently dated ~17 August 2026) in favor of newer Danish address APIs — expect this tool to eventually need a new DAWA-side endpoint.

**Nothing is hidden**: every column always shows the full raw JSON response regardless of how well (or badly) the normalized fields parsed.

## Running locally

The page uses `fetch()` and ES modules, both of which require serving over HTTP rather than opening `index.html` directly via `file://`. Any static file server works:

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a browser.

## Deploying to GitHub Pages

This repo includes a GitHub Actions workflow at `.github/workflows/pages.yml` that publishes the site automatically — no build step, it just uploads the static files as-is.

To enable it:

1. In the repository on GitHub, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Push to the `main` branch (or run the workflow manually via **Actions → Deploy to GitHub Pages → Run workflow**).
4. Once the workflow finishes, the site URL is shown in the workflow run summary and under **Settings → Pages**.

Alternatively, without the workflow, you can deploy by setting **Settings → Pages → Source** to "Deploy from a branch" and pointing it at `main` / root — since the whole app is static files with no build step, this works just as well.
