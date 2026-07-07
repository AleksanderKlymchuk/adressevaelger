export function isAbortError(err) {
  return Boolean(err) && (err.name === "AbortError" || err.code === 20);
}

export async function timedFetch(url, { signal } = {}) {
  const start = performance.now();

  try {
    const response = await fetch(url, { signal });
    const ms = Math.round(performance.now() - start);

    let json = null;
    let error = null;

    try {
      json = await response.json();
    } catch (parseErr) {
      error = `Ugyldigt JSON-svar: ${parseErr.message}`;
    }

    if (!error && !response.ok) {
      error = `HTTP ${response.status}`;
    }

    return {
      ok: response.ok && !error,
      status: response.status,
      ms,
      url,
      json,
      error,
      aborted: false,
    };
  } catch (err) {
    const ms = Math.round(performance.now() - start);

    if (isAbortError(err)) {
      return { ok: false, status: 0, ms, url, json: null, error: "aborted", aborted: true };
    }

    return {
      ok: false,
      status: 0,
      ms,
      url,
      json: null,
      error: err.message || "Netværksfejl",
      aborted: false,
    };
  }
}
