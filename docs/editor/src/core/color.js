export function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

export function hexToRgb(value) {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(text)) {
    return {
      r: parseInt(text[0] + text[0], 16),
      g: parseInt(text[1] + text[1], 16),
      b: parseInt(text[2] + text[2], 16),
    };
  }
  if (/^[0-9a-f]{6}$/i.test(text)) {
    return {
      r: parseInt(text.slice(0, 2), 16),
      g: parseInt(text.slice(2, 4), 16),
      b: parseInt(text.slice(4, 6), 16),
    };
  }
  return null;
}

export function rgbToHex(rgb) {
  const channel = (value) => clamp(Math.round(Number(value) || 0), 0, 255).toString(16).padStart(2, "0");
  return `#${channel(rgb?.r)}${channel(rgb?.g)}${channel(rgb?.b)}`;
}

export function normalizeHex(value, fallback = "#000000") {
  const rgb = hexToRgb(value);
  return rgb ? rgbToHex(rgb) : fallback;
}

export function rgbaString(value, alpha = 1) {
  const rgb = hexToRgb(value) ?? { r: 0, g: 0, b: 0 };
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(alpha, 0, 1)})`;
}
