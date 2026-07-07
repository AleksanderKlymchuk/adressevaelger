export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function syntaxHighlight(jsonString) {
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

export function renderJson(data) {
  if (data === null || data === undefined) {
    return "";
  }
  return syntaxHighlight(JSON.stringify(data, null, 2));
}

export function formatMs(ms) {
  return typeof ms === "number" ? `${ms} ms` : "–";
}

const FIELD_LABELS = [
  ["road", "Vej"],
  ["houseNo", "Husnr."],
  ["floor", "Etage"],
  ["door", "Dør"],
  ["postcode", "Postnr."],
  ["city", "By"],
];

export function renderNormalizedFields(normalized) {
  if (!normalized) {
    return "";
  }

  const rows = FIELD_LABELS.map(
    ([key, label]) =>
      `<div class="field-row"><span class="field-label">${label}</span><span class="field-value">${
        normalized[key] ? escapeHtml(normalized[key]) : "–"
      }</span></div>`
  ).join("");

  const caveat =
    normalized.confidence === "unknown"
      ? '<p class="field-caveat">Kunne ikke udlede felter for denne post.</p>'
      : '<p class="field-caveat">Felter er afledt/tolket, ikke autoritative.</p>';

  return `<div class="field-grid">${rows}</div>${caveat}`;
}

export function renderResultList(rows) {
  if (!rows || rows.length === 0) {
    return '<li class="result-empty">Ingen resultater.</li>';
  }

  return rows
    .map(
      (row, index) => `
    <li class="result-row" data-index="${index}" tabindex="0" role="button">
      <span class="result-text">${escapeHtml(row.normalized.text || "(uden titel)")}</span>
      <span class="result-meta-chip">${row.terminal ? "" : "delvist match"}</span>
    </li>`
    )
    .join("");
}

export function renderMetaRow({ ms, count, error }) {
  if (error) {
    return `<p class="status status-error">${escapeHtml(error)}</p>`;
  }
  return `<p class="meta-row"><span>${formatMs(ms)}</span><span>${count} resultat${
    count === 1 ? "" : "er"
  }</span></p>`;
}

export function renderDiffTable(diffRows) {
  const rows = diffRows
    .map(
      (row) => `
    <tr class="${row.differs ? "field-diff" : ""}">
      <th>${escapeHtml(row.label)}${row.differs ? ' <span class="diff-flag">forskel</span>' : ""}</th>
      <td>${row.a ? escapeHtml(row.a) : "–"}</td>
      <td>${row.b ? escapeHtml(row.b) : "–"}</td>
    </tr>`
    )
    .join("");

  return `
    <table class="diff-table">
      <thead><tr><th></th><th>Adressevælger</th><th>DAWA</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

export function renderKeyDiffBadges({ onlyInA, onlyInB }) {
  const badgeList = (keys) =>
    keys.length === 0
      ? '<span class="keydiff-empty">ingen</span>'
      : keys.map((key) => `<span class="keydiff-badge">${escapeHtml(key)}</span>`).join(" ");

  return `
    <p class="keydiff-caption">Overfladisk sammenligning af nøgler på øverste niveau — ikke en rekursiv diff.</p>
    <div class="keydiff-row"><strong>Kun i Adressevælger:</strong> ${badgeList(onlyInA)}</div>
    <div class="keydiff-row"><strong>Kun i DAWA:</strong> ${badgeList(onlyInB)}</div>`;
}

export function renderDebugEntry(entry) {
  const statusClass = entry.ok ? "debug-ok" : "debug-fail";

  return `
    <li class="debug-entry">
      <details>
        <summary>
          <span class="debug-time">${new Date(entry.timestamp).toLocaleTimeString()}</span>
          <span class="debug-source">${escapeHtml(entry.apiSource)}</span>
          <span class="debug-call">${escapeHtml(entry.callType)}</span>
          <span class="debug-status ${statusClass}">${entry.status || "–"}</span>
          <span class="debug-ms">${formatMs(entry.ms)}</span>
        </summary>
        <p class="debug-url">${escapeHtml(entry.url)}</p>
        ${entry.error ? `<p class="status status-error">${escapeHtml(entry.error)}</p>` : ""}
        <pre class="json-block">${renderJson(entry.data)}</pre>
      </details>
    </li>`;
}

export function setupCopyButton(buttonEl, getText) {
  if (!buttonEl) {
    return;
  }

  buttonEl.addEventListener("click", async () => {
    const text = getText();
    if (!text || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      const original = buttonEl.textContent;
      buttonEl.textContent = "Kopieret!";
      buttonEl.classList.add("copied");
      setTimeout(() => {
        buttonEl.textContent = original;
        buttonEl.classList.remove("copied");
      }, 1500);
    } catch {
      // clipboard write failed silently; nothing to recover here
    }
  });
}
