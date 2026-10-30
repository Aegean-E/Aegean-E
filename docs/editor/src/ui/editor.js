import { clamp, normalizeHex, rgbToHex } from "../core/color.js";
import {
  activeLayer,
  addLayer,
  createDocument,
  createLayer,
  duplicateLayerRecord,
  indexOfLayer,
  layerById,
  moveLayer,
  nextLayerName,
  removeLayer,
  resizeDocument,
  setActiveLayer,
  updateLayer,
} from "../core/document.js";
import {
  downloadName,
  exportFormat,
  formatBytes,
  normalizeQuality,
  safeFileName,
} from "../core/export.js";
import {
  DEFAULT_ADJUSTMENTS,
  applyPixelate,
  applySharpen,
  applyVignette,
  buildCssFilter,
} from "../core/filters.js";
import {
  clampRect,
  constrainAngle,
  constrainSquare,
  docToScreen,
  fitView,
  isUsableRect,
  normalizeRect,
  roundRect,
  screenToDoc,
  zoomAt,
} from "../core/geometry.js";
import { History, createCommand } from "../core/history.js";
import {
  boundedDimensions,
  cleanDimension,
  cleanDocumentName,
  parseProject,
  serializeProject,
} from "../core/project.js";
import {
  canvasToBlob,
  cloneCanvas,
  compositeDocument,
  context2d,
  createCanvas,
  downloadBlob,
  fillCanvas,
  getPixels,
  imageToCanvas,
  layerThumbnail,
  loadImage,
  putPixels,
  readFileText,
  samplePixel,
} from "./canvas.js";
import {
  brushStamp,
  cropCanvas,
  drawShape,
  drawText,
  drawTextOn,
  flipCanvas,
  rotateCanvas,
  scaleCanvas,
  shiftedCanvas,
  strokeBrush,
} from "./paint.js";

const TOOL_META = Object.freeze({
  move: { label: "Move", cursor: "move", hint: "Drag the active layer. Arrow keys nudge it." },
  brush: { label: "Brush", cursor: "crosshair", hint: "Paint on the active layer." },
  eraser: { label: "Eraser", cursor: "crosshair", hint: "Erase pixels from the active layer." },
  crop: { label: "Crop", cursor: "crosshair", hint: "Drag a region, then confirm." },
  text: { label: "Text", cursor: "text", hint: "Click the canvas, type a line, then press Add." },
  rect: { label: "Rectangle", cursor: "crosshair", hint: "Drag to draw a rectangle. Shift keeps it square." },
  ellipse: { label: "Ellipse", cursor: "crosshair", hint: "Drag to draw an ellipse. Shift keeps it circular." },
  line: { label: "Line", cursor: "crosshair", hint: "Drag to draw a line. Shift snaps to 45°." },
  eyedropper: { label: "Eyedropper", cursor: "eyedropper", hint: "Click a pixel to make it the active colour." },
  hand: { label: "Hand", cursor: "grab", hint: "Drag to pan. Space also pans from any tool." },
  zoom: { label: "Zoom", cursor: "zoom-in", hint: "Click to zoom in. Alt-click to zoom out." },
});

const ADJUSTMENTS = [
  "brightness",
  "contrast",
  "saturation",
  "hue",
  "grayscale",
  "sepia",
  "invert",
  "blur",
];

const IDS = [
  "doc-name", "doc-size", "btn-new", "btn-open", "btn-open-project", "btn-save", "btn-export",
  "btn-undo", "btn-redo", "btn-help", "file-image", "file-project", "stage-wrap", "doc-frame",
  "stage", "overlay", "text-editor", "text-input", "text-commit", "text-cancel", "drop-hint",
  "stage-note", "btn-zoom-out", "btn-fit", "btn-zoom-in", "color-row", "color-input", "color-hex",
  "tool-hint", "options-brush", "options-eraser", "options-shape", "options-text", "options-crop",
  "options-move", "brush-size", "brush-size-value", "brush-hardness", "brush-hardness-value",
  "brush-opacity", "brush-opacity-value", "eraser-size", "eraser-size-value", "eraser-hardness",
  "eraser-hardness-value", "eraser-opacity", "eraser-opacity-value", "shape-fill", "shape-outline",
  "shape-outline-color", "shape-outline-hex", "shape-width", "shape-width-value", "text-font",
  "text-size", "text-size-value", "text-weight", "crop-apply", "crop-cancel", "btn-layer-add",
  "btn-layer-duplicate", "btn-layer-up", "btn-layer-down", "btn-layer-delete", "layer-opacity",
  "layer-opacity-value", "layer-list", "btn-resize", "btn-flip-h", "btn-flip-v", "btn-rotate",
  "adjust-reset", "adj-brightness", "adj-brightness-value", "adj-contrast", "adj-contrast-value",
  "adj-saturation", "adj-saturation-value", "adj-hue", "adj-hue-value", "adj-grayscale",
  "adj-grayscale-value", "adj-sepia", "adj-sepia-value", "adj-invert", "adj-invert-value",
  "adj-blur", "adj-blur-value", "filter-blur-radius", "filter-blur-value", "btn-filter-blur",
  "filter-pixel-size", "filter-pixel-value", "btn-filter-pixelate", "btn-filter-sharpen",
  "btn-filter-vignette", "status-tool", "status-message", "status-cursor", "status-zoom",
  "btn-actual", "new-dialog", "new-form", "new-name", "new-width", "new-height", "new-color",
  "new-cancel", "new-create", "export-dialog", "export-form", "export-name", "export-format",
  "export-quality-row", "export-quality", "export-quality-value", "export-size", "export-cancel",
  "export-confirm", "resize-dialog", "resize-form", "resize-width", "resize-height",
  "resize-lock", "resize-cancel", "resize-confirm", "help-dialog", "help-close",
];

function cacheIds(root, ids) {
  const cache = {};
  for (const id of ids) {
    const key = id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    cache[key] = root.getElementById(id);
  }
  return cache;
}

function historyLimitFor(doc) {
  const pixels = doc.width * doc.height;
  if (pixels <= 500_000) return 40;
  if (pixels <= 2_000_000) return 24;
  if (pixels <= 6_000_000) return 12;
  if (pixels <= 12_000_000) return 6;
  return 3;
}

function fileBaseName(name) {
  return String(name ?? "").replace(/\.[^.]+$/, "").trim() || "Image";
}

function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function drawWaveLayer(width, height) {
  const canvas = createCanvas(width, height);
  const context = context2d(canvas);
  const colors = ["#67e8f9", "#22d3ee", "#a78bfa"];
  for (let line = 0; line < 3; line += 1) {
    context.beginPath();
    for (let x = 0; x <= width; x += 4) {
      const y = height * 0.68 + Math.sin(x / 118 + line * 0.85) * 34 + line * 30;
      if (x === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.globalAlpha = 0.9 - line * 0.22;
    context.strokeStyle = colors[line];
    context.lineWidth = 3.2 - line * 0.7;
    context.lineCap = "round";
    context.stroke();
  }
  return canvas;
}

function welcomeDocument() {
  const width = 1280;
  const height = 800;
  const background = createCanvas(width, height);
  const context = context2d(background);
  const base = context.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, "#081321");
  base.addColorStop(0.55, "#0a0f1d");
  base.addColorStop(1, "#04060c");
  context.fillStyle = base;
  context.fillRect(0, 0, width, height);

  const cyanGlow = context.createRadialGradient(width * 0.76, height * 0.18, 0, width * 0.76, height * 0.18, 560);
  cyanGlow.addColorStop(0, "rgba(34, 211, 238, 0.30)");
  cyanGlow.addColorStop(1, "rgba(34, 211, 238, 0)");
  context.fillStyle = cyanGlow;
  context.fillRect(0, 0, width, height);

  const violetGlow = context.createRadialGradient(width * 0.16, height * 0.92, 0, width * 0.16, height * 0.92, 520);
  violetGlow.addColorStop(0, "rgba(167, 139, 250, 0.22)");
  violetGlow.addColorStop(1, "rgba(167, 139, 250, 0)");
  context.fillStyle = violetGlow;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(148, 163, 184, 0.055)";
  context.lineWidth = 1;
  for (let x = 64; x < width; x += 64) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 64; y < height; y += 64) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  const waves = drawWaveLayer(width, height);

  const type = createCanvas(width, height);
  drawText(type, { x: 96, y: 226, text: "Palette", color: "#e9eefb", size: 152, weight: 700, family: "system" });
  context2d(type).save();
  context2d(type).fillStyle = "rgba(103, 232, 249, 0.9)";
  context2d(type).fillRect(100, 414, 300, 3);
  context2d(type).restore();
  drawText(type, { x: 100, y: 442, text: "A local-first image editor", color: "#9aa8c0", size: 34, weight: 400 });
  drawText(type, {
    x: 102,
    y: 506,
    text: "LAYERS   ·   TOOLS   ·   ADJUSTMENTS   ·   EXPORT",
    color: "#67e8f9",
    size: 19,
    weight: 600,
    family: "mono",
  });

  const layers = [
    createLayer({ name: "Background", canvas: background }),
    createLayer({ name: "Aegean ripple", canvas: waves }),
    createLayer({ name: "Welcome type", canvas: type }),
  ];
  return createDocument({
    width,
    height,
    name: "Welcome to Palette",
    layers,
    activeLayerId: layers[2].id,
  });
}

