import { clamp, normalizeHex } from "./color.js";

export const GRADIENT_TYPES = Object.freeze({
  linear: "Linear",
  radial: "Radial",
});

export function normalizeGradientType(value) {
  return value === "radial" ? "radial" : "linear";
}

export function normalizeGradientOptions(input = {}) {
  return {
    type: normalizeGradientType(input.type),
    from: normalizeHex(input.from, "#22d3ee"),
    to: normalizeHex(input.to, "#a78bfa"),
    fade: input.fade !== false,
    opacity: clamp(input.opacity ?? 1, 0, 1),
  };
}

export function gradientStops(input = {}) {
  const values = normalizeGradientOptions(input);
  return [
    { offset: 0, color: values.from, alpha: 1 },
    { offset: 1, color: values.to, alpha: values.fade ? 0 : 1 },
  ];
}

export function gradientRadius(start, end) {
  return Math.max(1, Math.hypot(end.x - start.x, end.y - start.y));
}

export function isUsableGradient(start, end, minimum = 1) {
  return Math.hypot(end.x - start.x, end.y - start.y) >= minimum;
}
