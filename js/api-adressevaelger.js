import { CONFIG } from "./config.js";
import { timedFetch } from "./http.js";
import { record } from "./debug-log.js";

function endpointFor(kind) {
  return kind === "husnummer" ? "husnumre" : "adresser";
}

export async function searchAdressevaelger(kind, text, { signal } = {}) {
  const endpoint = endpointFor(kind);
  const url = `${CONFIG.adressevaelgerBase}/${endpoint}/soeg?tekst=${encodeURIComponent(
    text
  )}&token=${CONFIG.adressevaelgerToken}`;

  const result = await timedFetch(url, { signal });
  const apiError = result.json && result.json.status === "fejl" ? result.json.beskrivelse : null;
  const items = apiError ? [] : (result.json && result.json.fund) || [];
  const error = result.error || apiError;

  if (!result.aborted) {
    record({
      apiSource: "adressevaelger",
      callType: "search",
      url,
      status: result.status,
      ms: result.ms,
      ok: result.ok && !apiError,
      error,
      data: result.json,
    });
  }

  return { url, ok: result.ok && !apiError, status: result.status, ms: result.ms, items, error, aborted: result.aborted };
}

export async function getAdressevaelgerDetail(kind, id, { signal } = {}) {
  const endpoint = endpointFor(kind);
  const url = `${CONFIG.adressevaelgerBase}/${endpoint}/${encodeURIComponent(id)}?token=${CONFIG.adressevaelgerToken}`;

  const result = await timedFetch(url, { signal });
  const apiError = result.json && result.json.status === "fejl" ? result.json.beskrivelse : null;
  const error = result.error || apiError;

  if (!result.aborted) {
    record({
      apiSource: "adressevaelger",
      callType: "detail",
      url,
      status: result.status,
      ms: result.ms,
      ok: result.ok && !apiError,
      error,
      data: result.json,
    });
  }

  return { url, ok: result.ok && !apiError, status: result.status, ms: result.ms, data: apiError ? null : result.json, error, aborted: result.aborted };
}