export class PaletteEditor {
  constructor(root = document) {
    this.root = root;
    this.el = cacheIds(root, IDS);
    this.history = new History({ limit: 24 });
    this.tool = "move";
    this.doc = null;
    this.view = { scale: 1, offsetX: 0, offsetY: 0 };
    this.viewport = { width: 1, height: 1, dpr: 1 };
    this.autoFit = true;
    this.space = false;
    this.pointer = null;
    this.action = null;
    this.cropRect = null;
    this.textDraft = null;
    this.adjustStart = null;
    this.opacityStart = null;
    this.renderQueued = false;
    this.overlayQueued = false;
    this.messageTimer = null;
    this.started = false;
    this.options = {
      color: "#22d3ee",
      brush: { size: 32, hardness: 0.7, opacity: 1 },
      eraser: { size: 40, hardness: 0.6, opacity: 1 },
      shape: { fill: true, outline: true, width: 4, outlineColor: "#e9eefb" },
      text: { family: "system", size: 48, weight: 600 },
    };
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.history.subscribe(() => this.updateHistoryButtons());
    this.bindEvents();
    this.bindResizeObserver();
    this.setDocument(welcomeDocument(), {
      reset: true,
      fit: true,
      status: "Welcome to Palette. Open an image, drop one here, or press New for a blank canvas.",
    });
    setTimeout(() => this.el.stageNote?.setAttribute("data-hidden", "true"), 9000);
  }

  setDocument(doc, { reset = false, fit = false, status = "" } = {}) {
    this.doc = doc;
    this.history.setLimit(historyLimitFor(doc));
    if (reset) this.history.clear();
    this.action = null;
    this.cancelText();
    this.cropRect = null;
    this.adjustStart = null;
    this.opacityStart = null;
    this.autoFit = true;
    this.refreshUI();
    if (fit) this.fitView();
    else this.scheduleRender();
    if (status) this.announce(status);
  }

  applyDoc(doc) {
    const previous = this.doc;
    const dimensionsChanged =
      Boolean(previous) && (previous.width !== doc.width || previous.height !== doc.height);
    this.doc = doc;
    const limit = historyLimitFor(doc);
    if (limit !== this.history.limit) this.history.setLimit(limit);
    this.action = null;
    this.cropRect = null;
    this.adjustStart = null;
    this.opacityStart = null;
    this.cancelText();
    this.refreshUI();
    if (dimensionsChanged && this.autoFit) this.fitView();
    else this.scheduleRender();
  }

  commit(beforeDoc, label) {
    if (!beforeDoc || beforeDoc === this.doc) {
      this.refreshUI();
      this.scheduleRender();
      return;
    }
    const afterDoc = this.doc;
    const limit = historyLimitFor(afterDoc);
    if (limit !== this.history.limit) this.history.setLimit(limit);
    this.history.push(
      createCommand(
        label,
        () => this.applyDoc(beforeDoc),
        () => this.applyDoc(afterDoc),
      ),
    );
    this.refreshUI();
    this.scheduleRender();
  }

