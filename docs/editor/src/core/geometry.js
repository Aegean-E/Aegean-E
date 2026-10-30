import { clamp } from "./color.js";

export const MIN_SCALE = 0.02;
export const MAX_SCALE = 32;

export function clampScale(value) {
  return clamp(value, MIN_SCALE, MAX_SCALE);
}

export function normalizeRect(start, end) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return {
    x,
    y,
    w: Math.abs(end.x - start.x),
    h: Math.abs(end.y - start.y),
  };
}

export function clampRect(rect, width, height) {
  const left = clamp(rect.x, 0, width);
  const top = clamp(rect.y, 0, height);
  const right = clamp(rect.x + rect.w, 0, width);
  const bottom = clamp(rect.y + rect.h, 0, height);
  return {
    x: Math.min(left, right),
    y: Math.min(top, bottom),
    w: Math.abs(right - left),
    h: Math.abs(bottom - top),
  };
}

export function isUsableRect(rect, minimum = 1) {
  return Boolean(rect) && rect.w >= minimum && rect.h >= minimum;
}

export function pointInRect(point, rect) {
  return point.x >= rect.x && point.y >= rect.y && point.x <= rect.x + rect.w && point.y <= rect.y + rect.h;
}

export function constrainSquare(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const size = Math.max(Math.abs(dx), Math.abs(dy));
  return {
    x: start.x + Math.sign(dx || 1) * size,
    y: start.y + Math.sign(dy || 1) * size,
  };
}

export function constrainAngle(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  return {
    x: start.x + Math.cos(angle) * length,
    y: start.y + Math.sin(angle) * length,
  };
}

export function fitScale(width, height, viewportWidth, viewportHeight, padding = 48) {
  const availableWidth = Math.max(1, viewportWidth - padding * 2);
  const availableHeight = Math.max(1, viewportHeight - padding * 2);
  return clampScale(Math.min(availableWidth / Math.max(1, width), availableHeight / Math.max(1, height)));
}

export function screenToDoc(point, view) {
  return {
    x: (point.x - view.offsetX) / view.scale,
    y: (point.y - view.offsetY) / view.scale,
  };
}

export function docToScreen(point, view) {
  return {
    x: point.x * view.scale + view.offsetX,
    y: point.y * view.scale + view.offsetY,
  };
}

export function zoomAt(view, screenPoint, nextScale) {
  const scale = clampScale(nextScale);
  const anchor = screenToDoc(screenPoint, view);
  return {
    scale,
    offsetX: screenPoint.x - anchor.x * scale,
    offsetY: screenPoint.y - anchor.y * scale,
  };
}

export function fitView(width, height, viewportWidth, viewportHeight, padding = 48) {
  const scale = fitScale(width, height, viewportWidth, viewportHeight, padding);
  return {
    scale,
    offsetX: (viewportWidth - width * scale) / 2,
    offsetY: (viewportHeight - height * scale) / 2,
  };
}

export function distance(first, second) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function roundRect(rect) {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    w: Math.max(1, Math.round(rect.w)),
    h: Math.max(1, Math.round(rect.h)),
  };
}
