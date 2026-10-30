import { PaletteEditor } from "./editor.js";

const editor = new PaletteEditor(document);
editor.start();

globalThis.palette = editor;
