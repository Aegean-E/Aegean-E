import { clamp, rgbaString } from "../core/color.js";
import { normalizeRect } from "../core/geometry.js";
import { cloneCanvas, context2d, createCanvas } from "./canvas.js";

export const FONT_STACKS = Object.freeze({
  system: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "Cascadia Mono", Consolas, monospace',
});

export function brushStamp({ size = 32, hardness = 0.7, color = "#22d3ee", opacity = 1, erase = false } = {}) {
  const diameter = Math.max(1, Math.round(size));
  const radius = diameter / 2;
  const canvas = createCanvas(diameter, diameter);
  const context = context2d(canvas);
  const center = canvas.width / 2;
  const alpha = clamp(opacity, 0, 1);
  const solid = clamp(hardness, 0, 1);
  context.save();
  if (solid >= 0.999) {
    context.fillStyle = erase ? `rgba(0, 0, 0, ${alpha})` : rgbaString(color, alpha);
    context.beginPath();
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.fill();
  } else {
    const gradient = context.createRadialGradient(center, center, 0, center, center, radius);
    const edge = Math.max(0.001, Math.min(0.99, solid));
    const inner = erase ? `rgba(0, 0, 0, ${alpha})` : rgbaString(color, alpha);
    const outer = erase ? "rgba(0, 0, 0, 0)" : rgbaString(color, 0);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(edge, inner);
    gradient.addColorStop(1, outer);
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
  return { canvas, radius, spacing: Math.max(0.8, diameter * 0.16) };
}

export function strokeBrush(canvas, from, to, stamp, erase = false) {
  const context = context2d(canvas);
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(distance / stamp.spacing));
  context.save();
  context.globalCompositeOperation = erase ? "destination-out" : "source-over";
  context.imageSmoothingEnabled = true;
  for (let step = 0; step <= steps; step += 1) {
    const ratio = steps === 0 ? 0 : step / steps;
    const x = from.x + (to.x - from.x) * ratio;
    const y = from.y + (to.y - from.y) * ratio;
    context.drawImage(stamp.canvas, x - stamp.canvas.width / 2, y - stamp.canvas.height / 2);
  }
  context.restore();
}

export function drawShape(context, shape) {
  const {
    tool,
    start,
    end,
    color = "#22d3ee",
    outlineColor = "#e9eefb",
    fill = true,
    outline = true,
    width = 4,
    opacity = 1,
  } = shape;
  const thickness = Math.max(0, Number(width) || 0);
  context.save();
  context.globalAlpha = clamp(opacity, 0, 1);
  context.lineJoin = "round";
  context.lineCap = "round";
  context.beginPath();
  if (tool === "line") {
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
  } else {
    const rect = normalizeRect(start, end);
    if (tool === "ellipse") {
      context.ellipse(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w / 2, rect.h / 2, 0, 0, Math.PI * 2);
    } else {
      context.rect(rect.x, rect.y, rect.w, rect.h);
    }
  }
  if (fill && tool !== "line") {
    context.fillStyle = rgbaString(color, 1);
    context.fill();
  }
  if (outline && thickness > 0) {
    context.lineWidth = thickness;
    context.strokeStyle = rgbaString(outlineColor, 1);
    context.stroke();
  }
  context.restore();
}

export function drawTextOn(context, { x, y, text, color = "#e9eefb", size = 48, weight = 600, family = "system" }) {
  const value = String(text ?? "");
  if (!value.trim()) return;
  const fontSize = Math.max(1, Math.round(size));
  context.save();
  context.fillStyle = color;
  context.font = `${weight} ${fontSize}px ${FONT_STACKS[family] ?? FONT_STACKS.system}`;
  context.textBaseline = "top";
  context.textAlign = "left";
  const lines = value.split(/\r?\n/);
  const lineHeight = fontSize * 1.22;
  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
  context.restore();
}

export function drawText(canvas, options) {
  drawTextOn(context2d(canvas), options);
}

export function cropCanvas(source, rect) {
  const output = createCanvas(rect.w, rect.h);
  context2d(output).drawImage(source, -rect.x, -rect.y);
  return output;
}

export function scaleCanvas(source, width, height) {
  const output = createCanvas(width, height);
  const context = context2d(output);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, output.width, output.height);
  return output;
}

export function flipCanvas(source, axis = "horizontal") {
  const output = createCanvas(source.width, source.height);
  const context = context2d(output);
  context.save();
  if (axis === "vertical") {
    context.translate(0, source.height);
    context.scale(1, -1);
  } else {
    context.translate(source.width, 0);
    context.scale(-1, 1);
  }
  context.drawImage(source, 0, 0);
  context.restore();
  return output;
}

export function rotateCanvas(source) {
  const output = createCanvas(source.height, source.width);
  const context = context2d(output);
  context.save();
  context.translate(output.width, 0);
  context.rotate(Math.PI / 2);
  context.drawImage(source, 0, 0);
  context.restore();
  return output;
}

export function shiftedCanvas(source, dx, dy) {
  const output = createCanvas(source.width, source.height);
  context2d(output).drawImage(source, Math.round(dx), Math.round(dy));
  return output;
}

export { cloneCanvas };
