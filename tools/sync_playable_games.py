#!/usr/bin/env python3
"""Sync the static browser game and the playable-game manifest.

Prism-Relay is a self-contained browser build, so its runtime files are copied
under docs/play/ and versioned by commit. Crypt-Crawler needs its Python API,
so the catalog records it as a local-run title instead of serving a broken
iframe.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DOCS = PROJECT_ROOT / "docs"
DEFAULT_SOURCE_ROOT = PROJECT_ROOT.parent

GAMES = (
    {
        "slug": "prism-relay",
        "repo": "Prism-Relay",
        "source": "prism-relay",
        "title": "Prism Relay",
        "description": "A neon light-routing puzzle: rotate mirrors and splitters, fold beams through portals, and charge every receiver across three episodes.",
        "license": "AGL-1.1",
        "mode": "browser",
        "runtime": ("index.html", "src"),
        "version_file": "package.json",
    },
    {
        "slug": "crypt-crawler",
        "repo": "Crypt-Crawler",
        "source": "crypt-crawler",
        "title": "Crypt-Crawler",
        "description": "A tactical turn-based dungeon crawler with procedural floors, loot, lore and boss fights.",
        "license": "AGL-1.1",
        "mode": "local",
        "version_file": "crawler/server.py",
        "reason": "The Python server owns dungeon generation and lore; run `python run.py --open` in the repository.",
    },
)

MANIFEST_REL = "docs/playable.json"
MEDIA_REL = "media/%s/logo.webp"
COMMIT_RE = re.compile(r"^[0-9a-f]{7,40}$")


class SyncError(Exception):
    """A user-facing sync failure with a Why/Fix pair."""

    def __init__(self, what: str, why: str, fix: str) -> None:
        super().__init__(what)
        self.what = what
        self.why = why
        self.fix = fix


def _git(source: Path, *args: str) -> str:
    try:
        result = subprocess.run(
            ["git", "-C", str(source), *args],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=15,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        raise SyncError(
            f"Could not read the git metadata in {source}.",
            str(error),
            "keep the game source checked out as a git repository, then retry.",
        ) from error
    if result.returncode != 0:
        raise SyncError(
            f"Could not read the git metadata in {source}.",
            result.stderr.strip() or "git returned a non-zero exit code.",
            "check the source checkout, then retry.",
        )
    return result.stdout.strip()


def _version(source: Path, relative: str) -> str:
    path = source / relative
    if not path.is_file():
        return ""
    text = path.read_text(encoding="utf-8")
    if relative.endswith("package.json"):
        try:
            return str(json.loads(text).get("version", "")).strip()
        except json.JSONDecodeError:
            return ""
    match = re.search(r'"version"\s*:\s*"([^"]+)"', text)
    return match.group(1).strip() if match else ""


def _digest(files: list[Path], root: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(files):
        digest.update(path.relative_to(root).as_posix().encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return "sha256:" + digest.hexdigest()


def _write_atomic(path: Path, payload: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    handle, temp = tempfile.mkstemp(dir=str(path.parent), prefix=".tmp_", suffix=path.suffix)
    try:
        with os.fdopen(handle, "wb") as stream:
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp, path)
    except OSError:
        try:
            os.unlink(temp)
        # hygiene: allow cleanup of a failed temporary write cannot replace the original error
        except OSError:
            pass
        raise


def _copy_file(source: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    payload = source.read_bytes()
    if target.is_file() and target.read_bytes() == payload:
        return
    _write_atomic(target, payload)


def _copy_runtime(source: Path, target: Path, entries: tuple[str, ...]) -> None:
    for entry in entries:
        path = source / entry
        if path.is_dir():
            for child in sorted(path.rglob("*")):
                if child.is_file():
                    _copy_file(child, target / child.relative_to(source))
        elif path.is_file():
            _copy_file(path, target / entry)
    if not (target / "index.html").is_file():
        raise SyncError(
            f"The browser build in {source} has no index.html.",
            "the copied directory would open as a broken play page.",
            "fix the game's runtime entries in tools/sync_playable_games.py.",
        )


def _runtime_files(target: Path) -> list[Path]:
    return [path for path in target.rglob("*") if path.is_file()]


def _browser_entry(game: dict, source_root: Path) -> dict:
    source = source_root / game["source"]
    if not source.is_dir():
        raise SyncError(
            f"The {game['repo']} source is missing at {source}.",
            "the playable build cannot be copied without its repository.",
            "check out the game beside AegeanWorks or pass --source-root, then retry.",
        )
    commit = _git(source, "rev-parse", "HEAD")
    if not COMMIT_RE.match(commit):
        raise SyncError(
            f"The {game['repo']} commit is not a git SHA: {commit}",
            "the play page would show an unverifiable version.",
            "check the source checkout, then retry.",
        )
    updated = _git(source, "show", "-s", "--format=%cs", "HEAD")
    short = commit[:12]
    base = DOCS / "play" / game["slug"]
    target = base / short
    if target.is_dir():
        shutil.rmtree(target)
    _copy_runtime(source, target, tuple(game["runtime"]))
    for old in base.iterdir() if base.is_dir() else ():
        if old.is_dir() and old.name != short and COMMIT_RE.match(old.name):
            shutil.rmtree(old)
    license_source = source / "LICENSE"
    if license_source.is_file():
        _copy_file(license_source, base / "LICENSE")
        _copy_file(license_source, PROJECT_ROOT / "LICENSES" / "LicenseRef-AGL-1.1.txt")
    files = _runtime_files(target)
    version = _version(source, game["version_file"])
    return {
        "slug": game["slug"],
        "repo": game["repo"],
        "title": game["title"],
        "description": game["description"],
        "playable": True,
        "mode": "browser",
        "path": f"play/{game['slug']}/{short}/index.html",
        "source_url": f"https://github.com/AegeanWorks/{game['repo']}",
        "version": version,
        "commit": commit,
        "updated": updated,
        "license": game["license"],
        "license_path": f"play/{game['slug']}/LICENSE",
        "digest": _digest(files, target),
        "logo": MEDIA_REL % game["repo"],
    }


def _local_entry(game: dict, source_root: Path) -> dict:
    source = source_root / game["source"]
    if not source.is_dir():
        raise SyncError(
            f"The {game['repo']} source is missing at {source}.",
            "its version and commit cannot be recorded without the repository.",
            "check out the game beside AegeanWorks or pass --source-root, then retry.",
        )
    commit = _git(source, "rev-parse", "HEAD")
    updated = _git(source, "show", "-s", "--format=%cs", "HEAD")
    return {
        "slug": game["slug"],
        "repo": game["repo"],
        "title": game["title"],
        "description": game["description"],
        "playable": False,
        "mode": "local",
        "source_url": f"https://github.com/AegeanWorks/{game['repo']}",
        "version": _version(source, game["version_file"]),
        "commit": commit,
        "updated": updated,
        "license": game["license"],
        "reason": game["reason"],
        "command": "python run.py --open",
        "logo": MEDIA_REL % game["repo"],
    }


def build_manifest(source_root: Path) -> dict:
    games = []
    for game in GAMES:
        if game["mode"] == "browser":
            games.append(_browser_entry(game, source_root))
        else:
            games.append(_local_entry(game, source_root))
    return {"schema": 1, "games": games}


def _read_manifest() -> dict:
    path = PROJECT_ROOT / MANIFEST_REL
    if not path.is_file():
        raise SyncError(
            "The playable manifest is missing.",
            "the Play page has no catalog to render.",
            "run `python tools/sync_playable_games.py --write`, then retry.",
        )
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise SyncError(
            "The playable manifest is not valid JSON.",
            str(error),
            "fix docs/playable.json or regenerate it with --write.",
        ) from error


def check_manifest() -> list[str]:
    manifest = _read_manifest()
    problems: list[str] = []
    if manifest.get("schema") != 1:
        problems.append("docs/playable.json has an unknown schema")
    games = manifest.get("games")
    if not isinstance(games, list) or len(games) != len(GAMES):
        problems.append("docs/playable.json does not list every playable game")
        return problems
    by_slug = {game.get("slug"): game for game in games if isinstance(game, dict)}
    for spec in GAMES:
        game = by_slug.get(spec["slug"])
        if not game:
            problems.append(f"manifest is missing {spec['slug']}")
            continue
        if not COMMIT_RE.match(str(game.get("commit", ""))):
            problems.append(f"{spec['slug']} has no valid commit")
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", str(game.get("updated", ""))):
            problems.append(f"{spec['slug']} has no valid commit date")
        if game.get("license") != spec["license"]:
            problems.append(f"{spec['slug']} has the wrong license label")
        if game.get("playable"):
            relative = str(game.get("path", ""))
            if not re.match(rf"^play/{spec['slug']}/[0-9a-f]{{7,40}}/index\.html$", relative):
                problems.append(f"{spec['slug']} has an unsafe or unstable path")
                continue
            target = DOCS / relative
            if not target.is_file():
                problems.append(f"{spec['slug']} build is missing: {relative}")
                continue
            license_path = DOCS / str(game.get("license_path", ""))
            if not license_path.is_file():
                problems.append(f"{spec['slug']} license is missing")
            if not (PROJECT_ROOT / "LICENSES" / "LicenseRef-AGL-1.1.txt").is_file():
                problems.append("the pinned AGL-1.1 license is missing")
            actual = _digest(_runtime_files(target.parent), target.parent)
            if actual != game.get("digest"):
                problems.append(f"{spec['slug']} digest does not match the copied build")
        elif spec["mode"] != "local":
            problems.append(f"{spec['slug']} is neither playable nor local")
        if not (DOCS / str(game.get("logo", ""))).is_file():
            problems.append(f"{spec['slug']} logo is missing")
    return problems


def command_write(source_root: Path) -> int:
    manifest = build_manifest(source_root)
    payload = json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"
    path = PROJECT_ROOT / MANIFEST_REL
    if path.is_file() and path.read_text(encoding="utf-8") == payload:
        print("[OK] Playable games are already current.")
        return 0
    _write_atomic(path, payload.encode("utf-8"))
    print(f"[OK] Wrote {MANIFEST_REL} with {len(manifest['games'])} game(s).")
    return 0


def command_check() -> int:
    problems = check_manifest()
    if problems:
        print(f"[FAIL] {len(problems)} playable-game problem(s):", file=sys.stderr)
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        print("Fix: run `python tools/sync_playable_games.py --write` after a game update, then retry.", file=sys.stderr)
        return 1
    print("[OK] Playable catalog, copied build and digest are current.")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path, default=DEFAULT_SOURCE_ROOT)
    parser.add_argument("--write", action="store_true", help="copy the games and rewrite docs/playable.json")
    parser.add_argument("--check", action="store_true", help="verify the committed catalog and copied build")
    args = parser.parse_args(argv)
    if not args.write and not args.check:
        parser.error("choose --write or --check")
    source_root = args.source_root.resolve()
    try:
        if args.write:
            return command_write(source_root)
        return command_check()
    except SyncError as error:
        print(f"Error: {error.what}", file=sys.stderr)
        print(f"Why: {error.why}", file=sys.stderr)
        print(f"Fix: {error.fix}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
