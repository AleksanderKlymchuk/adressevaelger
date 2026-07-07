import { CONFIG } from "./config.js";
import { timedFetch } from "./http.js";
import { record } from "./debug-log.js";

function typeFor(kind) {
  return kind === "husnummer" ? "adgangsadresse" : "adresse";
}

function detailEndpointFor(kind) {
  return kind === "husnummer" ? "adgangsadresser" : "adresser";
}

export async function searchDawa(kind, text, { signal } = {}) {
  const type = typeFor(kind);
  const url = `${CONFIG.dawaBase}/autocomplete?type=${type}&fuzzy&per_side=5&q=${encodeURIComponent(
    text
  )}`;

  const result = await timedFetch(url, { signal });
  const items = Array.isArray(result.json) ? result.json : [];

  if (!result.aborted) {
    record({
      apiSource: "dawa",
      callType: "search",
      url,
      status: result.status,
      ms: result.ms,
      ok: result.ok,
      error: result.error,
      data: result.json,
    });
  }

  return { url, ok: result.ok, status: result.status, ms: result.ms, items, error: result.error, aborted: result.aborted };
}

export async function getDawaDetail(kind, id, { signal } = {}) {
  const endpoint = detailEndpointFor(kind);
  const url = `${CONFIG.dawaBase}/${endpoint}/${encodeURIComponent(id)}`;

  const result = await timedFetch(url, { signal });

  if (!result.aborted) {
    record({
      apiSource: "dawa",
      callType: "detail",
      url,
      status: result.status,
      ms: result.ms,
      ok: result.ok,
      error: result.error,
      data: result.json,
    });
  }

  return { url, ok: result.ok, status: result.status, ms: result.ms, data: result.json, error: result.error, aborted: result.aborted };
}
