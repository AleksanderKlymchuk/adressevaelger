const TOKEN = "adressevaelger123";

const searchContainer = document.getElementById("search-container");
const resultSection = document.getElementById("result-section");
const resultBadgeEl = document.getElementById("result-badge");
const selectedIdEl = document.getElementById("selected-id");
const copyIdBtn = document.getElementById("copy-id-btn");
const multiAddressNoteEl = document.getElementById("multi-address-note");
const selectedJsonEl = document.getElementById("selected-json");
const extendedSection = document.getElementById("extended-section");
const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error");
const extendedJsonEl = document.getElementById("extended-json");
const dawaToggle = document.getElementById("dawa-toggle");
const dawaSection = document.getElementById("dawa-section");
const dawaLoadingEl = document.getElementById("dawa-loading");
const dawaErrorEl = document.getElementById("dawa-error");
const dawaResultsEl = document.getElementById("dawa-results");

let currentMode = "adresse";
let currentInput = null;
let dawaEnabled = false;

function initComponent(mode) {
  searchContainer.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "autocomplete-container";

  const input = document.createElement("input");
  input.type = "search";
  input.id = "adressevaelger-input";
  input.placeholder =
    mode === "husnummer" ? "Søg efter husnummer…" : "Søg efter adresse…";

  wrapper.appendChild(input);
  searchContainer.appendChild(wrapper);
  currentInput = input;

  window.adressevaelger.adressevaelger(input, {
    token: TOKEN,
    adgangsadresserOnly: mode === "husnummer",
    select: handleSelect,
  });
}

function clearResults() {
  resultSection.hidden = true;
  extendedSection.hidden = true;
  resultBadgeEl.textContent = "";
  resultBadgeEl.className = "mode-badge";
  selectedIdEl.value = "";
  multiAddressNoteEl.hidden = true;
  multiAddressNoteEl.textContent = "";
  selectedJsonEl.innerHTML = "";
  extendedJsonEl.innerHTML = "";
  setLoading(false);
  clearError();
  clearDawaResults();
}

function clearDawaResults() {
  dawaSection.hidden = true;
  dawaResultsEl.innerHTML = "";
  dawaLoadingEl.hidden = true;
  dawaErrorEl.hidden = true;
  dawaErrorEl.textContent = "";
}

function setLoading(isLoading) {
  loadingEl.hidden = !isLoading;
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearError() {
  errorEl.hidden = true;
  errorEl.textContent = "";
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function syntaxHighlight(jsonString) {
  const escaped = escapeHtml(jsonString);
  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "json-number";
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? "json-key" : "json-string";
      } else if (/true|false/.test(match)) {
        cls = "json-boolean";
      } else if (/null/.test(match)) {
        cls = "json-null";
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

function renderJson(el, data) {
  el.innerHTML = syntaxHighlight(JSON.stringify(data, null, 2));
}

function handleSelect(selected) {
  resultSection.hidden = false;
  selectedIdEl.value = selected && selected.id ? selected.id : "";
  resultBadgeEl.textContent =
    currentMode === "husnummer" ? "🏠 House Number" : "🏢 Address";
  resultBadgeEl.className =
    currentMode === "husnummer"
      ? "mode-badge badge-husnummer"
      : "mode-badge badge-adresse";
  renderJson(selectedJsonEl, selected);

  if (selected && selected.id) {
    fetchExtended(currentMode, selected.id);
  }

  if (dawaEnabled && currentInput && currentInput.value) {
    fetchDawaComparison(currentMode, currentInput.value);
  }
}

async function fetchExtended(mode, id) {
  extendedSection.hidden = false;
  extendedJsonEl.innerHTML = "";
  multiAddressNoteEl.hidden = true;
  multiAddressNoteEl.textContent = "";
  clearError();
  setLoading(true);

  const url =
    mode === "husnummer"
      ? `https://adressevaelger.dk/husnumre/${id}?adresser=true&token=${TOKEN}`
      : `https://adressevaelger.dk/adresser/${id}?token=${TOKEN}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP fejl ${response.status}`);
    }
    const data = await response.json();
    renderJson(extendedJsonEl, data);

    if (mode === "husnummer" && Array.isArray(data.adresser) && data.adresser.length > 1) {
      multiAddressNoteEl.textContent = `Contains ${data.adresser.length} addresses`;
      multiAddressNoteEl.hidden = false;
    }
  } catch (err) {
    showError(`Kunne ikke hente udvidet opslag: ${err.message}`);
  } finally {
    setLoading(false);
  }
}

async function fetchDawaComparison(mode, queryText) {
  if (!queryText) {
    return;
  }

  const dawaType = mode === "husnummer" ? "adgangsadresse" : "adresse";
  const url = `https://dawa.aws.dk/autocomplete?type=${dawaType}&fuzzy&per_side=5&q=${encodeURIComponent(
    queryText
  )}`;

  dawaSection.hidden = false;
  dawaResultsEl.innerHTML = "";
  dawaErrorEl.hidden = true;
  dawaErrorEl.textContent = "";
  dawaLoadingEl.hidden = false;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP fejl ${response.status}`);
    }
    const data = await response.json();
    renderDawaResults(data);
  } catch (err) {
    dawaErrorEl.textContent = `Kunne ikke hente DAWA-sammenligning: ${err.message}`;
    dawaErrorEl.hidden = false;
  } finally {
    dawaLoadingEl.hidden = true;
  }
}

function renderDawaResults(items) {
  dawaResultsEl.innerHTML = "";

  if (!Array.isArray(items) || items.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Ingen resultater fra DAWA.";
    dawaResultsEl.appendChild(li);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item && item.tekst ? item.tekst : JSON.stringify(item);
    dawaResultsEl.appendChild(li);
  });
}

dawaToggle.addEventListener("change", (event) => {
  dawaEnabled = event.target.checked;

  if (!dawaEnabled) {
    clearDawaResults();
    return;
  }

  if (!resultSection.hidden && currentInput && currentInput.value) {
    fetchDawaComparison(currentMode, currentInput.value);
  }
});

copyIdBtn.addEventListener("click", async () => {
  if (!selectedIdEl.value || !navigator.clipboard) {
    return;
  }
  try {
    await navigator.clipboard.writeText(selectedIdEl.value);
    const originalText = copyIdBtn.textContent;
    copyIdBtn.textContent = "Kopieret!";
    copyIdBtn.classList.add("copied");
    setTimeout(() => {
      copyIdBtn.textContent = originalText;
      copyIdBtn.classList.remove("copied");
    }, 1500);
  } catch {
    // clipboard write failed silently; nothing to recover here
  }
});

document.querySelectorAll('input[name="mode"]').forEach((radio) => {
  radio.addEventListener("change", (event) => {
    currentMode = event.target.value;
    clearResults();
    initComponent(currentMode);
  });
});

initComponent(currentMode);
