import { normalizeState } from "./state.js";

export const STORAGE_KEY = "tessera.studio.v1";
export const STORAGE_VERSION = 1;

export function loadState(storage) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== STORAGE_VERSION || !data.state) return null;
    return normalizeState(data.state);
  } catch {
    return null;
  }
}

export function saveState(storage, state) {
  if (!storage) return false;
  try {
    const normalized = normalizeState(state);
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, saved_at: new Date().toISOString(), state: normalized }),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearState(storage) {
  if (!storage) return false;
  try {
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
