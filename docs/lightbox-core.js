/**
 * Pure index helpers for the screenshot viewer.
 *
 * DOM-free on purpose: the viewer module stays small and these rules stay
 * testable in Node, in the same spirit as atlas-core.js and project-core.js.
 */

export function clampIndex(index, count) {
  const size = Math.trunc(Number(count));
  if (!Number.isFinite(size) || size <= 0) return 0;
  const value = Math.trunc(Number(index));
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(value, size - 1);
}

export function stepIndex(index, count, delta) {
  const size = Math.trunc(Number(count));
  if (!Number.isFinite(size) || size <= 0) return 0;
  const current = clampIndex(index, size);
  const step = Math.trunc(Number(delta));
  if (!Number.isFinite(step) || step === 0) return current;
  return ((current + step) % size + size) % size;
}

export function counterText(index, count) {
  const size = Math.trunc(Number(count));
  if (!Number.isFinite(size) || size <= 0) return "";
  return clampIndex(index, size) + 1 + " / " + size;
}
