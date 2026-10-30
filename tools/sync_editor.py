#!/usr/bin/env python3
"""Vendor the Palette image editor into the AegeanWorks site.

Palette is a separate AIKit project with no build step. Its runtime files are
copied verbatim under docs/editor/ so the published GitHub Pages site is
self-contained. A manifest records one SHA-256 per file plus a combined source
hash, and `--check` fails when the copy drifts from the project.

Exit codes:
  0 current    1 drift or invalid copy    2 CLI or source misuse
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DOCS = PROJECT_ROOT / "docs"
DESTINATION = DOCS / "editor"
DEFAULT_SOURCE = PROJECT_ROOT.parent / "palette"
MANIFEST_NAME = "build.json"
SCHEMA = 1
RUNTIME_ROOTS = ("index.html", "LICENSE", "assets", "src")
REQUIRED = ("index.html", "src/ui/main.js", "src/ui/editor.js", "src/core/history.js")


class SyncError(Exception):
    """A user-facing sync failure with a Why/Fix pair."""

    def __init__(self, what: str, why: str, fix: str) -> None:
        super().__init__(what)
        self.what = what
        self.why = why
        self.fix = fix


def _digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _source_files(source: Path) -> list[Path]:
    if not source.is_dir():
        raise SyncError(
            "The Palette source project is missing.",
            f"{source} is not a directory.",
            "keep Palette checked out next to AegeanWorks, or pass --source.",
        )
    for relative in REQUIRED:
        if not (source / relative).is_file():
            raise SyncError(
                f"The Palette source is missing {relative}.",
                "the editor runtime is incomplete, so the site copy would break.",
                "restore the Palette project, then rerun the sync.",
            )
    files: list[Path] = []
    for root in RUNTIME_ROOTS:
        candidate = source / root
        if candidate.is_file():
            files.append(candidate)
        elif candidate.is_dir():
            files.extend(path for path in candidate.rglob("*") if path.is_file())
    return sorted(files, key=lambda path: path.relative_to(source).as_posix())


def _source_hash(files: list[Path], source: Path) -> str:
    digest = hashlib.sha256()
    for path in files:
        digest.update(path.relative_to(source).as_posix().encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


def _manifest(source: Path, files: list[Path]) -> dict:
    version = ""
    package = source / "package.json"
    if package.is_file():
        try:
            version = str(json.loads(package.read_text(encoding="utf-8")).get("version", "")).strip()
        except json.JSONDecodeError:
            version = ""
    return {
        "schema": SCHEMA,
        "name": "palette",
        "version": version,
        "source_sha256": _source_hash(files, source),
        "files": {
            path.relative_to(source).as_posix(): _digest(path) for path in files
        },
    }


def _write_atomic(path: Path, payload: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.tmp")
    temporary.write_bytes(payload)
    temporary.replace(path)


def command_write(source: Path) -> int:
    files = _source_files(source)
    manifest = _manifest(source, files)
    if DESTINATION.exists():
        shutil.rmtree(DESTINATION)
    for path in files:
        target = DESTINATION / path.relative_to(source)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(path.read_bytes())
    payload = json.dumps(manifest, indent=2, sort_keys=True) + "\n"
    _write_atomic(DESTINATION / MANIFEST_NAME, payload.encode("utf-8"))
    print(f"[OK] Vendored {len(files)} Palette file(s) into docs/editor/.")
    print(f"[OK] Source hash {manifest['source_sha256'][:16]} (version {manifest['version'] or 'unversioned'}).")
    return 0


def _load_manifest() -> dict:
    path = DESTINATION / MANIFEST_NAME
    if not path.is_file():
        raise SyncError(
            "The vendored editor manifest is missing.",
            "the site cannot prove that docs/editor/ matches the Palette project.",
            "run `python tools/sync_editor.py --write`, then retry.",
        )
    try:
        manifest = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise SyncError(
            "The vendored editor manifest is unreadable.",
            str(error),
            "delete docs/editor/build.json and rerun the sync.",
        ) from error
    if manifest.get("schema") != SCHEMA or not isinstance(manifest.get("files"), dict):
        raise SyncError(
            "The vendored editor manifest has an unknown shape.",
            "a newer sync tool writes a different schema.",
            "rerun `python tools/sync_editor.py --write` with this checkout.",
        )
    return manifest


def command_check(source: Path) -> int:
    files = _source_files(source)
    expected = _manifest(source, files)
    actual = _load_manifest()
    if expected["source_sha256"] != actual.get("source_sha256"):
        raise SyncError(
            "The vendored editor is stale.",
            "the Palette sources changed after docs/editor/ was written.",
            "run `python tools/sync_editor.py --write`, then commit docs/editor/.",
        )
    expected_files = expected["files"]
    actual_files = actual["files"]
    missing = sorted(set(expected_files) - set(actual_files))
    extra = sorted(set(actual_files) - set(expected_files))
    if missing or extra:
        raise SyncError(
            "The vendored editor file list is stale.",
            f"missing={missing or 'none'} extra={extra or 'none'}",
            "run `python tools/sync_editor.py --write`, then retry.",
        )
    for relative, digest in expected_files.items():
        target = DESTINATION / relative
        if not target.is_file():
            raise SyncError(
                f"The vendored editor is missing {relative}.",
                "the manifest lists a file that is not on disk.",
                "run `python tools/sync_editor.py --write`, then retry.",
            )
        if _digest(target) != digest:
            raise SyncError(
                f"The vendored editor file has drifted: {relative}.",
                "the bytes on disk do not match the manifest.",
                "do not edit docs/editor/ by hand; rerun the sync.",
            )
    print(f"[OK] docs/editor/ matches Palette ({len(expected_files)} files, {expected['source_sha256'][:16]}).")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE, help="Palette project directory")
    parser.add_argument("--write", action="store_true", help="copy the runtime and rewrite docs/editor/build.json")
    parser.add_argument("--check", action="store_true", help="verify docs/editor/ against the source project")
    args = parser.parse_args(argv)
    if not args.write and not args.check:
        parser.error("choose --write or --check")
    source = args.source.resolve()
    try:
        if args.write:
            return command_write(source)
        return command_check(source)
    except SyncError as error:
        print(f"[FAIL] {error.what}", file=sys.stderr)
        print(f"Why: {error.why}", file=sys.stderr)
        print(f"Fix: {error.fix}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
