const TOKEN = "adressevaelger123";

const searchContainer = document.getElementById("search-container");
const resultSection = document.getElementById("result-section");
const selectedIdEl = document.getElementById("selected-id");
const selectedJsonEl = document.getElementById("selected-json");
const extendedSection = document.getElementById("extended-section");
const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error");
const extendedJsonEl = document.getElementById("extended-json");

let currentMode = "adresse";

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

  window.adressevaelger.adressevaelger(input, {
    token: TOKEN,
    adgangsadresserOnly: mode === "husnummer",
    select: handleSelect,
  });
}

function clearResults() {
  resultSection.hidden = true;
  extendedSection.hidden = true;
  selectedIdEl.textContent = "";
  selectedJsonEl.textContent = "";
  extendedJsonEl.textContent = "";
  setLoading(false);
  clearError();
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

function handleSelect(selected) {
  resultSection.hidden = false;
  selectedIdEl.textContent = selected && selected.id ? selected.id : "";
  selectedJsonEl.textContent = JSON.stringify(selected, null, 2);

  if (selected && selected.id) {
    fetchExtended(currentMode, selected.id);
  }
}

async function fetchExtended(mode, id) {
  extendedSection.hidden = false;
  extendedJsonEl.textContent = "";
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
    extendedJsonEl.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    showError(`Kunne ikke hente udvidet opslag: ${err.message}`);
  } finally {
    setLoading(false);
  }
}

document.querySelectorAll('input[name="mode"]').forEach((radio) => {
  radio.addEventListener("change", (event) => {
    currentMode = event.target.value;
    clearResults();
    initComponent(currentMode);
  });
});

initComponent(currentMode);
