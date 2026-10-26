# Decisions

Why this project is built the way it is, oldest first. One entry per decision that changes a
contract, a dependency, a data format or the architecture; IDs are consecutive and never reused.

### ADR-001: AIKit Cockpit Integration and Profile Regression Testing
- **Date**: 2026-10-25
- **Status**: Accepted
- **Context**: Aegean-E is the GitHub profile repository for the account, housing developer information, project links and sponsorship configurations. It lacked AIKit workspace memory, automated regression gates, and standardized navigation references.
- **Decision**: Integrate Aegean-E with AIKit cockpit architecture, add `.aikit/` governance memory, introduce `tests/test_profile.py` verifying document integrity and link validity via Python stdlib `unittest`, and establish cold-start quick references and structure catalog in `README.md`.
- **Consequences**: Aegean-E passes all Phase 4 verification gates (hygiene, guidelines, secrets, tests); changes are trackable and recoverable through AIKit ledger and disruption recovery.

### ADR-002: Rename the profile project to AegeanWorks
- **Date**: 2026-10-26
- **Status**: Accepted
- **Context**: The GitHub account is now AegeanWorks, while the profile project, folder, links, funding configuration, and commercial-license document still used the Aegean-E identity. The old profile also mixed a private-era structure with third-party stats cards and did not state which repositories were public.
- **Decision**: Rename the project folder to `AegeanWorks`, rewrite `README.md` around an original SVG banner and a curated public project atlas, update every repository link to `github.com/AegeanWorks`, and switch funding and licensing references to the AegeanWorks identity. Keep the Patreon handle as `Aegean-E` because `patreon.com/AegeanWorks` does not exist.
- **Consequences**: The profile now reflects the current account, mentions only repositories verified public through the GitHub API, and remains guarded by static link allowlist tests.

### ADR-003: Static GitHub Pages site under docs/
- **Date**: 2026-10-26
- **Status**: Accepted
- **Context**: AegeanWorks had no web presence outside GitHub, and the profile spoke as a single developer while the brand now presents as a studio. GitHub Pages on a public repository can serve any static file tree without a build step.
- **Decision**: Publish the site from `main` / `docs` with `.nojekyll`, plain HTML, CSS, and one small JavaScript file. Keep every asset local (no fonts, CDNs, trackers, or analytics), generate `og.png` from a local source page, and mark outbound links with `hygiene: allow` comments because the hygiene gate treats every absolute URL in a static asset as a third-party load.
- **Consequences**: The site is deployable by branch and folder alone, loads with no third-party requests, presents all 33 public repositories, and the profile and site share one visual identity. Outbound-link markers are deliberate and named.

### ADR-004: Adopt the Aegean License 1.1 family
- **Date**: 2026-10-26
- **Status**: Accepted
- **Context**: AIKit moved its seeded and pinned licenses from AL/AGL/ASL 1.0 to 1.1 and kept 1.0 recognised as legacy (AIKit ADR-221). The profile repository had no `LICENSE` at all and `COMMERCIAL.md` described an invented "AWCL" that no Aegean project uses.
- **Decision**: Seed the repository through `python aikit.py license AegeanWorks --set software`, which writes the canonical AL-1.1 text and the README License section, and replace `COMMERCIAL.md` with the canonical ACL-1.0 terms. State the family on the site: AL-1.1 for software, AGL-1.1 for games, ASL-1.1 for research, ACL-1.0 for commercial use. Keep the historical note that published AGPL-3.0 versions retain that grant.
- **Consequences**: The repository now carries a real, pinned license consistent with every other Aegean project, and the profile, site, tests and commercial terms agree. No AWCL text remains.

