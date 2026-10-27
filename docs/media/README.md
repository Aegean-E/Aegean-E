# Project media

Logos and screenshots shown on a project dossier at `project.html?repo=<Name>`.
Each project has one manifest, `media/<Name>.json`, plus the files it points at.
Nothing is generated at build time: the dossier fetches the manifest and hides
the logo and gallery slots when a manifest or entry is missing.

## Manifest schema

```json
{
  "schema": 1,
  "repo": "AIKit",
  "logo": {
    "src": "media/AIKit/logo.svg",
    "alt": "AIKit logo"
  },
  "screenshots": [
    {
      "src": "media/AIKit/dashboard-2026-10-27.png",
      "alt": "Task ledger dashboard with two open milestones",
      "caption": "Ledger view after the reforge audit",
      "commit": "3ec859e",
      "taken_at": "2026-10-27",
      "viewport": "1440x900",
      "width": 1440,
      "height": 900
    }
  ]
}
```

- `schema` is `1`; an unknown schema is ignored rather than guessed at.
- `repo` must match the dossier name, case-insensitively.
- `src` is always relative to `docs/` and must start with `media/`; absolute
  URLs, `..` segments and `//` are rejected.
- `commit` is the 7-40 character hexadecimal commit the capture was taken at;
  the gallery links it to `github.com/AegeanWorks/<Name>/commit/<commit>`.
- `taken_at` is the calendar date of the capture (`YYYY-MM-DD`).
- `viewport` is optional, `WIDTHxHEIGHT`; `width` and `height` are optional and
  should be the image's real pixel size so the grid reserves space.
- At most 12 screenshots per project. `alt` is required; `caption` falls back to
  `alt` for the accessible name.

## Adding a capture

1. Record the repository state the capture shows:
   `git -C <repo> rev-parse --short HEAD` and the current date.
2. Save the image under `media/<Name>/` with a date in the file name.
3. Add the entry to `media/<Name>.json` with that commit and date.
4. Run `python -m unittest discover -s tests` and `node tests/project/run-tests.mjs`.

A capture whose `commit` does not resolve in the public repository is worse than
no capture: it claims evidence for code nobody can inspect. Re-shoot or drop it.
