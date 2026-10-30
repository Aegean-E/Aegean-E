export function createCommand(label, undo, redo) {
  if (typeof undo !== "function" || typeof redo !== "function") {
    throw new TypeError("A history command needs undo and redo functions.");
  }
  return { label: String(label || "Change"), undo, redo };
}

export class History {
  constructor({ limit = 30 } = {}) {
    this.limit = Math.max(1, Math.floor(Number(limit) || 30));
    this.past = [];
    this.future = [];
    this.listeners = new Set();
  }

  get canUndo() {
    return this.past.length > 0;
  }

  get canRedo() {
    return this.future.length > 0;
  }

  get undoLabel() {
    return this.past[this.past.length - 1]?.label ?? "";
  }

  get redoLabel() {
    return this.future[this.future.length - 1]?.label ?? "";
  }

  setLimit(limit) {
    this.limit = Math.max(1, Math.floor(Number(limit) || 30));
    if (this.past.length > this.limit) this.past.splice(0, this.past.length - this.limit);
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) listener(this);
  }

  push(next) {
    const command = createCommand(next.label, next.undo, next.redo);
    this.past.push(command);
    if (this.past.length > this.limit) this.past.splice(0, this.past.length - this.limit);
    this.future.length = 0;
    this.notify();
    return command;
  }

  undo() {
    const command = this.past.pop();
    if (!command) return null;
    command.undo();
    this.future.push(command);
    this.notify();
    return command;
  }

  redo() {
    const command = this.future.pop();
    if (!command) return null;
    command.redo();
    this.past.push(command);
    this.notify();
    return command;
  }

  clear() {
    this.past.length = 0;
    this.future.length = 0;
    this.notify();
  }
}
