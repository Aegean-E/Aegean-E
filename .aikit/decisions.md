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

### ADR-010: Fail safe when the script never arrives
- **Date**: 2026-10-26
- **Status**: Accepted
- **Context**: With `app.js` blocked, the fail-open menu stayed fixed and permanently open because nothing could close it, and the no-JS navigation sat outside the sticky header. A visual review also found the `Al` monogram for aegean-licensing read as `AI`.
- **Decision**: Move the `<noscript>` navigation inside the header so it stays sticky, add a small inline watchdog that marks the document `script-failed` after 2.5 seconds if `.js` never appears, and style that state as a compact wrapped nav row with no toggle. `app.js` clears the fallback class as soon as it runs. Rename the monogram to `AL`.
- **Consequences**: A missing or blocked script still leaves a normal, readable navigation bar instead of a permanent overlay, and the no-JS bar sticks with the header. Both fallbacks are tested and visually verified.

### ADR-011: Balance section headings and clear the social card
- **Date**: 2026-10-26
- **Status**: Accepted
- **Context**: Visual review showed orphaned heading lines ("…studio / thinks.", "…to / be answered.") and the social card's meta row sat on top of the decorative wave strokes.
- **Decision**: Apply `text-wrap: balance` to section headings and `text-wrap: pretty` to ledes, and move the OG waves lower and lighter so the metadata row reads cleanly.
- **Consequences**: Headings wrap into even lines at every width, paragraphs avoid single-word last lines, and the social card has a clean footer band without changing its content.

### ADR-012: Make the open mobile menu a modal surface
- **Date**: 2026-10-26
- **Status**: Accepted
- **Context**: A behavioural review of the last five pushes measured the open menu at 390x844. The scrim had `pointer-events: none`, so a hit test at (120, 500) returned the hero's "Explore the projects" button; tapping the dimmed area navigated to `#projects` instead of dismissing the menu. Tab also reached the page beneath the panel.
- **Decision**: Let the scrim absorb pointer input (`pointer-events: auto`, opacity 0.68), mark `main` and `.site-footer` as `inert` while the menu is open, and wrap Tab and Shift+Tab within the header's visible controls so focus cannot reach the page beneath. `setNav` clears the inert state on every close path. Tests assert the scrim and inert contracts.
- **Consequences**: A tap anywhere outside the header now dismisses the menu without activating the page beneath, and keyboard focus stays inside the brand, toggle and menu links until the menu closes. Browsers without `inert` still get pointer dismissal because the scrim captures the tap; the menu never changes the URL.

### ADR-013: Name the AGPL transition and the repository count precisely
- **Date**: 2026-10-26
- **Status**: Accepted
- **Context**: The site claimed that any commercial or organisational use needs ACL-1.0, but most published repositories still carry AGPL-3.0 on GitHub, and AGPL already permits commercial use. The site also called 33 project repositories simply "repositories", while the GitHub API reports 34 public repositories including this profile repository.
- **Decision**: Qualify the claim to "current releases" under the Aegean family, state that versions already published under GNU AGPL-3.0 keep that grant including its commercial permissions, change the strip to "Aegean 1.1", and say "project repositories" on both the site and the README. Tests pin the new wording.
- **Consequences**: The umbrella page is true for both current Aegean releases and historical AGPL releases, and it distinguishes the 33 project repositories from the profile repository visitors are reading.

### ADR-014: Gate the profile in GitHub Actions
- **Date**: 2026-10-26
- **Status**: Accepted
- **Context**: The regression suite was only run locally, so a broken link count, asset path or fallback contract could reach `main` unnoticed.
- **Decision**: Add `.github/workflows/tests.yml` for pushes to `main`, pull requests and manual runs; use Python 3.12, `unittest`, read-only `contents` permission and concurrency cancellation. A test asserts the workflow still runs the canonical command.
- **Consequences**: Every change gets a status check without adding a runtime dependency, while the local command remains the canonical gate. The first run on `main` was refused before any step started — the account-level message was "The job was not started because your account is locked due to a billing issue" — so a red `tests` check on this repository means the account is blocked, not that the suite failed; the same message appears on the studio's other repositories.

