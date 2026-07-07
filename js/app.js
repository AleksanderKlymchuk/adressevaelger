import { CONFIG } from "./config.js";
import { searchAdressevaelger, getAdressevaelgerDetail } from "./api-adressevaelger.js";
import { searchDawa, getDawaDetail } from "./api-dawa.js";
import {
  normalizeAdressevaelgerSearchItem,
  normalizeAdressevaelgerDetail,
  normalizeDawaSearchItem,
  normalizeDawaDetail,
} from "./normalize.js";
import { diffNormalizedFields, diffTopLevelKeys } from "./diff.js";
import {
  renderJson,
  renderResultList,
  renderMetaRow,
  renderNormalizedFields,
  renderDiffTable,
  renderKeyDiffBadges,
  renderDebugEntry,
  setupCopyButton,
  escapeHtml,
} from "./render.js";
import { onChange as onDebugLogChange, getEntries as getDebugEntries } from "./debug-log.js";

const searchInput = document.getElementById("search-input");
const modeRadios = document.querySelectorAll('input[name="mode"]');

const columnEls = {
  adressevaelger: {
    meta: document.getElementById("compare-av-meta"),
    list: document.getElementById("compare-av-list"),
    fields: document.getElementById("compare-av-fields"),
    json: document.getElementById("compare-av-json"),
    copyJson: document.getElementById("compare-av-copy-json"),
    copyUrl: document.getElementById("compare-av-copy-url"),
  },
  dawa: {
    meta: document.getElementById("compare-dawa-meta"),
    list: document.getElementById("compare-dawa-list"),
    fields: document.getElementById("compare-dawa-fields"),
    json: document.getElementById("compare-dawa-json"),
    copyJson: document.getElementById("compare-dawa-copy-json"),
    copyUrl: document.getElementById("compare-dawa-copy-url"),
  },
};

const lookupEls = {
  section: document.getElementById("lookup-section"),
  idInput: document.getElementById("lookup-id-input"),
  button: document.getElementById("lookup-btn"),
  adressevaelger: {
    meta: document.getElementById("lookup-av-meta"),
    fields: document.getElementById("lookup-av-fields"),
    json: document.getElementById("lookup-av-json"),
    copyJson: document.getElementById("lookup-av-copy-json"),
    copyUrl: document.getElementById("lookup-av-copy-url"),
  },
  dawa: {
    meta: document.getElementById("lookup-dawa-meta"),
    fields: document.getElementById("lookup-dawa-fields"),
    json: document.getElementById("lookup-dawa-json"),
    copyJson: document.getElementById("lookup-dawa-copy-json"),
    copyUrl: document.getElementById("lookup-dawa-copy-url"),
  },
  diff: document.getElementById("diff-container"),
};

const debugLogList = document.getElementById("debug-log-list");

let currentKind = "adresse";
let debounceTimer = null;
let searchSeq = 0;
const abortControllers = { adressevaelger: null, dawa: null };
const latestSeq = { adressevaelger: 0, dawa: 0 };
const columnRows = { adressevaelger: [], dawa: [] };
const columnSearchUrl = { adressevaelger: null, dawa: null };
const columnDetail = { adressevaelger: null, dawa: null };

const lookupAbort = { adressevaelger: null, dawa: null };
const lookupState = { adressevaelger: null, dawa: null };

function isTerminalAdressevaelgerItem(item, kind) {
  if (!item) {
    return true;
  }
  if (item.type === "vejnavn" || item.type === "navngivenvejpostnummer") {
    return false;
  }
  if (item.type === "husnummer" && kind === "adresse") {
    return false;
  }
  return true;
}

function buildAvRows(items, kind) {
  return items.map((item) => ({
    source: "adressevaelger",
    kind,
    raw: item,
    id: item.id || null,
    terminal: isTerminalAdressevaelgerItem(item, kind),
    normalized: normalizeAdressevaelgerSearchItem(item),
  }));
}

