"""Regression tests for the AegeanWorks profile, site and licensing integrity."""

import json
import re
import unittest
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
        self.assertIn("Aegean License 1.1 (AL-1.1)", readme)
        self.assertIn("Aegean Commercial License 1.0 (ACL-1.0)", readme)
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


if __name__ == "__main__":
    unittest.main()