### ADR-015: Give the manifest a stable identity
- **Date**: 2026-10-26
- **Status**: Accepted
- **Context**: The web manifest declared a name, scope and icons but no `id`, language, direction or categories. Installers derive identity from `start_url` when `id` is absent, so a future URL change could create a second installed app.
- **Decision**: Declare `id` as `/AegeanWorks/`, `lang` as `en`, `dir` as `ltr` and categories `productivity`, `education`, `utilities`; assert them in the manifest test.
- **Consequences**: Installed copies keep a stable identity and expose language metadata, with no new asset or runtime dependency.

### ADR-016: Describe the studio in structured data and label the filters
- **Date**: 2026-10-26
- **Status**: Accepted
- **Context**: Search engines had Open Graph and Twitter metadata but no machine-readable description of the studio, its canonical URL, social profiles or publisher relationship. The filter chips changed the visible project grid without telling assistive technology which region they control, and the "Read the license" button led only to AL-1.1 while its card covers three licenses.
- **Decision**: Publish an `Organization` and `WebSite` JSON-LD graph with absolute URLs, the GitHub and X profiles, and the contact address; add `aria-controls="project-grid"` to every chip; and point the personal-tier button at the license catalog as "Compare the licenses". Tests parse the JSON-LD, check every chip, and check the canonical tier links.
- **Consequences**: Crawlers can identify the studio and its publisher relationship without guessing from HTML, the filter buttons announce their target region, and the button under a three-license card leads to the comparison instead of a single text.

### ADR-017: Reveal content and preserve contrast in print
- **Date**: 2026-10-27
- **Status**: Accepted
- **Context**: Every `.reveal` element starts at `opacity: 0` and only becomes visible after `IntersectionObserver` fires. A printed page or PDF built before or without those observations can therefore omit sections. The dark palette also prints poorly when a browser drops background colours: light text lands on white paper. A print-media check found 48 unrevealed blocks before the print rules settled.
- **Decision**: Add an `@media print` block that forces `.reveal` visible with no transition, sets `print-color-adjust: exact` so the dark palette and contrast survive, and removes the sticky header, filters, decorative grid, aurora, toggle and skip link. A regression test pins the rules and a PDF render verifies zero hidden blocks.
- **Consequences**: Printing or exporting to PDF keeps every section and the intended contrast without the interactive chrome; screen rendering is unchanged.

### ADR-018: Qualify the license family per repository and release
- **Date**: 2026-10-27
- **Status**: Accepted
- **Context**: The umbrella copy said current releases use the Aegean family, but a GitHub API check found AGPL-3.0 on most repositories, Apache-2.0 on N1-Engine, MIT on NeurologyClinicTemplates-TR, and no LICENSE file at all on PNN. The blanket claim was therefore false for several public repositories.
- **Decision**: State that AegeanWorks publishes source-available and open-source projects; name AL-1.1 for software, AGL-1.1 for games, ASL-1.1 for research and ACL-1.0 for commercial use; name GNU AGPL-3.0, Apache-2.0 and MIT as observed alternatives; and say that each repository's LICENSE governs. Retitle the section "Free for personal work. Commercial terms where they apply." and keep the historical AGPL grant note. Tests pin both the site and README wording.
- **Consequences**: The licensing section is true for every public repository, including unlicensed and OSI-licensed outliers; the heading no longer implies that every commercial use needs a paid license; no per-repository license or certificate changes.

### ADR-019: Verify Licenses in the Browser Without a Signing Capability
- **Date**: 2026-10-27
- **Status**: Accepted
- **Context**: Holders of a commercial certificate need a public way to check it. The signing key is an HMAC secret held only by AegeanWorks, so no public verifier can check the signature; publishing the key would let anyone mint a certificate. A browser verifier must therefore rest on the public register, must not accept a register supplied with the certificate, and must never render certificate text as HTML.
- **Decision**: Add `verify.html` with `verify-core.js` (canonicalization, digest, type checks, terms and register status) and `verify.js` (UI and canonical fetch). Fetch only `licenses/issued.json`, `licenses/terms.json` and the cited agreement from the `Aegean-Licensing` repository over HTTPS; require an id-and-digest match in the register; cap every response while streaming; send no certificate data; use text nodes only; block native form submission in an inline guard so a failed module cannot put the certificate in a URL; expose a no-JavaScript path and a CLI alternative. The status order is published in `licenses/VERIFICATION.md` and pinned by a Node parity suite against a Python-generated vector. The site contains no signing code and tests forbid signature primitives and key paths.
- **Consequences**: Copying or editing the page cannot create a certificate: validity still depends on a register entry that only the repository owner can publish, and the private HMAC check remains in ops. The page cannot prove its own integrity to a user who did not audit it, so it links the canonical specification and CLI. The trust root is the GitHub repository's write access, which must stay with the owner; a forged register entry would be visible as a repo change.