function buildDawaRows(items, kind) {
  return items.map((item) => {
    const nestedKey = kind === "husnummer" ? "adgangsadresse" : "adresse";
    const nested = item && item[nestedKey];
    return {
      source: "dawa",
      kind,
      raw: item,
      id: (nested && nested.id) || null,
      terminal: true,
      normalized: normalizeDawaSearchItem(item, kind),
    };
  });
}

function setColumnLoading(source) {
  columnEls[source].meta.innerHTML =
    '<p class="status status-loading"><span class="spinner" aria-hidden="true"></span>Henter data…</p>';
  columnEls[source].list.innerHTML = "";
}

function showColumnError(source, error) {
  columnEls[source].meta.innerHTML = renderMetaRow({ error });
  columnEls[source].list.innerHTML = "";
}

function renderColumn(source, rows, ms) {
  columnEls[source].meta.innerHTML = renderMetaRow({ ms, count: rows.length });
  columnEls[source].list.innerHTML = renderResultList(rows);
}

function clearColumn(source) {
  columnEls[source].meta.innerHTML = "";
  columnEls[source].list.innerHTML = "";
  columnEls[source].fields.innerHTML = "";
  columnEls[source].json.innerHTML = "";
  columnRows[source] = [];
  columnDetail[source] = null;
}

async function runColumnSearch(source, seq, text) {
  if (abortControllers[source]) {
    abortControllers[source].abort();
  }
  const controller = new AbortController();
  abortControllers[source] = controller;
  latestSeq[source] = seq;

  setColumnLoading(source);
  const kind = currentKind;

  const result =
    source === "adressevaelger"
      ? await searchAdressevaelger(kind, text, { signal: controller.signal })
      : await searchDawa(kind, text, { signal: controller.signal });

  if (seq !== latestSeq[source] || result.aborted) {
    return;
  }

  columnSearchUrl[source] = result.url;

  if (result.error) {
    showColumnError(source, result.error);
    columnRows[source] = [];
    return;
  }

  const rows = source === "adressevaelger" ? buildAvRows(result.items, kind) : buildDawaRows(result.items, kind);
  columnRows[source] = rows;
  renderColumn(source, rows, result.ms);
}

function dispatchSearch(text) {
  const seq = ++searchSeq;
  runColumnSearch("adressevaelger", seq, text);
  runColumnSearch("dawa", seq, text);
}

function triggerSearchImmediately(text) {
  clearTimeout(debounceTimer);
  const trimmed = text.trim();
  if (trimmed.length < CONFIG.minQueryLength) {
    return;
  }
  dispatchSearch(trimmed);
}

searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  const text = searchInput.value.trim();

  if (text.length < CONFIG.minQueryLength) {
    clearColumn("adressevaelger");
    clearColumn("dawa");
    return;
  }

  debounceTimer = setTimeout(() => dispatchSearch(text), CONFIG.debounceMs);
});

modeRadios.forEach((radio) => {
  radio.addEventListener("change", (event) => {
    currentKind = event.target.value;
    triggerSearchImmediately(searchInput.value);
  });
});

function showColumnDetail(source, row) {
  columnDetail[source] = row;
  columnEls[source].fields.innerHTML = renderNormalizedFields(row.normalized);
  columnEls[source].json.innerHTML = renderJson(row.raw);
}

function handleRowClick(source, index) {
  const row = columnRows[source][index];
  if (!row) {
    return;
  }

  if (source === "adressevaelger" && !row.terminal) {
    searchInput.value = row.normalized.text || "";
    triggerSearchImmediately(searchInput.value);
    return;
  }

  showColumnDetail(source, row);

  if (row.id) {
    runLookupBoth(row.id, row.kind);
  }
}

Object.keys(columnEls).forEach((source) => {
  columnEls[source].list.addEventListener("click", (event) => {
    const rowEl = event.target.closest(".result-row");
    if (!rowEl) {
      return;
    }
    handleRowClick(source, Number(rowEl.dataset.index));
  });
});

