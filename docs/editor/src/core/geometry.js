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

export function constrainAspect(start, end, ratio) {
  const value = Number(ratio);
  if (!Number.isFinite(value) || value <= 0) return end;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const width = Math.abs(dx);
  const height = Math.abs(dy);
  if (width === 0 && height === 0) return end;
  let nextWidth = Math.max(width, 1);
  let nextHeight = Math.max(height, 1);
  if (nextWidth / nextHeight > value) nextHeight = nextWidth / value;
  else nextWidth = nextHeight * value;
  return {
    x: start.x + Math.sign(dx || 1) * nextWidth,
    y: start.y + Math.sign(dy || 1) * nextHeight,
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

export function selectionFromDrag(kind, start, end, width, height, constrain = false) {
  const finish = constrain ? constrainSquare(start, end) : end;
  const clamped = clampRect(normalizeRect(start, finish), width, height);
  if (clamped.w < 1 || clamped.h < 1) return null;
  return { kind: kind === "ellipse" ? "ellipse" : "rect", rect: roundRect(clamped) };
}

export function containRect(sourceWidth, sourceHeight, boxWidth, boxHeight, allowUpscale = false) {
  const sourceW = Math.max(1, Number(sourceWidth) || 1);
  const sourceH = Math.max(1, Number(sourceHeight) || 1);
  const boxW = Math.max(1, Number(boxWidth) || 1);
  const boxH = Math.max(1, Number(boxHeight) || 1);
  const scale = Math.min(boxW / sourceW, boxH / sourceH, allowUpscale ? Number.POSITIVE_INFINITY : 1);
  const width = Math.max(1, Math.round(sourceW * scale));
  const height = Math.max(1, Math.round(sourceH * scale));
  return {
    x: Math.round((boxW - width) / 2),
    y: Math.round((boxH - height) / 2),
    w: width,
    h: height,
  };
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

export function anchorOffset(oldWidth, oldHeight, newWidth, newHeight, anchor = "center") {
  const dx = Math.round((Number(newWidth) || 1) - (Number(oldWidth) || 1));
  const dy = Math.round((Number(newHeight) || 1) - (Number(oldHeight) || 1));
  const horizontal = anchor.includes("left") ? 0 : anchor.includes("right") ? dx : dx / 2;
  const vertical = anchor.includes("top") ? 0 : anchor.includes("bottom") ? dy : dy / 2;
  return { x: Math.round(horizontal), y: Math.round(vertical) };
}