### ADR-020: Mirror GitHub Titles, Topics and Descriptions From a Pinned Snapshot
- **Date**: 2026-10-27
- **Status**: Accepted
- **Context**: Project titles, descriptions and topics were updated on GitHub, while the site cards and the README atlas carried older prose and lowercase repository names. A live fetch at build time would make tests network-dependent and let an upstream edit change the site silently.
- **Decision**: Add `tests/metadata/repositories.json`, captured from the GitHub API, as the reviewable source of truth. Rewrite every project card's title, description and `data-topics`, show six non-boilerplate tags per card, canonicalize repository-name casing in links, and rebuild the README atlas rows from the same snapshot. Tests compare every card and row to the snapshot; refreshing the snapshot is an explicit review step.
- **Consequences**: The site, README and GitHub agree at the recorded snapshot date without a network dependency in CI. A future GitHub edit requires refreshing the snapshot deliberately; the card tags are a curated view of the full topics stored in `data-topics`.

### ADR-021: Fail Closed in Verifier Edge States
- **Date**: 2026-10-27
- **Status**: Accepted
- **Context**: The verifier's primary action was disabled while the registry loaded, but the disabled state looked identical to an active gradient button. A browser without Web Crypto could load the page and only fail after a click. A terms registry with string scopes or no licenses was accepted by the browser but rejected by the Python reference, and a cached agreement text survived a refresh.
- **Decision**: Give disabled buttons a visible, non-interactive treatment; detect missing Web Crypto before fetching and point to the CLI; require array-valued scopes/tiers/allowances and a non-empty license registry; clear cached agreement text on refresh; strip a UTF-8 BOM from pasted or loaded certificates. Tests pin each edge and the Node parity suite covers the canonicalization rules.
- **Consequences**: Every unavailable state is visible before a user acts, the browser and Python refuse the same malformed registry, and a refreshed registry cannot silently reuse an old agreement. Normal certificate and registry shapes are unchanged.
- Cross-principle check: no principle section changed. Serves PRINCIPLE-011 (clear errors) and PRINCIPLE-014 (regression coverage).

### ADR-022: Validate the Scope Before Trusting a Certificate
- **Date**: 2026-10-27
- **Status**: Accepted
- **Context**: The browser verifier parsed the agreement's `scopes` vocabulary but never used it, while it did check tiers and allowances. A certificate with an arbitrary scope could therefore pass the browser check even though issuance would never produce one.
- **Decision**: Reject a certificate whose non-empty scope is not in the resolved agreement's `scopes` list, at the same point as the tier and allowance checks. Node tests cover the browser path and the published specification lists the check.
- **Consequences**: The browser and the Python reference agree on scope, and the page refuses a scope the agreement does not define. Existing certificates are unaffected because their scopes are issued from that vocabulary.
- Cross-principle check: no principle section changed. Serves PRINCIPLE-003 (strict claims) and PRINCIPLE-014 (regression coverage).