  announce(message, { error = false } = {}) {
    const target = this.el.statusMessage;
    if (!target) return;
    target.textContent = message;
    target.dataset.tone = error ? "error" : "";
    clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => {
      target.textContent = "Ready";
      target.dataset.tone = "";
    }, error ? 6500 : 4200);
  }

  dismissNote() {
    this.el.stageNote?.setAttribute("data-hidden", "true");
  }

  updateHistoryButtons() {
    this.el.btnUndo.disabled = !this.history.canUndo;
    this.el.btnRedo.disabled = !this.history.canRedo;
    this.el.btnUndo.title = this.history.canUndo ? `Undo ${this.history.undoLabel} (Ctrl+Z)` : "Nothing to undo";
    this.el.btnRedo.title = this.history.canRedo ? `Redo ${this.history.redoLabel} (Ctrl+Shift+Z)` : "Nothing to redo";
  }

  refreshUI() {
    if (!this.doc) return;
    if (this.root.activeElement !== this.el.docName) this.el.docName.value = this.doc.name;
    this.el.docSize.textContent = `${this.doc.width} × ${this.doc.height}`;
    this.updateHistoryButtons();
    this.renderLayerList();
    this.syncActiveLayer();
    this.syncToolOptions();
    this.syncOptionControls();
    this.updateZoomLabel();
    this.el.cropApply.disabled = !isUsableRect(this.cropRect);
    this.el.cropCancel.disabled = !this.cropRect;
  }

  syncActiveLayer() {
    const layer = activeLayer(this.doc);
    if (!layer) return;
    const percent = Math.round(layer.opacity * 100);
    if (this.root.activeElement !== this.el.layerOpacity) this.el.layerOpacity.value = String(percent);
    this.el.layerOpacityValue.textContent = `${percent}%`;
    for (const key of ADJUSTMENTS) {
      const input = this.el[`adj${key[0].toUpperCase()}${key.slice(1)}`];
      const output = this.el[`adj${key[0].toUpperCase()}${key.slice(1)}Value`];
      if (!input || !output) continue;
      const value = layer.adjustments[key];
      if (this.root.activeElement !== input) input.value = String(value);
      output.textContent = formatAdjustment(key, value);
    }
  }

  syncToolOptions() {
    const groups = {
      brush: this.el.optionsBrush,
      eraser: this.el.optionsEraser,
      shape: this.el.optionsShape,
      text: this.el.optionsText,
      crop: this.el.optionsCrop,
      move: this.el.optionsMove,
    };
    for (const [name, node] of Object.entries(groups)) node.hidden = name !== this.tool && !(name === "shape" && ["rect", "ellipse", "line"].includes(this.tool));
    const usesColor = ["brush", "text", "rect", "ellipse", "line", "eyedropper"].includes(this.tool);
    this.el.colorRow.hidden = !usesColor;
    const meta = TOOL_META[this.tool] ?? TOOL_META.move;
    this.el.toolHint.textContent = meta.hint;
    this.el.statusTool.textContent = meta.label;
    for (const button of this.root.querySelectorAll("[data-tool]")) {
      button.setAttribute("aria-pressed", button.dataset.tool === this.tool ? "true" : "false");
    }
    this.updateCursor();
  }

  syncOptionControls() {
    const { brush, eraser, shape, text } = this.options;
    this.el.brushSize.value = String(brush.size);
    this.el.brushSizeValue.textContent = String(brush.size);
    this.el.brushHardness.value = String(Math.round(brush.hardness * 100));
    this.el.brushHardnessValue.textContent = String(Math.round(brush.hardness * 100));
    this.el.brushOpacity.value = String(Math.round(brush.opacity * 100));
    this.el.brushOpacityValue.textContent = String(Math.round(brush.opacity * 100));
    this.el.eraserSize.value = String(eraser.size);
    this.el.eraserSizeValue.textContent = String(eraser.size);
    this.el.eraserHardness.value = String(Math.round(eraser.hardness * 100));
    this.el.eraserHardnessValue.textContent = String(Math.round(eraser.hardness * 100));
    this.el.eraserOpacity.value = String(Math.round(eraser.opacity * 100));
    this.el.eraserOpacityValue.textContent = String(Math.round(eraser.opacity * 100));
    this.el.shapeFill.checked = shape.fill;
    this.el.shapeOutline.checked = shape.outline;
    this.el.shapeWidth.value = String(shape.width);
    this.el.shapeWidthValue.textContent = String(shape.width);
    this.el.shapeOutlineColor.value = shape.outlineColor;
    this.el.shapeOutlineHex.textContent = shape.outlineColor;
    this.el.textFont.value = text.family;
    this.el.textSize.value = String(text.size);
    this.el.textSizeValue.textContent = String(text.size);
    this.el.textWeight.value = String(text.weight);
    if (this.root.activeElement !== this.el.colorInput) this.el.colorInput.value = this.options.color;
    this.el.colorHex.textContent = this.options.color;
    this.el.textInput.style.color = this.options.color;
  }

  renderLayerList() {
    const list = this.el.layerList;
    list.replaceChildren();
    const layers = this.doc.layers.slice().reverse();
    for (const layer of layers) {
      const item = this.root.createElement("li");
      item.className = "layer-item";
      item.dataset.active = layer.id === this.doc.activeLayerId ? "true" : "false";

      const visibility = this.root.createElement("button");
      visibility.type = "button";
      visibility.className = "layer-visibility";
      visibility.setAttribute("aria-label", `${layer.visible ? "Hide" : "Show"} ${layer.name}`);
      visibility.setAttribute("aria-pressed", layer.visible ? "true" : "false");
      visibility.innerHTML = layer.visible
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.6"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4l16 16"/><path d="M2.5 12s3.5-6 9.5-6c1.7 0 3.2.5 4.5 1.2M21.5 12s-3.5 6-9.5 6c-1.7 0-3.2-.5-4.5-1.2"/></svg>';
      visibility.addEventListener("click", (event) => {
        event.stopPropagation();
        this.toggleLayerVisibility(layer.id);
      });

      const thumb = this.root.createElement("img");
      thumb.className = "layer-thumb";
      thumb.alt = "";
      thumb.src = layerThumbnail(layer.canvas);
      thumb.width = 44;
      thumb.height = 34;

      const name = this.root.createElement("button");
      name.type = "button";
      name.className = "layer-name";
      name.textContent = layer.name;
      name.title = layer.name;
      name.addEventListener("click", () => this.selectLayer(layer.id));
      name.addEventListener("dblclick", (event) => {
        event.preventDefault();
        this.beginRename(layer.id, name);
      });

      item.addEventListener("click", () => this.selectLayer(layer.id));
      item.append(visibility, thumb, name);
      list.append(item);
    }
  }

  updateZoomLabel() {
    const percent = this.view.scale * 100;
    this.el.statusZoom.textContent = `${percent < 10 ? percent.toFixed(1) : Math.round(percent)}%`;
  }

  updateCursor() {
    let cursor = TOOL_META[this.tool]?.cursor ?? "crosshair";
    if (this.space) cursor = "grab";
    if (this.action?.type === "pan") cursor = "grabbing";
    this.el.stage.dataset.cursor = cursor;
  }

  setTool(tool) {
    if (!TOOL_META[tool]) return;
    if (tool === this.tool) {
      this.el.stage.focus({ preventScroll: true });
      return;
    }
    this.finishText();
    if (this.action) this.cancelAction();
    if (this.tool === "crop") this.cropRect = null;
    this.tool = tool;
    this.refreshUI();
    this.scheduleRender();
    this.el.stage.focus({ preventScroll: true });
  }

  fitView() {
    if (!this.doc) return;
    const rect = this.el.stageWrap.getBoundingClientRect();
    this.view = fitView(this.doc.width, this.doc.height, Math.max(1, rect.width), Math.max(1, rect.height), 56);
    this.autoFit = true;
    this.updateZoomLabel();
    this.scheduleRender();
  }

  actualSize() {
    if (!this.doc) return;
    const rect = this.el.stageWrap.getBoundingClientRect();
    this.view = {
      scale: 1,
      offsetX: Math.round((rect.width - this.doc.width) / 2),
      offsetY: Math.round((rect.height - this.doc.height) / 2),
    };
    this.autoFit = false;
    this.updateZoomLabel();
    this.scheduleRender();
  }

  zoomBy(factor) {
    const rect = this.el.stageWrap.getBoundingClientRect();
    this.zoomAtPoint({ x: rect.width / 2, y: rect.height / 2 }, factor);
  }

  zoomAtPoint(screen, factor) {
    this.view = zoomAt(this.view, screen, this.view.scale * factor);
    this.autoFit = false;
    this.updateZoomLabel();
    this.scheduleRender();
  }

  scheduleRender() {
    if (this.renderQueued || !this.doc) return;
    this.renderQueued = true;
    requestAnimationFrame(() => {
      this.renderQueued = false;
      this.render();
    });
  }

  scheduleOverlay() {
    if (this.overlayQueued || !this.doc) return;
    this.overlayQueued = true;
    requestAnimationFrame(() => {
      this.overlayQueued = false;
      this.renderOverlay();
    });
  }

  resizeCanvases() {
    const rect = this.el.stageWrap.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const backingWidth = Math.max(1, Math.round(width * dpr));
    const backingHeight = Math.max(1, Math.round(height * dpr));
    for (const canvas of [this.el.stage, this.el.overlay]) {
      if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
        canvas.width = backingWidth;
        canvas.height = backingHeight;
      }
    }
    this.viewport = { width, height, dpr };
  }

  render() {
    if (!this.doc) return;
    this.resizeCanvases();
    const { width, height, dpr } = this.viewport;
    const context = this.el.stage.getContext("2d");
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);

    const frame = this.el.docFrame;
    frame.style.left = `${this.view.offsetX}px`;
    frame.style.top = `${this.view.offsetY}px`;
    frame.style.width = `${Math.max(1, this.doc.width * this.view.scale)}px`;
    frame.style.height = `${Math.max(1, this.doc.height * this.view.scale)}px`;

    context.save();
    context.translate(this.view.offsetX, this.view.offsetY);
    context.scale(this.view.scale, this.view.scale);
    context.imageSmoothingEnabled = this.view.scale < 1;
    context.imageSmoothingQuality = "high";
    context.beginPath();
    context.rect(0, 0, this.doc.width, this.doc.height);
    context.clip();
    const moving = this.action?.type === "move" ? this.action : null;
    for (const layer of this.doc.layers) {
      if (!layer.visible || layer.opacity <= 0 || !layer.canvas) continue;
      context.save();
      context.globalAlpha = layer.opacity;
      context.filter = buildCssFilter(layer.adjustments);
      if (moving && moving.layerId === layer.id) context.translate(moving.dx, moving.dy);
      context.drawImage(layer.canvas, 0, 0);
      context.restore();
    }
    context.restore();

    this.renderOverlay();
    this.updateZoomLabel();
    if (this.textDraft) this.positionTextEditor();
  }

  renderOverlay() {
    const overlay = this.el.overlay;
    const { dpr } = this.viewport;
    const context = overlay.getContext("2d");
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, overlay.width, overlay.height);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const crop =
      this.cropRect ??
      (this.action?.type === "crop"
        ? roundRect(clampRect(normalizeRect(this.action.start, this.action.end), this.doc.width, this.doc.height))
        : null);
    if (crop && crop.w > 0.5 && crop.h > 0.5) {
      const x = this.view.offsetX + crop.x * this.view.scale;
      const y = this.view.offsetY + crop.y * this.view.scale;
      const w = crop.w * this.view.scale;
      const h = crop.h * this.view.scale;
      context.save();
      context.fillStyle = "rgba(2, 6, 14, 0.62)";
      context.fillRect(
        this.view.offsetX,
        this.view.offsetY,
        this.doc.width * this.view.scale,
        this.doc.height * this.view.scale,
      );
      context.clearRect(x, y, w, h);
      context.strokeStyle = "rgba(103, 232, 249, 0.95)";
      context.lineWidth = 1.5;
      context.setLineDash([7, 5]);
      context.strokeRect(x + 0.5, y + 0.5, Math.max(0, w - 1), Math.max(0, h - 1));
      context.setLineDash([]);
      context.strokeStyle = "rgba(103, 232, 249, 0.32)";
      context.lineWidth = 1;
      for (const ratio of [1 / 3, 2 / 3]) {
        context.beginPath();
        context.moveTo(x + w * ratio, y);
        context.lineTo(x + w * ratio, y + h);
        context.stroke();
        context.beginPath();
        context.moveTo(x, y + h * ratio);
        context.lineTo(x + w, y + h * ratio);
        context.stroke();
      }
      context.restore();
    }

    if (this.action?.type === "shape") {
      context.save();
      context.translate(this.view.offsetX, this.view.offsetY);
      context.scale(this.view.scale, this.view.scale);
      drawShape(context, {
        tool: this.action.tool,
        start: this.action.start,
        end: this.action.end,
        color: this.options.color,
        outlineColor: this.options.shape.outlineColor,
        fill: this.options.shape.fill,
        outline: this.options.shape.outline,
        width: this.options.shape.width,
        opacity: 0.92,
      });
      context.restore();
    }

    if (this.textDraft?.value?.trim()) {
      context.save();
      context.translate(this.view.offsetX, this.view.offsetY);
      context.scale(this.view.scale, this.view.scale);
      drawTextOn(context, {
        x: this.textDraft.point.x,
        y: this.textDraft.point.y,
        text: this.textDraft.value,
        color: this.options.color,
        size: this.options.text.size,
        weight: this.options.text.weight,
        family: this.options.text.family,
      });
      context.restore();
    }

    if (this.pointer && (this.tool === "brush" || this.tool === "eraser")) {
      const size = this.tool === "brush" ? this.options.brush.size : this.options.eraser.size;
      const radius = Math.max(1, (size * this.view.scale) / 2);
      context.save();
      context.beginPath();
      context.arc(this.pointer.x, this.pointer.y, radius, 0, Math.PI * 2);
      context.lineWidth = 3;
      context.strokeStyle = "rgba(2, 6, 14, 0.8)";
      context.stroke();
      context.beginPath();
      context.arc(this.pointer.x, this.pointer.y, radius, 0, Math.PI * 2);
      context.lineWidth = 1;
      context.strokeStyle = "rgba(233, 238, 251, 0.9)";
      context.stroke();
      context.restore();
    }
  }

  eventPoint(event) {
    const rect = this.el.stage.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  toDoc(point) {
    return screenToDoc(point, this.view);
  }

  pointInsideDoc(point) {
    return point.x >= 0 && point.y >= 0 && point.x <= this.doc.width && point.y <= this.doc.height;
  }

  updateCursorStatus(point) {
    if (!point || !this.pointInsideDoc(point)) {
      this.el.statusCursor.textContent = "—, —";
      return;
    }
    this.el.statusCursor.textContent = `${Math.floor(point.x)}, ${Math.floor(point.y)}`;
  }

  onPointerDown(event) {
    if (!this.doc) return;
    if (event.button !== 0 && event.button !== 1) return;
    event.preventDefault();
    this.dismissNote();
    this.el.stage.focus({ preventScroll: true });
    const screen = this.eventPoint(event);
    const point = this.toDoc(screen);
    this.pointer = screen;
    this.updateCursorStatus(point);

    if (event.button === 1 || this.space || this.tool === "hand") {
      this.action = {
        type: "pan",
        pointerId: event.pointerId,
        startScreen: screen,
        startOffset: { x: this.view.offsetX, y: this.view.offsetY },
      };
      this.el.stage.setPointerCapture(event.pointerId);
      this.updateCursor();
      return;
    }
    if (this.tool === "zoom") {
      this.zoomAtPoint(screen, event.altKey ? 0.8 : 1.25);
      return;
    }
    if (this.tool === "eyedropper") {
      this.pickColor(point);
      return;
    }
    if (!this.pointInsideDoc(point)) return;
    if (this.tool === "text") {
      this.openText(point);
      return;
    }
    if (this.tool === "crop") {
      this.cropRect = null;
      this.action = { type: "crop", pointerId: event.pointerId, start: point, end: point };
      this.el.stage.setPointerCapture(event.pointerId);
      this.scheduleOverlay();
      return;
    }
    const layer = this.requireActiveLayer();
    if (!layer) return;
    if (this.tool === "move") {
      this.action = { type: "move", pointerId: event.pointerId, layerId: layer.id, before: this.doc, start: point, dx: 0, dy: 0 };
      this.el.stage.setPointerCapture(event.pointerId);
      return;
    }
    if (this.tool === "brush" || this.tool === "eraser") {
      this.beginBrush(point, event.pointerId);
      return;
    }
    if (["rect", "ellipse", "line"].includes(this.tool)) {
      this.action = {
        type: "shape",
        pointerId: event.pointerId,
        tool: this.tool,
        before: this.doc,
        layerId: layer.id,
        start: point,
        end: point,
        shift: event.shiftKey,
      };
      this.el.stage.setPointerCapture(event.pointerId);
      this.scheduleRender();
    }
  }

  beginBrush(point, pointerId) {
    const layer = this.requireActiveLayer();
    if (!layer) return;
    const erase = this.tool === "eraser";
    const options = erase ? this.options.eraser : this.options.brush;
    const before = this.doc;
    const working = cloneCanvas(layer.canvas);
    this.doc = updateLayer(this.doc, layer.id, { canvas: working });
    const stamp = brushStamp({
      size: options.size,
      hardness: options.hardness,
      opacity: options.opacity,
      color: this.options.color,
      erase,
    });
    strokeBrush(working, point, point, stamp, erase);
    this.action = {
      type: "brush",
      pointerId,
      layerId: layer.id,
      before,
      canvas: working,
      last: point,
      stamp,
      erase,
    };
    this.el.stage.setPointerCapture(pointerId);
    this.scheduleRender();
  }

  onPointerMove(event) {
    if (!this.doc) return;
    const screen = this.eventPoint(event);
    const point = this.toDoc(screen);
    this.pointer = screen;
    this.updateCursorStatus(point);
    const action = this.action;
    if (!action) {
      if (this.tool === "brush" || this.tool === "eraser") this.scheduleOverlay();
      return;
    }
    if (action.type === "pan") {
      this.view = {
        ...this.view,
        offsetX: action.startOffset.x + (screen.x - action.startScreen.x),
        offsetY: action.startOffset.y + (screen.y - action.startScreen.y),
      };
      this.autoFit = false;
      this.scheduleRender();
      return;
    }
    if (action.type === "move") {
      action.dx = Math.round(point.x - action.start.x);
      action.dy = Math.round(point.y - action.start.y);
      this.scheduleRender();
      return;
    }
    if (action.type === "brush") {
      strokeBrush(action.canvas, action.last, point, action.stamp, action.erase);
      action.last = point;
      this.scheduleRender();
      return;
    }
    if (action.type === "crop") {
      action.end = point;
      this.scheduleOverlay();
      return;
    }
    if (action.type === "shape") {
      action.shift = event.shiftKey;
      action.end = action.shift
        ? action.tool === "line"
          ? constrainAngle(action.start, point)
          : constrainSquare(action.start, point)
        : point;
      this.scheduleOverlay();
    }
  }

  onPointerUp(event) {
    const action = this.action;
    if (!action) {
      this.pointer = this.pointer ? this.eventPoint(event) : null;
      return;
    }
    if (action.type === "pan") {
      this.action = null;
      this.updateCursor();
      this.scheduleRender();
      return;
    }
    if (action.type === "move") {
      this.action = null;
      if (action.dx !== 0 || action.dy !== 0) {
        const layer = layerById(this.doc, action.layerId);
        if (layer) {
          const canvas = shiftedCanvas(layer.canvas, action.dx, action.dy);
          this.doc = updateLayer(this.doc, layer.id, { canvas });
          this.commit(action.before, "Move layer");
        }
      } else {
        this.scheduleRender();
      }
      return;
    }
    if (action.type === "brush") {
      this.action = null;
      this.commit(action.before, action.erase ? "Erase" : "Brush stroke");
      return;
    }
    if (action.type === "crop") {
      const rect = roundRect(clampRect(normalizeRect(action.start, action.end), this.doc.width, this.doc.height));
      this.action = null;
      this.cropRect = isUsableRect(rect) ? rect : null;
      this.refreshUI();
      this.scheduleRender();
      if (this.cropRect) this.announce("Crop region ready. Press Enter or Apply crop.");
      return;
    }
    if (action.type === "shape") {
      this.action = null;
      const layer = layerById(this.doc, action.layerId);
      const rect = normalizeRect(action.start, action.end);
      const usable = action.tool === "line" ? Math.hypot(rect.w, rect.h) >= 1 : isUsableRect(rect, 1);
      if (layer && usable) {
        const canvas = cloneCanvas(layer.canvas);
        drawShape(context2d(canvas), {
          tool: action.tool,
          start: action.start,
          end: action.end,
          color: this.options.color,
          outlineColor: this.options.shape.outlineColor,
          fill: this.options.shape.fill,
          outline: this.options.shape.outline,
          width: this.options.shape.width,
          opacity: 1,
        });
        this.doc = updateLayer(this.doc, layer.id, { canvas });
        this.commit(action.before, `Draw ${action.tool}`);
      } else {
        this.scheduleRender();
      }
    }
  }

  onPointerCancel() {
    const action = this.action;
    if (!action) return;
    if (action.type === "brush" || action.type === "move") {
      this.doc = action.before;
    }
    this.action = null;
    this.refreshUI();
    this.scheduleRender();
  }

  onPointerLeave() {
    if (this.action) return;
    this.pointer = null;
    this.el.statusCursor.textContent = "—, —";
    this.scheduleOverlay();
  }

  applyCrop() {
    if (!this.doc) return;
    const rect = this.cropRect;
    if (!rect || !isUsableRect(rect)) {
      this.announce("Drag a crop region first.", { error: true });
      return;
    }
    this.finishText();
    const rounded = roundRect(clampRect(rect, this.doc.width, this.doc.height));
    if (!isUsableRect(rounded)) {
      this.cropRect = null;
      this.refreshUI();
      this.announce("That crop region is too small.", { error: true });
      return;
    }
    if (rounded.x === 0 && rounded.y === 0 && rounded.w === this.doc.width && rounded.h === this.doc.height) {
      this.cropRect = null;
      this.refreshUI();
      this.announce("The crop covers the whole document.");
      return;
    }
    const before = this.doc;
    const layers = this.doc.layers.map((layer) =>
      createLayer({ ...layer, canvas: cropCanvas(layer.canvas, rounded) }),
    );
    this.doc = { ...resizeDocument(this.doc, rounded.w, rounded.h), layers };
    this.cropRect = null;
    this.commit(before, "Crop image");
    this.fitView();
    this.announce(`Cropped to ${rounded.w} × ${rounded.h}.`);
  }

  cancelCrop() {
    this.cropRect = null;
    this.action = null;
    this.refreshUI();
    this.scheduleRender();
    this.announce("Crop cancelled.");
  }

  cancelAction() {
    const action = this.action;
    if (!action) return;
    if (action.type === "brush" || action.type === "move") {
      this.doc = action.before;
    }
    if (action.type === "crop") this.cropRect = null;
    this.action = null;
    this.refreshUI();
    this.scheduleRender();
    this.announce("Cancelled.");
  }

  requireActiveLayer() {
    const layer = activeLayer(this.doc);
    if (!layer) {
      this.announce("Select a layer first.", { error: true });
      return null;
    }
    if (!layer.canvas) {
      this.announce("That layer has no pixels.", { error: true });
      return null;
    }
    if (!layer.visible) {
      this.announce(`${layer.name} is hidden. Show it before drawing.`, { error: true });
      return null;
    }
    return layer;
  }

  pickColor(point) {
    if (!this.pointInsideDoc(point)) return;
    const composite = compositeDocument(this.doc);
    const pixel = samplePixel(composite, point.x, point.y);
    if (pixel.a < 8) {
      this.announce("That pixel is transparent.", { error: true });
      return;
    }
    const hex = rgbToHex(pixel);
    this.setColor(hex);
    this.announce(`Picked ${hex}.`);
  }

  setColor(value) {
    const hex = normalizeHex(value, this.options.color);
    this.options.color = hex;
    this.el.colorInput.value = hex;
    this.el.colorHex.textContent = hex;
    this.el.textInput.style.color = hex;
    this.scheduleRender();
  }

  openText(point) {
    const layer = this.requireActiveLayer();
    if (!layer) return;
    this.finishText();
    this.textDraft = {
      point: { x: Math.round(point.x), y: Math.round(point.y) },
      value: "",
      before: this.doc,
      layerId: layer.id,
    };
    this.el.textInput.value = "";
    this.el.textEditor.hidden = false;
    this.positionTextEditor();
    this.el.textInput.focus();
    this.scheduleRender();
  }

  positionTextEditor() {
    if (!this.textDraft) return;
    const screen = docToScreen(this.textDraft.point, this.view);
    const left = clamp(screen.x + 14, 8, Math.max(8, this.viewport.width - 320));
    const top = clamp(screen.y - 20, 8, Math.max(8, this.viewport.height - 52));
    this.el.textEditor.style.left = `${left}px`;
    this.el.textEditor.style.top = `${top}px`;
  }

  commitText() {
    const draft = this.textDraft;
    if (!draft) return;
    const value = this.el.textInput.value.trim();
    this.textDraft = null;
    this.el.textEditor.hidden = true;
    this.el.textInput.value = "";
    if (!value) {
      this.scheduleRender();
      return;
    }
    const layer = layerById(this.doc, draft.layerId);
    if (!layer) {
      this.scheduleRender();
      return;
    }
    const canvas = cloneCanvas(layer.canvas);
    drawText(canvas, {
      x: draft.point.x,
      y: draft.point.y,
      text: value,
      color: this.options.color,
      size: this.options.text.size,
      weight: this.options.text.weight,
      family: this.options.text.family,
    });
    this.doc = updateLayer(this.doc, layer.id, { canvas });
    this.commit(draft.before, "Add text");
    this.announce("Text added.");
  }

  cancelText() {
    if (!this.textDraft) return;
    this.textDraft = null;
    this.el.textEditor.hidden = true;
    this.el.textInput.value = "";
    this.scheduleRender();
  }

  finishText() {
    if (this.textDraft) this.commitText();
  }

  selectLayer(id) {
    if (!this.doc || id === this.doc.activeLayerId) return;
    this.finishText();
    this.doc = setActiveLayer(this.doc, id);
    this.refreshUI();
    this.scheduleRender();
  }

  toggleLayerVisibility(id) {
    const layer = layerById(this.doc, id);
    if (!layer) return;
    const before = this.doc;
    this.doc = updateLayer(this.doc, id, { visible: !layer.visible });
    this.commit(before, layer.visible ? "Hide layer" : "Show layer");
  }

  beginRename(id, nameButton) {
    const layer = layerById(this.doc, id);
    if (!layer) return;
    const before = this.doc;
    const input = this.root.createElement("input");
    input.type = "text";
    input.className = "layer-name-input";
    input.value = layer.name;
    input.maxLength = 80;
    input.setAttribute("aria-label", "Layer name");
    nameButton.replaceWith(input);
    input.focus();
    input.select();
    let done = false;
    const finish = (save) => {
      if (done) return;
      done = true;
      const value = input.value.trim();
      input.replaceWith(nameButton);
      if (save && value && value !== layer.name) {
        this.doc = updateLayer(this.doc, id, { name: value });
        this.commit(before, "Rename layer");
      } else {
        this.refreshUI();
      }
    };
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        finish(true);
      } else if (event.key === "Escape") {
        event.preventDefault();
        finish(false);
      }
    });
    input.addEventListener("blur", () => finish(true));
  }

  addNewLayer() {
    if (!this.doc) return;
    this.finishText();
    const before = this.doc;
    const layer = createLayer({ name: nextLayerName(this.doc), canvas: createCanvas(this.doc.width, this.doc.height) });
    const at = indexOfLayer(this.doc, this.doc.activeLayerId) + 1;
    this.doc = addLayer(this.doc, layer, at);
    this.commit(before, "Add layer");
  }

  duplicateActiveLayer() {
    if (!this.doc) return;
    this.finishText();
    const source = activeLayer(this.doc);
    if (!source) return;
    const before = this.doc;
    const copy = duplicateLayerRecord(source, { canvas: cloneCanvas(source.canvas) });
    this.doc = addLayer(this.doc, copy, indexOfLayer(this.doc, source.id) + 1);
    this.commit(before, "Duplicate layer");
  }

  deleteActiveLayer() {
    if (!this.doc) return;
    this.finishText();
    if (this.doc.layers.length <= 1) {
      this.announce("Keep at least one layer.", { error: true });
      return;
    }
    const layer = activeLayer(this.doc);
    if (!layer) return;
    const before = this.doc;
    this.doc = removeLayer(this.doc, layer.id);
    this.commit(before, "Delete layer");
  }

  reorderActiveLayer(delta) {
    if (!this.doc) return;
    this.finishText();
    const layer = activeLayer(this.doc);
    if (!layer) return;
    const before = this.doc;
    this.doc = moveLayer(this.doc, layer.id, delta);
    this.commit(before, delta > 0 ? "Move layer up" : "Move layer down");
  }

  previewAdjustment(key, value) {
    const layer = activeLayer(this.doc);
    if (!layer) return;
    if (!this.adjustStart) {
      this.finishText();
      this.adjustStart = this.doc;
    }
    const adjustments = { ...layer.adjustments, [key]: value };
    this.doc = updateLayer(this.doc, layer.id, { adjustments });
    const output = this.el[`adj${key[0].toUpperCase()}${key.slice(1)}Value`];
    if (output) output.textContent = formatAdjustment(key, value);
    this.scheduleRender();
  }

  resetAdjustments() {
    const layer = activeLayer(this.doc);
    if (!layer) return;
    this.finishText();
    const before = this.doc;
    this.adjustStart = null;
    this.doc = updateLayer(this.doc, layer.id, { adjustments: { ...DEFAULT_ADJUSTMENTS } });
    this.commit(before, "Reset adjustments");
  }

  previewLayerOpacity() {
    const layer = activeLayer(this.doc);
    if (!layer) return;
    if (!this.opacityStart) {
      this.finishText();
      this.opacityStart = this.doc;
    }
    const opacity = clamp(Number(this.el.layerOpacity.value) / 100, 0, 1);
    this.doc = updateLayer(this.doc, layer.id, { opacity });
    this.el.layerOpacityValue.textContent = `${Math.round(opacity * 100)}%`;
    this.scheduleRender();
  }

  applyPixelsToActive(label, transform) {
    this.finishText();
    const layer = this.requireActiveLayer();
    if (!layer) return;
    const before = this.doc;
    const canvas = createCanvas(layer.canvas.width, layer.canvas.height);
    putPixels(canvas, transform(getPixels(layer.canvas)));
    this.doc = updateLayer(this.doc, layer.id, { canvas });
    this.commit(before, label);
    this.announce(`${label} applied.`);
  }

  applyBlurFilter() {
    this.finishText();
    const layer = this.requireActiveLayer();
    if (!layer) return;
    const before = this.doc;
    const radius = clamp(Number(this.el.filterBlurRadius.value) || 3, 1, 30);
    const canvas = createCanvas(layer.canvas.width, layer.canvas.height);
    const context = context2d(canvas);
    context.filter = `blur(${radius}px)`;
    context.drawImage(layer.canvas, 0, 0);
    this.doc = updateLayer(this.doc, layer.id, { canvas });
    this.commit(before, `Blur ${radius}px`);
    this.announce(`Blur ${radius}px applied.`);
  }

  applyPixelateFilter() {
    const size = clamp(Number(this.el.filterPixelSize.value) || 8, 2, 64);
    this.applyPixelsToActive("Pixelate", (pixels) => applyPixelate(pixels, size));
  }

  applySharpenFilter() {
    this.applyPixelsToActive("Sharpen", (pixels) => applySharpen(pixels, 1.2));
  }

  applyVignetteFilter() {
    this.applyPixelsToActive("Vignette", (pixels) => applyVignette(pixels, 0.6));
  }

  openNewDialog() {
    if (this.isDialogOpen()) return;
    this.finishText();
    this.el.newDialog.showModal();
    this.el.newName.focus();
    this.el.newName.select();
  }

  hasUnsavedChanges() {
    return this.history.canUndo || this.history.canRedo;
  }

  confirmDiscard(action) {
    if (!this.hasUnsavedChanges()) return true;
    if (typeof globalThis.confirm !== "function") return true;
    return globalThis.confirm(`Discard the current edit and ${action}?`);
  }

  createNewDocument() {
    if (!this.confirmDiscard("create a new document")) return;
    const requestedWidth = cleanDimension(this.el.newWidth.value, 1280);
    const requestedHeight = cleanDimension(this.el.newHeight.value, 800);
    const { width, height } = boundedDimensions(requestedWidth, requestedHeight);
    const name = cleanDocumentName(this.el.newName.value);
    const selected = this.root.querySelector('input[name="new-background"]:checked')?.value ?? "white";
    const canvas = createCanvas(width, height);
    if (selected === "white") fillCanvas(canvas, "#ffffff");
    if (selected === "color") fillCanvas(canvas, normalizeHex(this.el.newColor.value, "#0b1220"));
    const layer = createLayer({ name: "Background", canvas });
    const doc = createDocument({ width, height, name, layers: [layer], activeLayerId: layer.id });
    this.el.newDialog.close();
    const limited = width !== requestedWidth || height !== requestedHeight;
    this.setDocument(doc, {
      reset: true,
      fit: true,
      status: limited
        ? `Created ${width} × ${height} ${name} (capped to keep the editor responsive).`
        : `Created ${width} × ${height} ${name}.`,
    });
  }

  openExportDialog() {
    if (this.isDialogOpen()) return;
    this.finishText();
    this.el.exportName.value = this.doc.name;
    this.el.exportFormat.value = "png";
    this.el.exportQuality.value = "92";
    this.syncExportFormat();
    this.el.exportDialog.showModal();
  }

  syncExportFormat() {
    const format = exportFormat(this.el.exportFormat.value);
    this.el.exportQualityRow.hidden = !format.quality;
    this.el.exportQualityValue.textContent = this.el.exportQuality.value;
    this.el.exportSize.textContent = `${this.doc.width} × ${this.doc.height} pixels, ${
      format.mime === "image/jpeg" ? "white background" : "transparent background"
    }.`;
  }

  async exportImage() {
    const format = exportFormat(this.el.exportFormat.value);
    const quality = format.quality ? normalizeQuality(Number(this.el.exportQuality.value) / 100) : undefined;
    const name = this.el.exportName.value.trim() || this.doc.name;
    this.el.exportDialog.close();
    this.announce("Exporting image…");
    try {
      const canvas = compositeDocument(this.doc, { background: format.mime === "image/jpeg" ? "#ffffff" : null });
      const blob = await canvasToBlob(canvas, format.mime, quality);
      downloadBlob(blob, downloadName(name, this.el.exportFormat.value));
      this.announce(`Exported ${format.label} (${formatBytes(blob.size)}).`);
    } catch (error) {
      this.announce(error.message || "The export failed.", { error: true });
    }
  }

  saveProject() {
    if (!this.doc) return;
    this.finishText();
    try {
      this.announce("Saving project…");
      const images = {};
      for (const layer of this.doc.layers) images[layer.id] = layer.canvas.toDataURL("image/png");
      const blob = new Blob([serializeProject(this.doc, images)], { type: "application/json" });
      const name = `${safeFileName(this.doc.name)}.palette`;
      downloadBlob(blob, name);
      this.announce(`Saved ${name} (${formatBytes(blob.size)}).`);
    } catch (error) {
      this.announce(error.message || "The project could not be saved.", { error: true });
    }
  }

  async openImageFile(file) {
    if (!file) return;
    if (!String(file.type).startsWith("image/")) {
      this.announce("That file is not an image.", { error: true });
      return;
    }
    if (!this.confirmDiscard("open another image")) {
      this.el.fileImage.value = "";
      return;
    }
    this.finishText();
    this.announce("Opening image…");
    let url = "";
    try {
      url = URL.createObjectURL(file);
      const image = await loadImage(url);
      const { width, height } = boundedDimensions(image.naturalWidth, image.naturalHeight);
      const canvas = imageToCanvas(image, width, height);
      const name = fileBaseName(file.name);
      const layer = createLayer({ name: "Image", canvas });
      const doc = createDocument({ width, height, name, layers: [layer], activeLayerId: layer.id });
      const limited = width !== image.naturalWidth || height !== image.naturalHeight;
      this.setDocument(doc, {
        reset: true,
        fit: true,
        status: limited
          ? `Opened ${file.name} at ${width} × ${height} (scaled to fit the editor).`
          : `Opened ${file.name} at ${width} × ${height}.`,
      });
    } catch (error) {
      this.announce(error.message || "That image could not be opened.", { error: true });
    } finally {
      if (url) URL.revokeObjectURL(url);
      this.el.fileImage.value = "";
    }
  }

  async openProjectFile(file) {
    if (!file) return;
    if (!this.confirmDiscard("open a project")) {
      this.el.fileProject.value = "";
      return;
    }
    this.finishText();
    this.announce("Opening project…");
    try {
      const project = parseProject(await readFileText(file));
      const layers = [];
      for (const entry of project.layers) {
        const image = await loadImage(entry.image);
        const canvas = createCanvas(project.width, project.height);
        context2d(canvas).drawImage(image, 0, 0);
        layers.push(createLayer({ ...entry, canvas }));
      }
      const doc = createDocument({ ...project, layers });
      this.setDocument(doc, { reset: true, fit: true, status: `Opened ${file.name}.` });
    } catch (error) {
      this.announce(error.message || "That project could not be opened.", { error: true });
    } finally {
      this.el.fileProject.value = "";
    }
  }

  openResizeDialog() {
    if (this.isDialogOpen()) return;
    this.finishText();
    this.resizeAspect = this.doc.width / this.doc.height;
    this.el.resizeWidth.value = String(this.doc.width);
    this.el.resizeHeight.value = String(this.doc.height);
    this.el.resizeLock.checked = true;
    this.el.resizeDialog.showModal();
  }

  applyResize() {
    const width = cleanDimension(this.el.resizeWidth.value, this.doc.width);
    const height = cleanDimension(this.el.resizeHeight.value, this.doc.height);
    this.el.resizeDialog.close();
    if (width === this.doc.width && height === this.doc.height) return;
    const before = this.doc;
    const layers = this.doc.layers.map((layer) =>
      createLayer({ ...layer, canvas: scaleCanvas(layer.canvas, width, height) }),
    );
    this.doc = { ...resizeDocument(this.doc, width, height), layers };
    this.commit(before, "Resize image");
    this.fitView();
    this.announce(`Resized to ${width} × ${height}.`);
  }

  flipDocument(axis) {
    if (!this.doc) return;
    this.finishText();
    const before = this.doc;
    const layers = this.doc.layers.map((layer) =>
      createLayer({ ...layer, canvas: flipCanvas(layer.canvas, axis) }),
    );
    this.doc = { ...this.doc, layers };
    this.commit(before, axis === "horizontal" ? "Flip horizontal" : "Flip vertical");
  }

  rotateDocument() {
    if (!this.doc) return;
    this.finishText();
    const before = this.doc;
    const layers = this.doc.layers.map((layer) =>
      createLayer({ ...layer, canvas: rotateCanvas(layer.canvas) }),
    );
    this.doc = { ...resizeDocument(this.doc, this.doc.height, this.doc.width), layers };
    this.commit(before, "Rotate 90°");
    this.fitView();
  }

  setDocumentName(value) {
    if (!this.doc) return;
    const name = cleanDocumentName(value, this.doc.name);
    this.el.docName.value = name;
    if (name === this.doc.name) return;
    this.doc = { ...this.doc, name };
    this.announce("Document renamed.");
  }

  adjustBrushSize(delta) {
    const target = this.tool === "eraser" ? this.options.eraser : this.options.brush;
    target.size = clamp(target.size + delta, 1, 200);
    this.syncOptionControls();
    this.scheduleRender();
    this.announce(`Brush size ${target.size} px.`);
  }

  nudgeActiveLayer(dx, dy) {
    const layer = this.requireActiveLayer();
    if (!layer) return;
    const before = this.doc;
    this.doc = updateLayer(this.doc, layer.id, { canvas: shiftedCanvas(layer.canvas, dx, dy) });
    this.commit(before, "Nudge layer");
  }

  undo() {
    if (!this.history.canUndo) return;
    const label = this.history.undoLabel;
    this.history.undo();
    this.announce(`Undid ${label}.`);
  }

  redo() {
    if (!this.history.canRedo) return;
    const label = this.history.redoLabel;
    this.history.redo();
    this.announce(`Redid ${label}.`);
  }

  isDialogOpen() {
    return Boolean(this.root.querySelector("dialog[open]"));
  }

  onKeyDown(event) {
    if (this.isDialogOpen()) return;
    if (this.textDraft && event.target === this.el.textInput) {
      if (event.key === "Enter") {
        event.preventDefault();
        this.commitText();
      } else if (event.key === "Escape") {
        event.preventDefault();
        this.cancelText();
      }
      return;
    }
    if (isTypingTarget(event.target)) return;

    if (event.key === "Escape") {
      if (this.textDraft) {
        event.preventDefault();
        this.cancelText();
      } else if (this.cropRect) {
        event.preventDefault();
        this.cancelCrop();
      } else if (this.action) {
        event.preventDefault();
        this.cancelAction();
      }
      return;
    }
    if (event.code === "Space") {
      if (!this.space) {
        this.space = true;
        this.updateCursor();
      }
      event.preventDefault();
      return;
    }
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier) {
      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) this.redo();
        else this.undo();
      } else if (key === "y") {
        event.preventDefault();
        this.redo();
      } else if (key === "s") {
        event.preventDefault();
        this.saveProject();
      } else if (key === "o") {
        event.preventDefault();
        this.el.fileImage.click();
      } else if (key === "e") {
        event.preventDefault();
        this.openExportDialog();
      }
      return;
    }
    const shortcuts = {
      v: "move",
      b: "brush",
      e: "eraser",
      c: "crop",
      t: "text",
      r: "rect",
      o: "ellipse",
      l: "line",
      i: "eyedropper",
      h: "hand",
      z: "zoom",
    };
    const tool = shortcuts[event.key.toLowerCase()];
    if (tool && !event.altKey) {
      event.preventDefault();
      this.setTool(tool);
      return;
    }
    if (event.key === "[" || event.key === "]") {
      event.preventDefault();
      this.adjustBrushSize(event.key === "]" ? 4 : -4);
      return;
    }
    if (event.key === "0") {
      event.preventDefault();
      this.fitView();
      return;
    }
    if (event.key === "1") {
      event.preventDefault();
      this.actualSize();
      return;
    }
    if (event.key === "Enter" && this.tool === "crop" && this.cropRect) {
      event.preventDefault();
      this.applyCrop();
      return;
    }
    if (event.key.startsWith("Arrow") && this.tool === "move") {
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
      const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
      if (dx || dy) this.nudgeActiveLayer(dx, dy);
    }
  }

  onKeyUp(event) {
    if (event.code === "Space") {
      this.space = false;
      this.updateCursor();
    }
  }

  onPaste(event) {
    const items = Array.from(event.clipboardData?.items ?? []);
    const image = items.find((item) => String(item.type).startsWith("image/"));
    if (!image) return;
    const file = image.getAsFile();
    if (!file) return;
    event.preventDefault();
    this.openImageFile(file);
  }

  onDragOver(event) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    this.el.dropHint.hidden = false;
  }

  onDragLeave(event) {
    if (event.relatedTarget && this.el.stageWrap.contains(event.relatedTarget)) return;
    this.el.dropHint.hidden = true;
  }

  onDrop(event) {
    event.preventDefault();
    this.el.dropHint.hidden = true;
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    if (String(file.type).startsWith("image/")) {
      this.openImageFile(file);
    } else if (/\.(palette|json)$/i.test(file.name)) {
      this.openProjectFile(file);
    } else {
      this.announce("Drop an image or a .palette project.", { error: true });
    }
  }

  bindResizeObserver() {
    if (typeof ResizeObserver !== "function") return;
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvases();
      if (this.autoFit) this.fitView();
      else this.scheduleRender();
    });
    this.resizeObserver.observe(this.el.stageWrap);
  }

  bindEvents() {
    for (const button of this.root.querySelectorAll("[data-tool]")) {
      button.addEventListener("click", () => this.setTool(button.dataset.tool));
    }
    this.el.btnNew.addEventListener("click", () => this.openNewDialog());
    this.el.btnOpen.addEventListener("click", () => this.el.fileImage.click());
    this.el.btnOpenProject.addEventListener("click", () => this.el.fileProject.click());
    this.el.btnSave.addEventListener("click", () => this.saveProject());
    this.el.btnExport.addEventListener("click", () => this.openExportDialog());
    this.el.btnUndo.addEventListener("click", () => this.undo());
    this.el.btnRedo.addEventListener("click", () => this.redo());
    this.el.btnHelp.addEventListener("click", () => this.el.helpDialog.showModal());
    this.el.btnZoomIn.addEventListener("click", () => this.zoomBy(1.25));
    this.el.btnZoomOut.addEventListener("click", () => this.zoomBy(0.8));
    this.el.btnFit.addEventListener("click", () => this.fitView());
    this.el.btnActual.addEventListener("click", () => this.actualSize());
    this.el.btnLayerAdd.addEventListener("click", () => this.addNewLayer());
    this.el.btnLayerDuplicate.addEventListener("click", () => this.duplicateActiveLayer());
    this.el.btnLayerDelete.addEventListener("click", () => this.deleteActiveLayer());
    this.el.btnLayerUp.addEventListener("click", () => this.reorderActiveLayer(1));
    this.el.btnLayerDown.addEventListener("click", () => this.reorderActiveLayer(-1));
    this.el.btnResize.addEventListener("click", () => this.openResizeDialog());
    this.el.btnFlipH.addEventListener("click", () => this.flipDocument("horizontal"));
    this.el.btnFlipV.addEventListener("click", () => this.flipDocument("vertical"));
    this.el.btnRotate.addEventListener("click", () => this.rotateDocument());
    this.el.adjustReset.addEventListener("click", () => this.resetAdjustments());
    this.el.cropApply.addEventListener("click", () => this.applyCrop());
    this.el.cropCancel.addEventListener("click", () => this.cancelCrop());
    this.el.btnFilterBlur.addEventListener("click", () => this.applyBlurFilter());
    this.el.btnFilterPixelate.addEventListener("click", () => this.applyPixelateFilter());
    this.el.btnFilterSharpen.addEventListener("click", () => this.applySharpenFilter());
    this.el.btnFilterVignette.addEventListener("click", () => this.applyVignetteFilter());

    this.el.colorInput.addEventListener("input", () => this.setColor(this.el.colorInput.value));
    this.el.brushSize.addEventListener("input", () => {
      this.options.brush.size = Number(this.el.brushSize.value);
      this.el.brushSizeValue.textContent = this.el.brushSize.value;
      this.scheduleRender();
    });
    this.el.brushHardness.addEventListener("input", () => {
      this.options.brush.hardness = Number(this.el.brushHardness.value) / 100;
      this.el.brushHardnessValue.textContent = this.el.brushHardness.value;
    });
    this.el.brushOpacity.addEventListener("input", () => {
      this.options.brush.opacity = Number(this.el.brushOpacity.value) / 100;
      this.el.brushOpacityValue.textContent = this.el.brushOpacity.value;
    });
    this.el.eraserSize.addEventListener("input", () => {
      this.options.eraser.size = Number(this.el.eraserSize.value);
      this.el.eraserSizeValue.textContent = this.el.eraserSize.value;
      this.scheduleRender();
    });
    this.el.eraserHardness.addEventListener("input", () => {
      this.options.eraser.hardness = Number(this.el.eraserHardness.value) / 100;
      this.el.eraserHardnessValue.textContent = this.el.eraserHardness.value;
    });
    this.el.eraserOpacity.addEventListener("input", () => {
      this.options.eraser.opacity = Number(this.el.eraserOpacity.value) / 100;
      this.el.eraserOpacityValue.textContent = this.el.eraserOpacity.value;
    });
    this.el.shapeFill.addEventListener("change", () => {
      this.options.shape.fill = this.el.shapeFill.checked;
    });
    this.el.shapeOutline.addEventListener("change", () => {
      this.options.shape.outline = this.el.shapeOutline.checked;
    });
    this.el.shapeWidth.addEventListener("input", () => {
      this.options.shape.width = Number(this.el.shapeWidth.value);
      this.el.shapeWidthValue.textContent = this.el.shapeWidth.value;
    });
    this.el.shapeOutlineColor.addEventListener("input", () => {
      this.options.shape.outlineColor = normalizeHex(this.el.shapeOutlineColor.value, "#e9eefb");
      this.el.shapeOutlineHex.textContent = this.options.shape.outlineColor;
    });
    this.el.textFont.addEventListener("change", () => {
      this.options.text.family = this.el.textFont.value;
      this.scheduleRender();
    });
    this.el.textSize.addEventListener("input", () => {
      this.options.text.size = Number(this.el.textSize.value);
      this.el.textSizeValue.textContent = this.el.textSize.value;
      this.scheduleRender();
    });
    this.el.textWeight.addEventListener("change", () => {
      this.options.text.weight = Number(this.el.textWeight.value);
      this.scheduleRender();
    });
    this.el.textInput.addEventListener("input", () => {
      if (this.textDraft) {
        this.textDraft.value = this.el.textInput.value;
        this.scheduleRender();
      }
    });
    this.el.textCommit.addEventListener("click", () => this.commitText());
    this.el.textCancel.addEventListener("click", () => this.cancelText());

    for (const key of ADJUSTMENTS) {
      const input = this.el[`adj${key[0].toUpperCase()}${key.slice(1)}`];
      if (!input) continue;
      input.addEventListener("pointerdown", () => {
        this.finishText();
        if (!this.adjustStart) this.adjustStart = this.doc;
      });
      input.addEventListener("focus", () => {
        this.finishText();
        if (!this.adjustStart) this.adjustStart = this.doc;
      });
      input.addEventListener("input", () => this.previewAdjustment(key, Number(input.value)));
      input.addEventListener("change", () => {
        if (!this.adjustStart) return;
        const before = this.adjustStart;
        this.adjustStart = null;
        this.commit(before, `Adjust ${key}`);
      });
    }
    this.el.layerOpacity.addEventListener("pointerdown", () => {
      this.finishText();
      if (!this.opacityStart) this.opacityStart = this.doc;
    });
    this.el.layerOpacity.addEventListener("focus", () => {
      this.finishText();
      if (!this.opacityStart) this.opacityStart = this.doc;
    });
    this.el.layerOpacity.addEventListener("input", () => this.previewLayerOpacity());
    this.el.layerOpacity.addEventListener("change", () => {
      if (!this.opacityStart) return;
      const before = this.opacityStart;
      this.opacityStart = null;
      this.commit(before, "Layer opacity");
    });
    this.el.filterBlurRadius.addEventListener("input", () => {
      this.el.filterBlurValue.textContent = this.el.filterBlurRadius.value;
    });
    this.el.filterPixelSize.addEventListener("input", () => {
      this.el.filterPixelValue.textContent = this.el.filterPixelSize.value;
    });

    this.el.docName.addEventListener("change", () => this.setDocumentName(this.el.docName.value));
    this.el.docName.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.el.docName.blur();
      }
    });
    this.el.fileImage.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (file) this.openImageFile(file);
    });
    this.el.fileProject.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (file) this.openProjectFile(file);
    });

    this.el.newForm.addEventListener("submit", (event) => {
      event.preventDefault();
      this.createNewDocument();
    });
    this.el.newColor.addEventListener("input", () => {
      const radio = this.root.querySelector('input[name="new-background"][value="color"]');
      if (radio) radio.checked = true;
    });
    this.el.exportFormat.addEventListener("change", () => this.syncExportFormat());
    this.el.exportQuality.addEventListener("input", () => {
      this.el.exportQualityValue.textContent = this.el.exportQuality.value;
    });
    this.el.exportForm.addEventListener("submit", (event) => {
      event.preventDefault();
      this.exportImage();
    });
    this.el.resizeForm.addEventListener("submit", (event) => {
      event.preventDefault();
      this.applyResize();
    });
    this.el.resizeWidth.addEventListener("input", () => {
      if (!this.el.resizeLock.checked || !this.resizeAspect) return;
      const width = Number(this.el.resizeWidth.value);
      if (width > 0) this.el.resizeHeight.value = String(Math.max(1, Math.round(width / this.resizeAspect)));
    });
    this.el.resizeHeight.addEventListener("input", () => {
      if (!this.el.resizeLock.checked || !this.resizeAspect) return;
      const height = Number(this.el.resizeHeight.value);
      if (height > 0) this.el.resizeWidth.value = String(Math.max(1, Math.round(height * this.resizeAspect)));
    });
    for (const button of this.root.querySelectorAll("[data-close]")) {
      button.addEventListener("click", () => button.closest("dialog")?.close());
    }

    this.el.stage.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    this.el.stage.addEventListener("pointermove", (event) => this.onPointerMove(event));
    this.el.stage.addEventListener("pointerup", (event) => this.onPointerUp(event));
    this.el.stage.addEventListener("pointercancel", () => this.onPointerCancel());
    this.el.stage.addEventListener("pointerleave", () => this.onPointerLeave());
    this.el.stage.addEventListener("lostpointercapture", () => {
      if (this.action) this.onPointerCancel();
    });
    this.el.stage.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        if (event.ctrlKey || event.metaKey) {
          this.zoomAtPoint(this.eventPoint(event), Math.exp(-event.deltaY * 0.0015));
        } else {
          this.view = {
            ...this.view,
            offsetX: this.view.offsetX - event.deltaX,
            offsetY: this.view.offsetY - event.deltaY,
          };
          this.autoFit = false;
          this.scheduleRender();
        }
      },
      { passive: false },
    );
    this.el.stageWrap.addEventListener("dragover", (event) => this.onDragOver(event));
    this.el.stageWrap.addEventListener("dragleave", (event) => this.onDragLeave(event));
    this.el.stageWrap.addEventListener("drop", (event) => this.onDrop(event));
    window.addEventListener("keydown", (event) => this.onKeyDown(event));
    window.addEventListener("keyup", (event) => this.onKeyUp(event));
    window.addEventListener("blur", () => {
      this.space = false;
      this.updateCursor();
    });
    window.addEventListener("paste", (event) => this.onPaste(event));
  }
}

function formatAdjustment(key, value) {
  if (key === "blur") return String(Number(value));
  return String(Math.round(value));
}
