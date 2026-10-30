import { boundedDimensions } from "./project.js";

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

export function normalizeExportScale(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 1;
  return Math.min(4, Math.max(0.1, number));
}

export function exportDimensions(width, height, scale) {
  const safeWidth = Math.max(1, Math.round(Number(width) || 1));
  const safeHeight = Math.max(1, Math.round(Number(height) || 1));
  const factor = normalizeExportScale(scale);
  return boundedDimensions(
    Math.max(1, Math.round(safeWidth * factor)),
    Math.max(1, Math.round(safeHeight * factor)),
  );
}
