import { getMotif, motifList } from "../studio/motifs.js";
import { paletteList, getPalette } from "../studio/palettes.js";
import { createRandom } from "../studio/random.js";
import { renderSvg } from "../studio/svg.js";
import {
  DEFAULTS,
  PRESETS,
  applyPreset,
  decodeSearch,
  encodeState,
  exportName,
  normalizeState,
  presetState,
  randomizeState,
  reseedState,
} from "../studio/state.js";
import { clearState, loadState, saveState } from "../studio/storage.js";

const stage = document.getElementById("stage");
const motifGrid = document.getElementById("motif-grid");
const paletteGrid = document.getElementById("palette-grid");
const presetList = document.getElementById("preset-list");
const repeatInput = document.getElementById("repeat");
const weightInput = document.getElementById("weight");
const warpInput = document.getElementById("warp");
const repeatValue = document.getElementById("repeat-value");
const weightValue = document.getElementById("weight-value");
const warpValue = document.getElementById("warp-value");
const seedValue = document.getElementById("seed-value");
const motionInput = document.getElementById("motion");
const guidesInput = document.getElementById("guides");
const stageMotif = document.getElementById("stage-motif");
const stagePalette = document.getElementById("stage-palette");
const stageRepeat = document.getElementById("stage-repeat");
const stageSeed = document.getElementById("stage-seed");
const toast = document.getElementById("toast");

let state = normalizeState(DEFAULTS);
let lastPalette = state.palette;
let toastTimer = 0;

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function announce(message) {
  if (!toast) return;
  toast.hidden = false;
  toast.textContent = message;
  window.clearTimeout(toastTimer);
  window.requestAnimationFrame(() => toast.classList.add("is-visible"));
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 220);
  }, 2400);
}

function motifOptions() {
  return motifList();
}

function paletteOptions() {
  return paletteList();
}

function buildMotifButtons() {
  if (!motifGrid) return;
  motifGrid.replaceChildren();
  for (const motif of motifOptions()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "motif-button";
    button.dataset.motif = motif.id;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `${motif.name} motif. ${motif.note}`);

    const icon = document.createElement("span");
    icon.className = "motif-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = renderSvg(
      { ...state, motif: motif.id, repeat: 2, guides: false, motion: false },
      { width: 132, height: 92, repeat: 2, decorative: true, idPrefix: `thumb-${motif.id}` },
    );

    const label = document.createElement("span");
    label.className = "motif-label";
    label.textContent = motif.name;

    button.append(icon, label);
    button.addEventListener("click", () => {
      state = normalizeState({ ...state, motif: motif.id });
      update();
    });
    motifGrid.appendChild(button);
  }
}

function refreshMotifThumbs() {
  if (!motifGrid) return;
  for (const button of motifGrid.querySelectorAll(".motif-button")) {
    const motifId = button.dataset.motif;
    const icon = button.querySelector(".motif-icon");
    if (!motifId || !icon) continue;
    icon.innerHTML = renderSvg(
      { ...state, motif: motifId, repeat: 2, guides: false, motion: false },
      { width: 132, height: 92, repeat: 2, decorative: true, idPrefix: `thumb-${motifId}` },
    );
  }
}

function buildPaletteButtons() {
  if (!paletteGrid) return;
  paletteGrid.replaceChildren();
  for (const palette of paletteOptions()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "palette-button";
    button.dataset.palette = palette.id;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `${palette.name} palette. ${palette.note}`);

    const swatches = document.createElement("span");
    swatches.className = "swatches";
    swatches.setAttribute("aria-hidden", "true");
    for (const role of ["ink", "accent", "highlight"]) {
      const chip = document.createElement("i");
      chip.style.background = palette.colors[role];
      swatches.appendChild(chip);
    }

    const name = document.createElement("span");
    name.className = "palette-name";
    name.textContent = palette.name;

    button.append(swatches, name);
    button.addEventListener("click", () => {
      state = normalizeState({ ...state, palette: palette.id });
      update();
    });
    paletteGrid.appendChild(button);
  }
}

function buildPresetButtons() {
  if (!presetList) return;
  presetList.replaceChildren();
  for (const preset of PRESETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset-button";
    button.dataset.preset = preset.id;
    button.setAttribute("aria-label", `${preset.name}: ${preset.note}`);

    const name = document.createElement("span");
    name.className = "preset-name";
    name.textContent = preset.name;

    const note = document.createElement("span");
    note.className = "preset-note";
    note.textContent = preset.note;

    button.append(name, note);
    button.addEventListener("click", () => {
      state = applyPreset(preset.id, state);
      update();
      announce(`Loaded the ${preset.name} preset.`);
    });
    presetList.appendChild(button);
  }
}

