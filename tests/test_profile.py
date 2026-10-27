"""Regression tests for the AegeanWorks profile, site and licensing integrity."""

import base64
import hashlib
import json
import re
import unittest
from html import escape as html_escape, unescape as html_unescape
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PUBLIC_REPOS = {
    "Aegean-Licensing",
    "AIKit",
    "Aldervale",
    "Assay",
    "Chronos",
    "Crypt-Crawler",
    "Cyberpulse",
    "Fluid-Universe",
    "Fold",
    "Gauge",
    "Lacon",
    "Lattice",
    "MemoryReconstruction",
    "Mnemo",
    "Muse",
    "N1-Engine",
    "NeuralBeat",
    "NeuralDeck",
    "NeuroCore",
    "NeurologyClinicTemplates-TR",
    "NeuroOptic",
    "NobetWizard",
    "NoMoreClutter",
    "Orrery",
    "Pebble",
    "Photo-Harbor",
    "PNN",
    "Primordia",
    "Prism-Relay",
    "Tally",
    "Tempo",
    "UI-Sandbox",
    "Voidfarer",
}

CATEGORY_LABELS = {
    "ai": "AI &amp; Agents",
    "research": "Research",
    "health": "Health &amp; Neuro",
    "tools": "Developer Tools",
    "play": "Games &amp; Experiments",
}


def read_readme() -> str:
    return (ROOT / "README.md").read_text(encoding="utf-8")


def read_site() -> str:
    return (ROOT / "docs" / "index.html").read_text(encoding="utf-8")


def read_verify() -> str:
    return (ROOT / "docs" / "verify.html").read_text(encoding="utf-8")


def read_metadata() -> dict:
    return json.loads(
        (ROOT / "tests" / "metadata" / "repositories.json").read_text(encoding="utf-8")
    )


