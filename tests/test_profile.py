"""Regression tests for the AegeanWorks developer profile and repository integrity."""

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


class ProfileIntegrityTests(unittest.TestCase):
    """Guard the developer profile structure, links and configuration."""

    def test_readme_exists_and_non_empty(self):
        readme_path = ROOT / "README.md"
        self.assertTrue(readme_path.is_file())
        text = readme_path.read_text(encoding="utf-8")
        self.assertGreater(len(text), 100)

    def test_readme_sections_present(self):
        text = (ROOT / "README.md").read_text(encoding="utf-8")
        required_headings = [
            "What we build",
            "Featured systems",
            "Public project atlas",
            "Research threads",
            "Philosophy",
            "Toolbox",
            "Connect",
            "Cold-Start Quick Reference",
        ]
        for heading in required_headings:
            with self.subTest(heading=heading):
                self.assertIn(heading, text)

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

    def test_project_links_well_formed(self):
        text = (ROOT / "README.md").read_text(encoding="utf-8")
        urls = re.findall(r"https?://[^\s)\]]+", text)
        self.assertGreater(len(urls), 5)
        for url in urls:
            with self.subTest(url=url):
                self.assertTrue(url.startswith("https://") or url.startswith("http://"))

    def test_only_public_repositories_are_linked(self):
        text = (ROOT / "README.md").read_text(encoding="utf-8")
        linked = set(
            re.findall(r"https://github\.com/AegeanWorks/([A-Za-z0-9._-]+)", text)
        )
        self.assertTrue(linked)
        self.assertTrue(linked.issubset(PUBLIC_REPOS), linked - PUBLIC_REPOS)

    def test_readme_speaks_as_the_company(self):
        text = (ROOT / "README.md").read_text(encoding="utf-8")
        body = re.sub(r"```.*?```", "", text, flags=re.S)
        body = re.sub(r"https?://\S+", "", body)
        body = re.sub(r"[\w.+-]+@[\w-]+\.[\w.]+", "", body)
        self.assertNotRegex(body, r"\b(I|I'm|I’m|my|me|mine)\b")

    def test_site_entry_points_exist(self):
        docs = ROOT / "docs"
        for name in ("index.html", "styles.css", "app.js", "favicon.svg", "404.html", ".nojekyll", "og.png"):
            with self.subTest(file=name):
                self.assertTrue((docs / name).is_file())

    def test_site_is_self_contained(self):
        html = (ROOT / "docs" / "index.html").read_text(encoding="utf-8")
        local_assets = re.findall(r'(?:src|href)="([^"]+)"', html)
        for asset in local_assets:
            if asset.startswith(("http://", "https://", "#", "mailto:")):
                continue
            with self.subTest(asset=asset):
                self.assertTrue((ROOT / "docs" / asset.split("#")[0]).exists())
        self.assertNotRegex(html, r'(?:src|href)="https?://(?:fonts|cdn|unpkg|jsdelivr)')

    def test_site_lists_every_public_repository_once(self):
        html = (ROOT / "docs" / "index.html").read_text(encoding="utf-8")
        cards = re.findall(r'class="project reveal"[^>]*href="https://github\.com/AegeanWorks/([A-Za-z0-9._-]+)"', html)
        self.assertEqual(len(cards), len(PUBLIC_REPOS))
        self.assertEqual(set(cards), PUBLIC_REPOS)

    def test_site_accessibility_basics(self):
        html = (ROOT / "docs" / "index.html").read_text(encoding="utf-8")
        self.assertIn('<html lang="en"', html)
        self.assertIn('name="viewport"', html)
        self.assertIn('name="description"', html)
        self.assertIn('class="skip"', html)
        self.assertIn('aria-live="polite"', html)

    def test_aikit_memory_intact(self):
        aikit_dir = ROOT / ".aikit"
        self.assertTrue(aikit_dir.is_dir())
        self.assertTrue((aikit_dir / "project.json").is_file())
        self.assertTrue((aikit_dir / "guidelines.md").is_file())
        self.assertTrue((aikit_dir / "decisions.md").is_file())
        self.assertTrue((aikit_dir / "task_ledger.json").is_file())

        project_json = json.loads((aikit_dir / "project.json").read_text(encoding="utf-8"))
        self.assertEqual(project_json.get("name"), "aegeanworks")


if __name__ == "__main__":
    unittest.main()
