import { CONFIG } from "./config.js";

let entries = [];
let nextId = 1;
const listeners = new Set();

export function record({ apiSource, callType, url, status, ms, ok, error, data }) {
  const entry = {
    id: nextId++,
    timestamp: new Date().toISOString(),
    apiSource,
    callType,
    url,
    status,
    ms,
    ok,
    error,
    data,
  };

  entries = [entry, ...entries].slice(0, CONFIG.debugLogMax);
  listeners.forEach((listener) => listener(entries));

  return entry;
}

export function getEntries() {
  return entries;
}

export function onChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