### ADR-023: Send a Content Security Policy on Every Page
- **Date**: 2026-10-27
- **Status**: Accepted
- **Context**: The site had no Content Security Policy, so any injected markup could load a remote script or send a request anywhere. The verifier page handles untrusted certificate text and fetches the canonical registry; a policy can bound both even though the page only uses text nodes.
- **Decision**: Add a meta CSP to `index.html`, `verify.html` and `404.html`: scripts only from self or an exact SHA-256 hash of each inline block, styles from self or inline (needed by the no-script and 404 rules), images from self or data, connections only to self and `raw.githubusercontent.com`, forms disabled, and base/object URLs disabled. Tests recompute every inline hash and reject `unsafe-inline` in `script-src`; browser runs produced no CSP violations.
- **Consequences**: An injected resource cannot load from a third-party origin or POST a certificate anywhere, and a native form submission is blocked even if the verifier script fails. `frame-ancestors` cannot be set from a meta policy, so clickjacking protection still depends on a server header that GitHub Pages does not provide; this limitation is recorded rather than hidden.
- Cross-principle check: no principle section changed. Serves PRINCIPLE-019 (sensitive-data hygiene) and PRINCIPLE-014 (regression coverage).

### ADR-024: Keep the Project Atlas Current From the Public GitHub API
- **Date**: 2026-10-27
- **Status**: Accepted
- **Context**: Every project card and the README atlas came from a snapshot refreshed by hand. New or renamed public repositories, description edits and topic changes were invisible on the website until someone edited HTML and committed it. The site is static GitHub Pages and the account's Actions are billing-locked, so a build job cannot supply the data. The site must still work without JavaScript and for crawlers.
- **Decision**: Add tlas-core.js (pure validation, filtering, category inference, pagination and cache rules, sync planning) and tlas.js (fetch, session cache, DOM reconciliation). At load the page requests https://api.github.com/users/AegeanWorks/repos?per_page=100&type=public, matches cards by immutable repository id (falling back to name for older markup), updates title, description, topics, link and monogram, adds new repositories, hides repositories that stop being public, and updates counts and filters. The static snapshot and cards remain the no-JavaScript and failure fallback. A complete response is cached for ten minutes in session storage; rate limits, timeouts and network errors keep the snapshot and label the state. Untrusted text is set with 	extContent; links are rebuilt from a validated repository name; the CSP allows only pi.github.com.
- **Consequences**: The visible atlas follows GitHub automatically without a build step or a secret, while crawlers and no-JavaScript readers still get a complete static page. Curated categories stay stable for existing cards; only new repositories infer a category from their topics, so a curated re-categorisation is a deliberate edit. The snapshot must still be refreshed occasionally for the fallback and for search engine snapshots, and the social card count is static. The live request shares the visitor's IP with GitHub, which the footer now discloses; no certificate, form data or account credential is sent.
- Cross-principle check: no principle section changed. Serves PRINCIPLE-003 (evidence over claims), PRINCIPLE-011 (clear failure states) and PRINCIPLE-019 (no credentials).

### ADR-025: Searchable Atlas, Local Dossiers and an Offline Trust Surface
- **Date**: 2026-10-27
- **Status**: Accepted
- **Context**: The live atlas exposed only five curated category chips, cards carried no language, license or freshness, and every card left the site. The verifier required a pasted certificate, and the site had no trust pages, installable shell or useful 404. Visitors could not narrow the atlas by text, topic or recency, could not inspect a project without GitHub, and lost the site when offline.
- **Decision**: Add `atlas-snapshot.json` as the fallback dataset and enrich every card with immutable repository id, language, license and pushed time; add search, sort, topic chips, keyboard shortcuts and URL state (`q`, `topic`, `cat`, `sort`) to `app.js`. Add `project.html` with `project-core.js`/`project.js`, which resolve a repository from the snapshot or the public API and render metadata plus a plain-text README excerpt. Extend the verifier with certificate-ID lookup, drag-and-drop, copy and JSON export. Publish security, privacy and accessibility pages plus `.well-known/security.txt`; register a service worker that precaches the shell, trust pages and snapshot and caches GitHub API reads; and deepen the 404 page and JSON-LD graph. All untrusted text stays text, CSP connect targets stay limited to the GitHub API and the raw registry, and the Python and Node suites pin every surface.
- **Consequences**: Visitors can find and deep-link projects, inspect one without leaving the site, check a certificate from its ID, read the trust pages offline and install the site as an app. The snapshot still has to be refreshed for the no-JavaScript and crawler path, the service-worker version must be raised when the shell changes, and the CSP hash list must be regenerated whenever inline blocks change.
- Cross-principle check: no principle section changed. Serves PRINCIPLE-003 (evidence over claims), PRINCIPLE-011 (clear failure states) and PRINCIPLE-019 (no credentials).