function setLookupLoading(source) {
  lookupEls[source].meta.innerHTML =
    '<p class="status status-loading"><span class="spinner" aria-hidden="true"></span>Henter data…</p>';
  lookupEls[source].fields.innerHTML = "";
  lookupEls[source].json.innerHTML = "";
}

function showLookupError(source, error, url) {
  lookupEls[source].meta.innerHTML = renderMetaRow({ error });
  lookupEls[source].json.innerHTML = url ? `<p class="lookup-url">${escapeHtml(url)}</p>` : "";
}

function renderLookupResult(source, result, normalized) {
  lookupEls[source].meta.innerHTML = `<p class="meta-row"><span>${result.status}</span><span>${result.ms} ms</span></p>`;
  lookupEls[source].fields.innerHTML = renderNormalizedFields(normalized);
  lookupEls[source].json.innerHTML = renderJson(result.data);
}

async function runLookupSide(source, id, kind) {
  if (lookupAbort[source]) {
    lookupAbort[source].abort();
  }
  const controller = new AbortController();
  lookupAbort[source] = controller;

  setLookupLoading(source);

  const result =
    source === "adressevaelger"
      ? await getAdressevaelgerDetail(kind, id, { signal: controller.signal })
      : await getDawaDetail(kind, id, { signal: controller.signal });

  if (result.aborted) {
    return;
  }

  if (result.error) {
    lookupState[source] = null;
    showLookupError(source, result.error, result.url);
    renderDiff();
    return;
  }

  const normalized =
    source === "adressevaelger" ? normalizeAdressevaelgerDetail(result.data) : normalizeDawaDetail(result.data);

  lookupState[source] = { url: result.url, data: result.data, normalized };
  renderLookupResult(source, result, normalized);
  renderDiff();
}

function runLookupBoth(id, kind) {
  lookupEls.section.hidden = false;
  runLookupSide("adressevaelger", id, kind);
  runLookupSide("dawa", id, kind);
}

function renderDiff() {
  const a = lookupState.adressevaelger;
  const b = lookupState.dawa;

  if (!a || !b) {
    lookupEls.diff.innerHTML =
      '<p class="status status-info">Sammenligning kræver at begge opslag lykkes.</p>';
    return;
  }

  const fieldDiff = diffNormalizedFields(a.normalized, b.normalized);
  const keyDiff = diffTopLevelKeys(a.data, b.data);
  lookupEls.diff.innerHTML = renderDiffTable(fieldDiff) + renderKeyDiffBadges(keyDiff);
}

lookupEls.button.addEventListener("click", () => {
  const id = lookupEls.idInput.value.trim();
  if (!id) {
    return;
  }
  const kindInput = document.querySelector('input[name="lookup-kind"]:checked');
  const kind = kindInput ? kindInput.value : "adresse";
  runLookupBoth(id, kind);
});

setupCopyButton(columnEls.adressevaelger.copyJson, () => columnDetail.adressevaelger && JSON.stringify(columnDetail.adressevaelger.raw, null, 2));
setupCopyButton(columnEls.adressevaelger.copyUrl, () => columnSearchUrl.adressevaelger);
setupCopyButton(columnEls.dawa.copyJson, () => columnDetail.dawa && JSON.stringify(columnDetail.dawa.raw, null, 2));
setupCopyButton(columnEls.dawa.copyUrl, () => columnSearchUrl.dawa);

setupCopyButton(lookupEls.adressevaelger.copyJson, () => lookupState.adressevaelger && JSON.stringify(lookupState.adressevaelger.data, null, 2));
setupCopyButton(lookupEls.adressevaelger.copyUrl, () => lookupState.adressevaelger && lookupState.adressevaelger.url);
setupCopyButton(lookupEls.dawa.copyJson, () => lookupState.dawa && JSON.stringify(lookupState.dawa.data, null, 2));
setupCopyButton(lookupEls.dawa.copyUrl, () => lookupState.dawa && lookupState.dawa.url);

function renderDebugLog(entries) {
  debugLogList.innerHTML = entries.map(renderDebugEntry).join("");
}

onDebugLogChange(renderDebugLog);
renderDebugLog(getDebugEntries());
