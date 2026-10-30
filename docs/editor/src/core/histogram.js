import { clamp } from "./color.js";

export function buildHistogram(pixels, bins = 256) {
  const size = Math.max(2, Math.min(4096, Math.round(Number(bins) || 256)));
  const red = new Uint32Array(size);
  const green = new Uint32Array(size);
  const blue = new Uint32Array(size);
  const luma = new Uint32Array(size);
  const data = pixels?.data ?? new Uint8ClampedArray(0);
  const last = size - 1;
  let total = 0;
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 8) continue;
    total += 1;
    red[Math.min(last, Math.round((data[index] / 255) * last))] += 1;
    green[Math.min(last, Math.round((data[index + 1] / 255) * last))] += 1;
    blue[Math.min(last, Math.round((data[index + 2] / 255) * last))] += 1;
    const value = Math.round(0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2]);
    luma[Math.min(last, Math.round((value / 255) * last))] += 1;
  }
  return { bins: size, total, red, green, blue, luma };
}

export function percentileRange(histogram, lowClip = 0.005, highClip = 0.005) {
  if (!histogram || !histogram.total || !histogram.luma?.length) {
    return { black: 0, white: 255 };
  }
  const bins = histogram.luma.length;
  const total = histogram.total;
  const lowTarget = total * clamp(lowClip, 0, 0.49);
  const highTarget = total - total * clamp(highClip, 0, 0.49);
  let lowIndex = 0;
  let highIndex = bins - 1;
  let cumulative = 0;
  for (let index = 0; index < bins; index += 1) {
    cumulative += histogram.luma[index];
    if (cumulative >= lowTarget) {
      lowIndex = index;
      break;
    }
  }
  cumulative = 0;
  for (let index = 0; index < bins; index += 1) {
    cumulative += histogram.luma[index];
    if (cumulative >= highTarget) {
      highIndex = index;
      break;
    }
  }
  const black = Math.round((lowIndex / (bins - 1)) * 255);
  const white = Math.round((highIndex / (bins - 1)) * 255);
  return { black: Math.min(black, 254), white: Math.max(white, black + 1) };
}

export function autoLevelsRange(pixels, lowClip = 0.005, highClip = 0.005) {
  return percentileRange(buildHistogram(pixels, 256), lowClip, highClip);
}