### ADR-005: Centre the hero mark and orbit the labels
- **Date**: 2026-10-26
- **Status**: Accepted
- **Context**: The hero diagram's wave mark began at x=226 and ended at x=272, so its centre was 249 while the containing square was centred at 260 — the logo read as visibly shifted. The rotating dashed ring used `transform-origin: 260px 260px`, which CSS resolves against the element's own box, so the ring orbited off-centre.
- **Decision**: Centre the three wave paths on the square (237 to 283), move the four capability labels into an `.orbit-nodes` group that rotates about the SVG view box centre, and counter-rotate each label with `transform-box: fill-box` so the text stays upright. Animate slowly (72s per revolution) and stop entirely under `prefers-reduced-motion`.
- **Consequences**: The mark is mathematically centred, the ring stays concentric, and the labels circle the core without becoming unreadable. Tests assert the geometry and the transform-box contract.

### ADR-006: Remove the no-JS reflow and keep a no-JS navigation
- **Date**: 2026-10-26
- **Status**: Accepted
- **Context**: Lighthouse measured CLS 0.163 on mobile. The cause was the `no-js` bootstrap: the header rendered a static navigation row before `app.js` removed the class and switched the menu to a fixed hidden panel, shifting the whole page. The fallback also existed only for the brief pre-script state, not for a failed script.
- **Decision**: Drop the `no-js` class entirely, gate reveal animations on a `.js` class added by `app.js`, and provide a real `<noscript>` navigation bar with a head-level style that hides the inert toggle. Keep the diagram decorative with `aria-hidden` on the SVG only so the “Local runtime” chip stays readable, lock body scroll while the mobile menu is open, give `main` `tabindex="-1"` for skip-link focus, and wrap the observer in a fallback that reveals everything on failure.
- **Consequences**: CLS falls to 0 and Lighthouse scores 100 across performance, accessibility, best practices and SEO locally. With JavaScript disabled or blocked, the page still exposes navigation, and no content depends on script success. A further pass made the mobile menu fail open: it is visible until `app.js` adds `.js`, so a failed script leaves a usable menu instead of a dead toggle.

### ADR-007: Add installable icons and widen mobile orbit labels
- **Date**: 2026-10-26
- **Status**: Accepted
- **Context**: The site had only an SVG favicon, and a manifest without installable raster icons would be incomplete. The orbit labels also rendered at roughly 7.5 CSS pixels on a 390px screen.
- **Decision**: Generate 180, 192 and 512px PNG icons from the favicon, publish `site.webmanifest` with local icons and an `/AegeanWorks/` scope, link the manifest and icons, and raise the orbit label font to 14px under 640px. Add a `vh` fallback before `dvh` for older browsers.
- **Consequences**: The site is installable with proper icons, mobile labels are legible, and tests assert icon dimensions, manifest entries and the mobile rule.

### ADR-008: Opaque mobile menu and a single GitHub entry
- **Date**: 2026-10-26
- **Status**: Accepted
- **Context**: A visual review found two defects. The open mobile menu used `rgba(5, 8, 15, 0.98)`, which let the hero headline show through; and an earlier automated edit removed the mobile GitHub link from the primary navigation while leaving a duplicate in the footer's Site column.
- **Decision**: Make the mobile panel fully opaque with a drop shadow, keep exactly one `.nav-github` entry and assert its location in tests, widen the phone diagram to the full column, and prevent license identifiers such as ACL-1.0 from splitting at a hyphen.
- **Consequences**: The menu reads as a surface rather than a tint, the footer matches its five-link sitemap, and legal identifiers stay intact when wrapping.

### ADR-009: Link license tiers and dim the page behind the menu
- **Date**: 2026-10-26
- **Status**: Accepted
- **Context**: An independent review pointed out that AGL-1.1 and ASL-1.1 appeared on the site without any route to their text, that the README named only AL-1.1 and ACL-1.0, and that the open menu still looked like part of the hero because the page behind it stayed at full brightness.
- **Decision**: Link each personal-use tier to its canonical file in `aegean-licensing`, restate the three-tier family and catalog in the README, and add a `body.nav-open::after` scrim below the header while the mobile menu is open.
- **Consequences**: Every license named on the site resolves to an authoritative text, the profile and site describe the same family, and the menu reads as a separate surface.