### ADR-026: One Search Row, One Discipline Row
- **Date**: 2026-10-27
- **Status**: Accepted
- **Context**: The portfolio section stacked a two-line intro, a GitHub button, a search row, six category chips with per-category counts, a scrollable row of up to sixteen topic chips with counts, and two status lines. The same repository total appeared in the intro, the "All" chip, the topic row and the atlas status, which made the shelf look busier than the cards it introduces.
- **Decision**: Reduce the section to a single-line intro, one search/sort/clear toolbar and one discipline row. Drop the topic chip row and every chip count; topic filtering remains available through the deep links on project dossiers and the `topic` URL parameter, and the search box still matches topic text. Make the atlas status count-free (`Live from GitHub · 14:03 UTC`, `Built-in snapshot`) so the filtered result line is the only place that reports how many cards are showing. Bump the service-worker cache version because the shell changed.
- **Consequences**: The portfolio opens with the cards instead of four rows of chrome, and each count appears once. Visitors lose the one-click topic shelf, so topic discovery now runs through search, dossier topic links and the tags printed on each card; restoring a chip row later is a markup change plus the removed builder.
- Cross-principle check: no principle section changed. Serves PRINCIPLE-012 (token and attention frugality) and PRINCIPLE-014 (regression coverage).

### ADR-027: Topic Chips Share the Discipline Row; Dossiers Get Commit-Stamped Media
- **Date**: 2026-10-27
- **Status**: Accepted
- **Context**: Removing the topic chip row left topic discovery to search and dossier tags only, while the discipline row had room to grow. Project dossiers also had no place for a logo or a screenshot, and the portfolio is about to start collecting real captures, so the page needs a stable slot and a rule that ties each capture to the code it shows.
- **Decision**: Render topic chips inside the existing `.filters` row after a hairline separator, styled as quiet dashed pills without counts; counts still rank which topics appear (12 at most, boilerplate excluded) so the row stays short. Add a dossier logo slot that falls back to the repository monogram, and a screenshot gallery above the README. Both are driven by one manifest per repository, `docs/media/<Name>.json` (`schema: 1`), whose logo and screenshot entries carry `src`, `alt`, optional `caption`, and, for captures, `commit`, `taken_at`, optional `viewport`/`width`/`height`. `project-core.js` validates every path (`media/` prefix, no `..` or `//`), commit (7-40 hex, shortened), date (real calendar day) and entry count (12); unknown schemas, mismatched repositories and malformed entries are dropped rather than guessed at. The gallery links the commit to its GitHub commit page, and `docs/media/README.md` records the capture workflow.
- **Consequences**: One chip row covers discipline and topics, and each dossier has a real home for a logo and evidence-quality screenshots whose commit is one click away. No capture exists yet, so both slots stay hidden until a manifest lands; a manifest whose commit does not resolve still renders, but the documented rule makes that a visible mistake. Images stay same-origin, so the CSP is unchanged and the service worker caches them on demand.
- Cross-principle check: no principle section changed. Serves PRINCIPLE-003 (evidence over claims), PRINCIPLE-012 (lean surfaces) and PRINCIPLE-019 (no credentials or remote assets).

### ADR-028: Name Each Repository's Aegean License Family
- **Date**: 2026-10-28
- **Status**: Accepted
- **Context**: GitHub reports every Aegean license as `NOASSERTION`, so the catalogue and the dossier rendered "Custom license" for all 35 repositories even though each one carries AL-1.1, AGL-1.1 or ASL-1.1. A visitor comparing projects could not tell a commercial-use software license from a DRM-free game license or a non-commercial science license, and the dossier's licence row was strictly less informative than the LICENSE file it points at.
- **Decision**: Add `LICENSE_FAMILIES` (short code plus full name) and a `REPO_LICENSES` ledger keyed by lower-case repository name in `docs/atlas-core.js`; `licenseLabel()` returns the family short code on cards and `Aegean Game License 1.1 (AGL-1.1)` on dossiers, and falls back to GitHub's SPDX value, then "Custom license". `normalizeRepo()` carries `license_family`, so a live GitHub response cannot overwrite the static label, and the search haystack and `data-license` attribute use the family. The ledger is committed data because GitHub cannot supply it; the Python suite derives its expectation from the same ledger and the Node suite pins the mapping, so a new repository without an entry fails the gates.
- **Consequences**: Every card and dossier names the license a visitor is actually bound by, and a live atlas refresh no longer regresses to "Custom license". Adding a repository requires one ledger line; changing a repository's license requires editing that line, which the tests catch if it is forgotten.
- Cross-principle check: no principle section changed. Serves PRINCIPLE-003 (evidence over claims) and PRINCIPLE-016 (code and knowledge in one change).

