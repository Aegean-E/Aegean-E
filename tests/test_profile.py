"""Regression tests for the AegeanWorks profile, site and licensing integrity."""

import json
import re
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PUBLIC_REPOS = {
    "aegean-licensing",
    "AIKit",
    "aldervale",
    "assay",
    "chronos",
    "crypt-crawler",
    "cyberpulse",
    "fluid-universe",
    "fold",
    "gauge",
    "lacon",
    "lattice",
    "MemoryReconstruction",
    "mnemo",
    "muse",
    "N1-Engine",
    "NeuralBeat",
    "NeuralDeck",
    "NeuroCore",
    "NeurologyClinicTemplates-TR",
    "NeuroOptic",
    "NobetWizard",
    "NoMoreClutter",
    "orrery",
    "pebble",
    "photo-harbor",
    "PNN",
    "primordia",
    "prism-relay",
    "tally",
    "tempo",
    "ui-sandbox",
    "voidfarer",
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
        self.assertIn("Current releases use the Aegean family", html)
        self.assertIn("including its commercial permissions", html)
        readme = read_readme()
        self.assertIn("Current releases are free for personal use", readme)
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
                    "https://github.com/AegeanWorks/aegean-licensing/blob/master/licenses/"
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


if __name__ == "__main__":
    unittest.main()
