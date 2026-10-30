export const EXPORT_FORMATS = Object.freeze({
  png: Object.freeze({ mime: "image/png", extension: "png", quality: false, label: "PNG" }),
  jpeg: Object.freeze({ mime: "image/jpeg", extension: "jpg", quality: true, label: "JPEG" }),
  webp: Object.freeze({ mime: "image/webp", extension: "webp", quality: true, label: "WebP" }),
});

export function exportFormat(value) {
  const key = String(value ?? "png").toLowerCase();
  return EXPORT_FORMATS[key] ?? EXPORT_FORMATS.png;
}

export function normalizeQuality(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0.92;
  return Math.min(1, Math.max(0.05, number));
}

export function safeFileName(value, fallback = "palette") {
  const text = String(value ?? "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^\.+/, "")
    .slice(0, 80);
  return text || fallback;
}

export function downloadName(name, format) {
  const selected = exportFormat(format);
  return `${safeFileName(name)}.${selected.extension}`;
}

export function formatBytes(bytes) {
  const number = Number(bytes);
  if (!Number.isFinite(number) || number <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(number) / Math.log(1024)));
  const value = number / 1024 ** exponent;
  const digits = value >= 10 || exponent === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[exponent]}`;
}