class ProfileIntegrityTests(unittest.TestCase):
    """Guard the profile structure, links, voice and configuration."""

    def test_readme_exists_and_non_empty(self):
        readme_path = ROOT / "README.md"
        self.assertTrue(readme_path.is_file())
        self.assertGreater(len(read_readme()), 100)

    def test_readme_sections_present(self):
        text = read_readme()
        for heading in (
            "What we build",
            "Featured systems",
            "Public project atlas",
            "Research threads",
            "Philosophy",
            "Toolbox",
            "License",
            "Connect",
            "Cold-Start Quick Reference",
        ):
            with self.subTest(heading=heading):
                self.assertIn(heading, text)

    def test_readme_categories_are_title_cased(self):
        text = read_readme()
        for label in (
            "Cognitive AI &amp; Agent Infrastructure",
            "Research &amp; Simulation",
            "Health, Neuro &amp; Personal Tools",
            "Developer Tools &amp; Utilities",
            "Games &amp; Playable Experiments",
        ):
            with self.subTest(label=label):
                self.assertIn(label, text)
        self.assertNotIn("Health, neuro", text)

    def test_readme_speaks_as_the_company(self):
        body = re.sub(r"```.*?```", "", read_readme(), flags=re.S)
        body = re.sub(r"https?://\S+", "", body)
        body = re.sub(r"[\w.+-]+@[\w-]+\.[\w.]+", "", body)
        self.assertNotRegex(body, r"\b(I|I'm|I’m|my|me|mine)\b")

    def test_banner_asset_present(self):
        banner_path = ROOT / "assets" / "banner.svg"
        self.assertTrue(banner_path.is_file())
        content = banner_path.read_text(encoding="utf-8")
        self.assertIn("<svg", content)
        self.assertIn("AEGEAN", content)

    def test_funding_configuration(self):
        funding_path = ROOT / ".github" / "FUNDING.yml"
        self.assertTrue(funding_path.is_file())
        content = funding_path.read_text(encoding="utf-8")
        self.assertIn("github: [AegeanWorks]", content)
        self.assertIn("patreon: Aegean-E", content)

    def test_only_public_repositories_are_linked(self):
        linked = set(
            re.findall(r"https://github\.com/AegeanWorks/([A-Za-z0-9._-]+)", read_readme())
        )
        self.assertTrue(linked)
        self.assertTrue(linked.issubset(PUBLIC_REPOS), linked - PUBLIC_REPOS)

    def test_readme_atlas_lists_every_public_repository(self):
        linked = set(
            re.findall(r"https://github\.com/AegeanWorks/([A-Za-z0-9._-]+)", read_readme())
        )
        self.assertEqual(linked, PUBLIC_REPOS)

    def test_license_matches_the_aikit_family(self):
        license_path = ROOT / "LICENSE"
        self.assertTrue(license_path.is_file())
        text = license_path.read_text(encoding="utf-8")
        self.assertTrue(text.startswith("# Aegean License 1.1 (AL-1.1)"))
        self.assertIn("SPDX identifier**: `LicenseRef-AL-1.1`", text)

        commercial = (ROOT / "COMMERCIAL.md").read_text(encoding="utf-8")
        self.assertIn("ACL-1.0", commercial)
        self.assertIn("AL-1.1", commercial)
        self.assertNotIn("AWCL", commercial)
        self.assertNotIn("AegeanWorks Commercial License (AWCL)", commercial)

        readme = read_readme()
        self.assertIn("AL-1.1 for software", readme)
        self.assertIn("AGL-1.1 for games", readme)
        self.assertIn("ASL-1.1 for research", readme)
        self.assertIn("Aegean Commercial License 1.0 (ACL-1.0)", readme)
        self.assertIn("licenses/CATALOG.md", readme)
        self.assertNotIn("badge/licensing-AGPL", readme)

    def test_site_entry_points_exist(self):
        docs = ROOT / "docs"
        for name in (
            "index.html",
            "styles.css",
            "app.js",
            "favicon.svg",
            "404.html",
            "robots.txt",
            "sitemap.xml",
            "site.webmanifest",
            "apple-touch-icon.png",
            "icon-192.png",
            "icon-512.png",
            ".nojekyll",
            "og.png",
        ):
            with self.subTest(file=name):
                self.assertTrue((docs / name).is_file())

    def test_site_is_self_contained(self):
        html = read_site()
        for asset in re.findall(r'(?:src|href)="([^"]+)"', html):
            if asset.startswith(("http://", "https://", "#", "mailto:")):
                continue
            with self.subTest(asset=asset):
                self.assertTrue((ROOT / "docs" / asset.split("#")[0]).exists())
        self.assertNotRegex(html, r'(?:src|href)="https?://(?:fonts|cdn|unpkg|jsdelivr)')

    def test_site_lists_every_public_repository_once(self):
        html = read_site()
        cards = re.findall(
            r'class="project reveal"[^>]*href="https://github\.com/AegeanWorks/([A-Za-z0-9._-]+)"',
            html,
        )
        self.assertEqual(len(cards), len(PUBLIC_REPOS))
        self.assertEqual(set(cards), PUBLIC_REPOS)

    def test_site_filter_counts_match_cards(self):
        html = read_site()
        for category, label in CATEGORY_LABELS.items():
            with self.subTest(category=category):
                self.assertIn(f">{label} <span>", html)
                count = len(re.findall(rf'class="project reveal" data-cat="{category}"', html))
                self.assertIn(f">{label} <span>{count}</span>", html)
        self.assertIn(f'All <span>{len(PUBLIC_REPOS)}</span>', html)

    def test_site_licensing_copy_is_current(self):
        html = read_site()
        for token in ("AL-1.1", "AGL-1.1", "ASL-1.1", "ACL-1.0"):
            with self.subTest(token=token):
                self.assertIn(token, html)
        self.assertIn("Aegean Commercial License 1.0", html)
        self.assertNotIn("GNU AGPL-3.0</h3>", html)
        self.assertNotIn("AGPL-3.0 with a commercial waiver", html)

    def test_licensing_copy_names_the_agpl_transition(self):
        html = read_site()
        self.assertIn("publishes source-available and open-source projects", html)
        self.assertIn("each repository's LICENSE governs", html)
        self.assertIn("including its commercial permissions", html)
        self.assertIn("Commercial terms where they apply.", html)
        readme = read_readme()
        self.assertIn("publishes source-available and open-source projects", readme)
        self.assertIn("each repository's LICENSE governs", readme)
        self.assertIn("including its commercial permissions", readme)

    def test_project_count_names_project_repositories(self):
        html = read_site()
        self.assertIn("Thirty-three project repositories, all public.", html)
        self.assertNotIn("Thirty-three repositories, all public.", html)
        self.assertIn("Every project repository below is public.", read_readme())

    def test_site_license_tiers_link_to_canonical_texts(self):
        html = read_site()
        for name in ("AL-1.1.md", "AGL-1.1.md", "ASL-1.1.md"):
            with self.subTest(name=name):
                self.assertIn(
                    "https://github.com/AegeanWorks/Aegean-Licensing/blob/master/licenses/"
                    + name,
                    html,
                )
        css = (ROOT / "docs" / "styles.css").read_text(encoding="utf-8")
        self.assertIn(".license-card li a {", css)

    def test_external_links_are_safe(self):
        html = read_site()
        for match in re.finditer(r"<a\b[^>]*target=\"_blank\"[^>]*>", html):
            with self.subTest(tag=match.group(0)[:80]):
                self.assertIn('rel="noopener"', match.group(0))

    def test_site_accessibility_basics(self):
        html = read_site()
        self.assertIn('<html lang="en"', html)
        self.assertIn('name="viewport"', html)
        self.assertIn('name="description"', html)
        self.assertIn('class="skip"', html)
        self.assertIn('aria-live="polite"', html)
        self.assertIn('role="status"', html)
        self.assertIn('<main id="main" tabindex="-1">', html)

    def test_site_works_without_javascript(self):
        html = read_site()
        self.assertNotIn('class="no-js"', html)
        self.assertIn('<noscript>', html)
        self.assertIn('class="noscript-nav"', html)
        self.assertIn('.nav-toggle{display:none!important}', html)
        css = (ROOT / "docs" / "styles.css").read_text(encoding="utf-8")
        self.assertIn(".noscript-nav {\n  display: none;", css)
        self.assertIn(".noscript-nav { display: flex; }", css)
        self.assertIn(".js .site-nav {", css)
        self.assertIn(".js .nav-toggle { display: block; }", css)
        self.assertIn(".js .reveal {", css)

    def test_site_degrades_open_when_the_script_fails(self):
        script = (ROOT / "docs" / "app.js").read_text(encoding="utf-8")
        self.assertIn('root.classList.add("js")', script)
        self.assertLess(
            script.index('root.classList.add("js")'),
            script.index('var reduceMotion'),
            "the js class must be added only after navigation and filtering setup",
        )
        css = (ROOT / "docs" / "styles.css").read_text(encoding="utf-8")
        self.assertIn("  .js .site-nav {", css)
        self.assertIn("  .js .site-header[data-open=\"true\"] .site-nav {", css)
        reduced = css.split("@media (prefers-reduced-motion: reduce)")[1]
        self.assertIn(".js .reveal", reduced)

    def test_hero_chip_is_exposed_to_assistive_tech(self):
        html = read_site()
        self.assertIn('<div class="hero-visual">', html)
        self.assertIn('<svg class="orbit" viewBox="0 0 520 520" aria-hidden="true">', html)
        self.assertIn("Local runtime", html)

    def test_social_metadata_is_complete(self):
        html = read_site()
        for token in (
            'property="og:image:type" content="image/png"',
            'property="og:locale" content="en_US"',
            'name="twitter:image:alt"',
            'name="twitter:creator" content="@Aegean_E"',
            'property="og:image:alt"',
            'name="twitter:card"',
            'name="robots" content="index,follow,max-image-preview:large"',
        ):
            with self.subTest(token=token):
                self.assertIn(token, html)

    def test_structured_data_describes_the_organization(self):
        html = read_site()
        match = re.search(
            r'<script type="application/ld\+json">\s*(\{.*?\})\s*</script>', html, re.S
        )
        self.assertIsNotNone(match)
        data = json.loads(match.group(1))
        self.assertEqual(data["@context"], "https://schema.org")
        nodes = {node["@type"]: node for node in data["@graph"]}
        organization = nodes["Organization"]
        website = nodes["WebSite"]
        self.assertEqual(organization["name"], "AegeanWorks")
        self.assertEqual(organization["url"], "https://aegeanworks.github.io/AegeanWorks/")
        self.assertIn("https://github.com/AegeanWorks", organization["sameAs"])
        self.assertEqual(website["publisher"]["@id"], organization["@id"])
        self.assertEqual(website["inLanguage"], "en")

    def test_filter_chips_control_the_project_grid(self):
        html = read_site()
        chips = re.findall(r'<button class="chip[^"]*"[^>]*>', html)
        self.assertEqual(len(chips), 6)
        for chip in chips:
            with self.subTest(chip=chip[:80]):
                self.assertIn('aria-controls="project-grid"', chip)
                self.assertIn('aria-pressed="', chip)
        self.assertIn('<div class="project-grid" id="project-grid">', html)

    def test_anchor_navigation_clears_the_sticky_header(self):
        css = (ROOT / "docs" / "styles.css").read_text(encoding="utf-8")
        self.assertIn("scroll-margin-top: 88px", css)
        self.assertIn("body.nav-open { overflow: hidden; }", css)
        self.assertIn("#main:focus { outline: none; }", css)
        self.assertIn("text-wrap: balance;", css)
        self.assertIn("text-wrap: pretty;", css)

    def test_discovery_files(self):
        docs = ROOT / "docs"
        robots = (docs / "robots.txt").read_text(encoding="utf-8")
        self.assertIn("User-agent: *", robots)
        self.assertIn(
            "Sitemap: https://aegeanworks.github.io/AegeanWorks/sitemap.xml", robots
        )
        sitemap = (docs / "sitemap.xml").read_text(encoding="utf-8")
        self.assertIn("<loc>https://aegeanworks.github.io/AegeanWorks/</loc>", sitemap)
        self.assertIsNotNone(ET.fromstring(sitemap))

    def test_social_image_has_the_expected_dimensions(self):
        png = (ROOT / "docs" / "og.png").read_bytes()
        self.assertEqual(png[:8], b"\x89PNG\r\n\x1a\n")
        width = int.from_bytes(png[16:20], "big")
        height = int.from_bytes(png[20:24], "big")
        self.assertEqual((width, height), (1200, 630))

    def test_not_found_page_is_noindexed(self):
        page = (ROOT / "docs" / "404.html").read_text(encoding="utf-8")
        self.assertIn('name="robots" content="noindex"', page)
        self.assertIn('href="/AegeanWorks/"', page)
        self.assertIn('name="description"', page)

    def test_web_app_manifest(self):
        manifest = json.loads(
            (ROOT / "docs" / "site.webmanifest").read_text(encoding="utf-8")
        )
        self.assertEqual(manifest["name"], "AegeanWorks")
        self.assertEqual(manifest["start_url"], "/AegeanWorks/")
        self.assertEqual(manifest["id"], "/AegeanWorks/")
        self.assertEqual(manifest["lang"], "en")
        self.assertEqual(manifest["dir"], "ltr")
        self.assertIn("productivity", manifest["categories"])
        self.assertEqual(manifest["display"], "standalone")
        self.assertEqual(manifest["shortcuts"][0]["url"], "/AegeanWorks/verify.html")
        sources = {icon["src"] for icon in manifest["icons"]}
        for expected in ("favicon.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png"):
            with self.subTest(expected=expected):
                self.assertIn(expected, sources)
        for icon in manifest["icons"]:
            with self.subTest(icon=icon["src"]):
                self.assertTrue((ROOT / "docs" / icon["src"]).is_file())

        html = read_site()
        self.assertIn('rel="manifest" href="site.webmanifest"', html)
        self.assertIn('rel="apple-touch-icon" sizes="180x180"', html)
        self.assertIn('sizes="192x192" href="icon-192.png"', html)

    def test_verify_page_has_a_no_javascript_path(self):
        page = read_verify()
        self.assertIn(".verify-form,.verify-register{display:none!important}", page)
        self.assertIn('<div class="verify-card verify-noscript">', page)
        self.assertIn("The public Python verifier below performs", page)
        self.assertIn('id="verify-submit" disabled', page)
        script = (ROOT / "docs" / "verify.js").read_text(encoding="utf-8")
        self.assertIn("submitButton.disabled = true", script)
        self.assertIn("submitButton.disabled = false", script)
        self.assertIn("refreshButton.disabled = false", script)

    def test_verifier_caps_fetches_before_reading(self):
        ui = (ROOT / "docs" / "verify.js").read_text(encoding="utf-8")
        self.assertIn("function readCapped", ui)
        self.assertIn("response.body.getReader()", ui)
        self.assertIn('response.headers.get("content-length")', ui)
        self.assertIn('credentials: "omit"', ui)
        self.assertIn('referrerPolicy: "no-referrer"', ui)
        self.assertIn("reader.cancel()", ui)

    def test_verifier_checks_types_before_canonicalization(self):
        core = (ROOT / "docs" / "verify-core.js").read_text(encoding="utf-8")
        self.assertIn("function typeError(certificate)", core)
        self.assertLess(core.index("const malformed = typeError(certificate)"), core.index("computed = await computeDigest(certificate)"))
        self.assertIn("Certificate payload cannot be canonicalized", core)

    def test_verifier_canonical_numbers_and_del_are_bounded(self):
        core = (ROOT / "docs" / "verify-core.js").read_text(encoding="utf-8")
        self.assertIn("Number.isSafeInteger(value)", core)
        self.assertIn("codePoint === 0x7f", core)
        self.assertIn('replace(/^\\uFEFF/, "")', core)
        self.assertIn("stringList(raw.scopes", core)
        self.assertIn("Terms registry must list at least one license", core)

    def test_verifier_explains_a_disabled_browser_crypto_path(self):
        script = (ROOT / "docs" / "verify.js").read_text(encoding="utf-8")
        self.assertIn("window.crypto", script)
        self.assertIn("crypto.subtle", script)
        self.assertIn("Web Crypto is not available", script)
        self.assertIn("state.termTexts.clear()", script)
        self.assertIn('"No canonical registry loaded."', script)
        css = (ROOT / "docs" / "styles.css").read_text(encoding="utf-8")
        self.assertIn(".btn:disabled", css)
        self.assertIn("cursor: not-allowed", css)

    def test_icon_dimensions(self):
        for name, expected in (
            ("apple-touch-icon.png", (180, 180)),
            ("icon-192.png", (192, 192)),
            ("icon-512.png", (512, 512)),
        ):
            with self.subTest(icon=name):
                png = (ROOT / "docs" / name).read_bytes()
                self.assertEqual(png[:8], b"\x89PNG\r\n\x1a\n")
                width = int.from_bytes(png[16:20], "big")
                height = int.from_bytes(png[20:24], "big")
                self.assertEqual((width, height), expected)

    def test_mobile_orbit_labels_are_large_enough(self):
        css = (ROOT / "docs" / "styles.css").read_text(encoding="utf-8")
        self.assertIn(".orbit .node text { font-size: 14px; }", css)
        self.assertIn("max-height: calc(100vh - 72px);", css)

    def test_print_media_reveals_every_section(self):
        css = (ROOT / "docs" / "styles.css").read_text(encoding="utf-8")
        self.assertIn("@media print {", css)
        block = css.split("@media print {", 1)[1]
        self.assertIn(".reveal,", block)
        self.assertIn("opacity: 1; transform: none; transition: none !important;", block)
        self.assertIn("print-color-adjust: exact", block)
        self.assertIn(".site-header,", block)
        self.assertIn(".filters,", block)

    def test_mobile_menu_is_opaque_and_single_github_entry(self):
        html = read_site()
        primary = re.search(r'<nav class="site-nav".*?</nav>', html, re.S).group(0)
        footer = re.search(
            r'<nav class="footer-col" aria-label="Site">.*?</nav>', html, re.S
        ).group(0)
        self.assertEqual(primary.count('class="nav-github"'), 1)
        self.assertEqual(footer.count('class="nav-github"'), 0)
        css = (ROOT / "docs" / "styles.css").read_text(encoding="utf-8")
        self.assertIn("background: #05080f;", css)
        self.assertIn("box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);", css)
        self.assertIn("body.nav-open::after", css)
        self.assertIn(".orbit { width: min(100%, 440px); }", css)

    def test_mobile_scrim_absorbs_taps(self):
        css = (ROOT / "docs" / "styles.css").read_text(encoding="utf-8")
        block = css.split("body.nav-open::after {")[1].split("}")[0]
        self.assertIn("z-index: 40;", block)
        self.assertIn("pointer-events: auto;", block)
        self.assertNotIn("pointer-events: none;", block)

    def test_open_menu_makes_the_page_behind_inert(self):
        script = (ROOT / "docs" / "app.js").read_text(encoding="utf-8")
        self.assertIn('document.querySelectorAll("main, .site-footer")', script)
        self.assertIn("region.inert = inert;", script)
        self.assertIn("setBackgroundInert(open);", script)

    def test_open_menu_contains_keyboard_focus(self):
        script = (ROOT / "docs" / "app.js").read_text(encoding="utf-8")
        self.assertIn("function menuFocusables()", script)
        self.assertIn("header.contains(active)", script)
        self.assertIn('event.key !== "Tab"', script)

    def test_header_links_close_the_open_menu(self):
        script = (ROOT / "docs" / "app.js").read_text(encoding="utf-8")
        header_block = script.split("if (header) {")[1].split("}")[0]
        self.assertIn('event.target.closest("a")', header_block)
        self.assertIn("setNav(false);", header_block)

    def test_license_identifiers_do_not_break_at_hyphens(self):
        html = read_site()
        self.assertIn('<span class="nw">ACL-1.0</span>', html)
        for identifier in ("AL-1.1", "AGL-1.1", "ASL-1.1"):
            with self.subTest(identifier=identifier):
                self.assertIn(f'<span class="nw">{identifier}</span>', html)
        css = (ROOT / "docs" / "styles.css").read_text(encoding="utf-8")
        self.assertIn(".nw { white-space: nowrap; }", css)

    def test_site_recovers_when_app_js_fails(self):
        html = read_site()
        self.assertIn("script-failed", html)
        css = (ROOT / "docs" / "styles.css").read_text(encoding="utf-8")
        self.assertIn(".script-failed .site-nav {", css)
        self.assertIn(".script-failed .nav-toggle { display: none; }", css)

    def test_noscript_nav_is_inside_the_sticky_header(self):
        html = read_site()
        header_start = html.index("<header")
        header_end = html.index("</header>")
        nav = html.index('class="noscript-nav"')
        self.assertLess(header_start, nav)
        self.assertLess(nav, header_end)

    def test_orbit_animation_is_centred(self):
        css = (ROOT / "docs" / "styles.css").read_text(encoding="utf-8")
        self.assertIn(".orbit-nodes", css)
        self.assertIn("transform-box: view-box", css)
        self.assertIn("transform-box: fill-box", css)
        self.assertIn("@keyframes spin-reverse", css)
        self.assertNotIn("transform-origin: 260px 260px", css)

    def test_hero_mark_is_centred_in_its_square(self):
        html = read_site()
        square = re.search(
            r'<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" rx="26"', html
        )
        self.assertIsNotNone(square)
        x, y, width, height = (int(value) for value in square.groups())
        self.assertEqual(x + width / 2, 260)
        self.assertEqual(y + height / 2, 260)

        waves = re.findall(r'<path d="M(\d+) (\d+)c7-6 15 6 23 0s15 6 23 0"', html)
        self.assertEqual(len(waves), 3)
        for start_x, _ in waves:
            self.assertEqual(int(start_x) + 23, 260)

    def test_aikit_memory_intact(self):
        aikit_dir = ROOT / ".aikit"
        for name in ("project.json", "guidelines.md", "decisions.md", "task_ledger.json"):
            with self.subTest(file=name):
                self.assertTrue((aikit_dir / name).is_file())

        project_json = json.loads((aikit_dir / "project.json").read_text(encoding="utf-8"))
        self.assertEqual(project_json.get("name"), "aegeanworks")

    def test_ci_workflow_runs_the_suite(self):
        workflow = ROOT / ".github" / "workflows" / "tests.yml"
        self.assertTrue(workflow.is_file())
        text = workflow.read_text(encoding="utf-8")
        self.assertIn("branches: [main]", text)
        self.assertIn("python -m unittest discover -s tests", text)
        self.assertIn("permissions:", text)
        self.assertIn("contents: read", text)

    def test_ci_workflow_runs_the_node_parity_suite(self):
        workflow = (ROOT / ".github" / "workflows" / "tests.yml").read_text(encoding="utf-8")
        self.assertIn("actions/setup-node", workflow)
        self.assertIn("node tests/verify/run-tests.mjs", workflow)

    def test_snapshot_covers_every_public_repository(self):
        metadata = read_metadata()
        self.assertEqual({repo["name"] for repo in metadata["repositories"]}, PUBLIC_REPOS)
        self.assertGreaterEqual(len(metadata["profile"]["description"]), 80)
        self.assertIn("local-first", metadata["profile"]["description"])

    def test_site_metadata_matches_the_github_profile(self):
        description = read_metadata()["profile"]["description"]
        html = read_site()
        self.assertIn(f'<meta name="description" content="{description}">', html)
        self.assertIn(f'<meta property="og:description" content="{description}">', html)
        self.assertIn(f'<meta name="twitter:description" content="{description}">', html)
        match = re.search(r'<script type="application/ld\+json">\s*(\{.*?\})\s*</script>', html, re.S)
        data = json.loads(match.group(1))
        organization = {node["@type"]: node for node in data["@graph"]}["Organization"]
        self.assertEqual(organization["description"], description)

    def test_project_cards_match_github_metadata(self):
        html = read_site()
        blocks = re.findall(r'<a class="project reveal".*?</a>', html, re.S)
        self.assertEqual(len(blocks), len(PUBLIC_REPOS))
        omitted = {"aikit", "python", "source-available"}
        for repo in read_metadata()["repositories"]:
            with self.subTest(repo=repo["name"]):
                marker = f'href="https://github.com/AegeanWorks/{repo["name"]}"'
                block = next((item for item in blocks if marker in item), None)
                self.assertIsNotNone(block)
                self.assertIn(f'<h3>{repo["name"]}</h3>', block)
                self.assertIn(
                    f'<p>{html_escape(repo["description"], quote=False)}</p>', block
                )
                self.assertIn('data-topics="' + ",".join(repo["topics"]) + '"', block)
                expected = [topic for topic in repo["topics"] if topic not in omitted][:6]
                self.assertEqual(
                    re.findall(r'<span class="tag">([^<]+)</span>', block), expected
                )

    def test_readme_atlas_matches_github_metadata(self):
        rows = dict(
            re.findall(
                r"\| \[([^\]]+)\]\(https://github\.com/AegeanWorks/[^)]+\) \| ([^|]+) \|",
                read_readme(),
            )
        )
        self.assertEqual(set(rows), PUBLIC_REPOS)
        for repo in read_metadata()["repositories"]:
            with self.subTest(repo=repo["name"]):
                self.assertEqual(rows[repo["name"]].strip(), repo["description"].strip())

    def test_verify_page_is_linked_and_complete(self):
        index = read_site()
        page = read_verify()
        self.assertIn('href="verify.html"', index)
        self.assertIn("Verify a license", index)
        self.assertIn(
            "aegeanworks.github.io/AegeanWorks/verify.html", read_readme()
        )
        for token in (
            'id="verify-form"',
            'id="certificate-input"',
            'id="verify-result"',
            "verify.js",
            "app.js",
            "styles.css",
        ):
            with self.subTest(token=token):
                self.assertIn(token, page)
        script = (ROOT / "docs" / "verify.js").read_text(encoding="utf-8")
        self.assertIn('from "./verify-core.js"', script)
        self.assertIn('aria-live="polite"', page)
        self.assertIn('role="status"', page)
        self.assertIn("certificate never leaves it", page)

    def test_verify_page_is_self_contained(self):
        page = read_verify()
        for asset in re.findall(r'(?:src|href)="([^"]+)"', page):
            if asset.startswith(("http://", "https://", "#", "mailto:")):
                continue
            with self.subTest(asset=asset):
                self.assertTrue((ROOT / "docs" / asset.split("#")[0]).exists())
        self.assertNotRegex(page, r'<script[^>]+src="https?://')
        self.assertNotRegex(page, r'<link[^>]+href="https?://(?:fonts|cdn|unpkg|jsdelivr)')
        self.assertIn('class="skip"', page)
        self.assertIn('<main id="main" tabindex="-1">', page)

    def test_verifier_reads_only_the_canonical_registry(self):
        core = (ROOT / "docs" / "verify-core.js").read_text(encoding="utf-8")
        hosts = set(re.findall(r"https?://([^/\"]+)", core))
        self.assertEqual(hosts, {"raw.githubusercontent.com"})
        self.assertIn("AegeanWorks/Aegean-Licensing/master/licenses/issued.json", core)
        self.assertIn("AegeanWorks/Aegean-Licensing/master/licenses/terms.json", core)
        self.assertIn("register.get(cert.cert_id)", core)

    def test_verifier_cannot_check_signatures(self):
        core = (ROOT / "docs" / "verify-core.js").read_text(encoding="utf-8")
        ui = (ROOT / "docs" / "verify.js").read_text(encoding="utf-8")
        for token in ("computeSignature", "crypto.subtle.sign", "secret_key", "signing.key"):
            with self.subTest(token=token):
                self.assertNotIn(token, core)
        self.assertIn("signature_verified: false", core)
        self.assertNotIn("X-Ops-Token", ui)

    def test_verifier_never_uploads_the_certificate(self):
        ui = (ROOT / "docs" / "verify.js").read_text(encoding="utf-8")
        for token in ('method: "POST"', "FormData", "XMLHttpRequest", "sendBeacon"):
            with self.subTest(token=token):
                self.assertNotIn(token, ui)

    def test_verifier_form_cannot_natively_submit(self):
        page = read_verify()
        self.assertIn('id="verify-form"', page)
        block = page.split('<script>', 1)[1]
        self.assertIn('verifyForm.addEventListener("submit"', block)
        self.assertIn("event.preventDefault();", block)
        self.assertIn('id="verify-submit"', page)

    def test_verifier_uses_text_nodes_only(self):
        ui = (ROOT / "docs" / "verify.js").read_text(encoding="utf-8")
        core = (ROOT / "docs" / "verify-core.js").read_text(encoding="utf-8")
        for token in ("innerHTML", "outerHTML", "insertAdjacentHTML", "document.write", "eval(", "new Function"):
            with self.subTest(token=token):
                self.assertNotIn(token, ui)
                self.assertNotIn(token, core)
        self.assertIn("textContent", ui)

    def test_site_ships_no_signing_material(self):
        for path in (ROOT / "docs").iterdir():
            if path.suffix not in {".html", ".js", ".css", ".json", ".xml", ".txt", ".webmanifest"}:
                continue
            text = path.read_text(encoding="utf-8")
            with self.subTest(file=path.name):
                self.assertNotRegex(text, r"-----BEGIN [A-Z ]*PRIVATE KEY-----")
                self.assertNotIn("AEGEAN_SIGNING_KEY", text)
                self.assertNotIn("ops-secret", text)

    def test_verification_vector_is_pinned(self):
        vector = json.loads(
            (ROOT / "tests" / "vectors" / "verification-vector.json").read_text(encoding="utf-8")
        )
        self.assertEqual(vector["certificate"]["digest"], vector["expected_digest"])
        self.assertRegex(vector["expected_digest"], r"^[0-9a-f]{64}$")
        self.assertIn("not an issued certificate", vector["note"])

    def test_sitemap_lists_the_verify_page(self):
        sitemap = (ROOT / "docs" / "sitemap.xml").read_text(encoding="utf-8")
        self.assertIn(
            "<loc>https://aegeanworks.github.io/AegeanWorks/verify.html</loc>", sitemap
        )
        self.assertIsNotNone(ET.fromstring(sitemap))

    def test_external_links_are_safe_on_every_page(self):
        for page in (read_site(), read_verify()):
            for match in re.finditer(r"<a\b[^>]*target=\"_blank\"[^>]*>", page):
                with self.subTest(tag=match.group(0)[:80]):
                    self.assertIn('rel="noopener"', match.group(0))

    def test_pages_send_a_content_security_policy(self):
        for name in ("index.html", "verify.html", "404.html"):
            page = (ROOT / "docs" / name).read_text(encoding="utf-8")
            with self.subTest(page=name):
                self.assertIn('http-equiv="Content-Security-Policy"', page)
                policy = re.search(
                    r'http-equiv="Content-Security-Policy" content="([^"]*)"', page
                ).group(1)
                self.assertIn("form-action 'none'", policy)
                self.assertIn("object-src 'none'", policy)
                self.assertIn("base-uri 'none'", policy)
                script_src = re.search(r"script-src ([^;]*)", policy).group(1)
                self.assertNotIn("'unsafe-inline'", script_src)
                self.assertNotIn("https://", script_src)
                inline = re.findall(
                    r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", page, re.S
                )
                for body in inline:
                    digest = base64.b64encode(
                        hashlib.sha256(body.encode("utf-8")).digest()
                    ).decode("ascii")
                    with self.subTest(hash=digest[:12]):
                        self.assertIn("'sha256-" + digest + "'", script_src)
                external = re.findall(r"<script[^>]*\bsrc=\"([^\"]+)\"", page)
                for source in external:
                    with self.subTest(source=source):
                        self.assertTrue(source.startswith("./") or source.startswith("/") or "://" not in source)
        verify = read_verify()
        self.assertIn(
            "connect-src 'self' https://raw.githubusercontent.com", verify
        )


if __name__ == "__main__":
    unittest.main()