function syncInputs() {
  if (repeatInput) repeatInput.value = String(state.repeat);
  if (weightInput) weightInput.value = String(state.weight);
  if (warpInput) warpInput.value = String(state.warp);
  if (repeatValue) repeatValue.textContent = String(state.repeat);
  if (weightValue) weightValue.textContent = String(state.weight);
  if (warpValue) warpValue.textContent = `${state.warp}%`;
  if (seedValue) seedValue.textContent = String(state.seed);
  if (motionInput) motionInput.checked = state.motion;
  if (guidesInput) guidesInput.checked = state.guides;
  if (stageMotif) stageMotif.textContent = getMotif(state.motif).name;
  if (stagePalette) stagePalette.textContent = getPalette(state.palette).name;
  if (stageRepeat) stageRepeat.textContent = String(state.repeat);
  if (stageSeed) stageSeed.textContent = String(state.seed);
  if (stage) stage.dataset.motion = state.motion ? "on" : "off";
}

function syncSelection() {
  if (motifGrid) {
    for (const button of motifGrid.querySelectorAll(".motif-button")) {
      button.setAttribute("aria-pressed", button.dataset.motif === state.motif ? "true" : "false");
    }
  }
  if (paletteGrid) {
    for (const button of paletteGrid.querySelectorAll(".palette-button")) {
      button.setAttribute("aria-pressed", button.dataset.palette === state.palette ? "true" : "false");
    }
  }
}

function renderStage() {
  if (!stage) return;
  stage.innerHTML = renderSvg(state, {
    width: 1600,
    height: 1067,
    repeat: state.repeat,
    guides: state.guides,
    idPrefix: "tessera-stage",
  });
}

function syncUrl() {
  try {
    const params = new URLSearchParams(encodeState(state));
    params.delete("preset");
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", next);
  } catch {
    // A sandboxed frame may refuse history writes; the studio still works.
  }
}

function update(options = {}) {
  if (state.palette !== lastPalette) {
    lastPalette = state.palette;
    refreshMotifThumbs();
  }
  syncInputs();
  syncSelection();
  renderStage();
  if (options.persist !== false) saveState(storage(), state);
  if (options.url !== false) syncUrl();
}

function svgText() {
  return renderSvg(state, {
    width: 1600,
    height: 1067,
    repeat: state.repeat,
    guides: state.guides,
  });
}

async function copySvg() {
  const text = svgText();
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      announce("SVG copied to the clipboard.");
      return;
    }
  } catch {
    // Fall through to the selection-based copy.
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try {
    const copied = document.execCommand("copy");
    announce(copied ? "SVG copied to the clipboard." : "Copy is unavailable in this browser.");
  } catch {
    announce("Copy is unavailable in this browser.");
  } finally {
    area.remove();
  }
}

function exportSvg() {
  const blob = new Blob([svgText()], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = exportName(state);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce(`Exported ${link.download}.`);
}

function bindRange(input, key) {
  if (!input) return;
  input.addEventListener("input", () => {
    state = normalizeState({ ...state, [key]: input.value });
    update();
  });
}

function bindSwitch(input, key) {
  if (!input) return;
  input.addEventListener("change", () => {
    state = normalizeState({ ...state, [key]: input.checked });
    update();
  });
}

function bindActions() {
  const randomize = document.getElementById("randomize");
  const reseed = document.getElementById("new-seed");
  const copy = document.getElementById("copy");
  const exportButton = document.getElementById("export");

  randomize?.addEventListener("click", () => {
    state = randomizeState(state, createRandom(Date.now() % 1000003));
    update();
    announce("A new pattern, picked at random.");
  });

  reseed?.addEventListener("click", () => {
    state = reseedState(state, createRandom(Date.now() % 1000003));
    update();
    announce(`Seed ${state.seed}.`);
  });

  copy?.addEventListener("click", copySvg);
  exportButton?.addEventListener("click", exportSvg);

  bindRange(repeatInput, "repeat");
  bindRange(weightInput, "weight");
  bindRange(warpInput, "warp");
  bindSwitch(motionInput, "motion");
  bindSwitch(guidesInput, "guides");
}

function bindKeyboard() {
  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    if (target instanceof HTMLElement) {
      if (target.isContentEditable) return;
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)) return;
    }
    const key = event.key.toLowerCase();
    if (key === "r") {
      event.preventDefault();
      state = randomizeState(state, createRandom(Date.now() % 1000003));
      update();
      announce("A new pattern, picked at random.");
    } else if (key === "c") {
      event.preventDefault();
      copySvg();
    } else if (key === "e") {
      event.preventDefault();
      exportSvg();
    }
  });
}

function initialState() {
  const decoded = decodeSearch(window.location.search);
  if (decoded.hasState) return decoded.state;
  if (decoded.preset) {
    const preset = presetState(decoded.preset);
    if (preset) return preset;
  }
  return loadState(storage()) || normalizeState(DEFAULTS);
}

function mount() {
  state = initialState();
  lastPalette = state.palette;
  buildMotifButtons();
  buildPaletteButtons();
  buildPresetButtons();
  bindActions();
  bindKeyboard();
  update({ persist: false, url: false });
  const reset = document.getElementById("reset");
  reset?.addEventListener("click", () => {
    clearState(storage());
    state = normalizeState(DEFAULTS);
    update();
    announce("Reset to the studio defaults.");
  });
}

try {
  mount();
} catch (error) {
  announce("The studio could not start. Reload the page to try again.");
  if (window.console) window.console.error(error);
}