### ADR-029: Publish Reforge and Fix What the Full-Site Audit Found
- **Date**: 2026-10-28
- **Status**: Accepted
- **Context**: `Aegean-Reforge` had been published to the organisation but was missing from the catalogue, the snapshot, the JSON-LD graph, the README table and the license ledger, so the site claimed 34 projects while GitHub served 35. A full review of the last five pushes (headless Edge screenshots at 1440px and a true 390px iframe, axe-core at both widths, and a source read of every new module) also found: the privacy table cut off three columns on mobile, dossier README code blocks were scrollable but not keyboard-focusable, dossier social metadata stayed generic after rendering, the service-worker cache version lagged the shell, the trust-page footers omitted two legal links the home page had, dead topic-bar CSS survived the previous refactor, and `verify.js` used a literal for the terms-document cap that duplicated a core constant.
- **Decision**: Add Reforge to the metadata snapshot, atlas snapshot, JSON-LD `ItemList`, static card, README atlas, `PUBLIC_REPOS` and the license ledger, and give it accurate GitHub topics. Turn the privacy table into labelled blocks below 620px with `data-label` cells; give rendered `<pre>` blocks `tabIndex = 0` and a visible focus ring; write `og:title`, `og:description`, `og:url`, `twitter:title` and `twitter:description` when a dossier resolves; bump the service-worker shell to v4; add License catalog and Source to the trust-page legal footers; delete the dead topic-bar rules; and import `MAX_TERMS_BYTES` in the verifier. Tests pin the license ledger coverage, the shared legal footer, the labelled privacy cells, the focusable code blocks, the dossier metadata and the absence of the literal cap.
- **Consequences**: The catalogue, JSON-LD, README and snapshot agree on 35 public repositories, and Reforge's card classifies it as a developer tool. Narrow screens can read the privacy table, keyboard users can scroll code blocks, shared dossier links carry the project name, and every page shares one legal footer. The audit loop costs a local HTTP server and headless Edge; axe-core is fetched only for the audit, never shipped.
- Cross-principle check: no principle section changed. Serves PRINCIPLE-003 (claim matches evidence), PRINCIPLE-014 (regression coverage) and PRINCIPLE-016 (documentation kept in step).

### ADR-030: Close the Remaining Narrow-Screen Gaps
- **Date**: 2026-10-28
- **Status**: Accepted
- **Context**: The 390px review of the repaired pages found four residual issues: dossier README code blocks had a scroll container but no visible affordance (and no wrapping at narrow widths, so directory trees were clipped mid-annotation), the gallery metadata was set a step too small, the offline shell left an empty bordered block where the footer's logo and link columns would be, and the 404 link row used literal interpuncts so a wrap could leave a dangling separator.
- **Decision**: Wrap README code blocks at 640px and below with `white-space: pre-wrap` plus `overflow-wrap: anywhere`, keeping horizontal scrolling and a thin scrollbar above that width; raise `.gallery-meta` to 0.68rem; add a `footer-slim` variant that removes the empty grid and top rule on the offline shell; and render the 404 link row as a centered wrapping flex list without literal separators. Tests pin the wrapping rule, the slim footer and the absence of the literal separators.
- **Consequences**: Directory trees and long commands are readable at phone width instead of ending in an ellipsis, the offline page no longer looks like a broken card, and the 404 link row wraps cleanly. Horizontal scrolling remains available on wider screens where wrapping would distort a command.
- Cross-principle check: no principle section changed. Serves PRINCIPLE-003 (the page shows the real content) and PRINCIPLE-011 (a clear, usable failure surface).
