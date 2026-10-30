export function findContentBounds(pixels, alphaThreshold = 8) {
  const width = Math.max(0, Math.floor(Number(pixels?.width) || 0));
  const height = Math.max(0, Math.floor(Number(pixels?.height) || 0));
  const data = pixels?.data;
  if (!data || width < 1 || height < 1) return null;
  const threshold = Math.max(1, Math.min(255, Math.round(Number(alphaThreshold) || 8)));
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] < threshold) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
