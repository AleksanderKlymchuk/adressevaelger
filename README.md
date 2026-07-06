# Adressevælger test

A small static test page for the [Adressevælger](https://github.com/Klimadatastyrelsen/adressevaelger) UI component from Klimadatastyrelsen / SDFI. It lets you switch between full address search and house-number-only search, shows the object returned on selection, and performs a follow-up "extended lookup" call against the `adressevaelger.dk` API for the selected id.

Pure HTML/CSS/JS, no build step, no dependencies beyond the component's own `dist/` bundle.

## Files

- `index.html` — page markup: title, mode radio buttons, search container, result panels.
- `app.js` — initializes/reinitializes the component on mode change, handles selection, and calls the extended lookup endpoint.
- `styles.css` — page styling (mobile-friendly).
- `adressevaelger.css` / `adressevaelger.iife.js` — copied unmodified from the [Adressevælger `dist/` folder](https://github.com/Klimadatastyrelsen/adressevaelger/tree/main/dist).

## Token

The page uses the example/placeholder token `adressevaelger123` (the same value used in the component's own quick-start docs). Replace it in `app.js` with a real token if you have one — see the [Adressevælger implementation guide](https://github.com/Klimadatastyrelsen/adressevaelger/blob/main/GUIDE.md) for how to obtain one. Without a valid token, searches and lookups against `adressevaelger.dk` will fail (and the page will show the resulting error).

## Running locally

Because the page uses `fetch()`, serve it over HTTP rather than opening `index.html` directly via `file://`. Any static file server works, for example:

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
