"""Regression tests for Aegean-E developer profile and repository integrity."""

import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


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
            "NeuroCore",
            "Active Projects",
            "Research & Intellectual Themes",
            "Philosophy",
            "Stack",
            "Connect",
            "Cold-Start Quick Reference",
            "What's Inside",
        ]
        for heading in required_headings:
            with self.subTest(heading=heading):
                self.assertIn(heading, text)

    def test_funding_configuration(self):
        funding_path = ROOT / ".github" / "FUNDING.yml"
        self.assertTrue(funding_path.is_file())
        content = funding_path.read_text(encoding="utf-8")
        self.assertIn("github: [Aegean-E]", content)
        self.assertIn("patreon: Aegean-E", content)

    def test_project_links_well_formed(self):
        text = (ROOT / "README.md").read_text(encoding="utf-8")
        urls = re.findall(r"https?://[^\s)\]]+", text)
        self.assertGreater(len(urls), 5)
        for url in urls:
            with self.subTest(url=url):
                self.assertTrue(url.startswith("https://") or url.startswith("http://"))

    def test_aikit_memory_intact(self):
        aikit_dir = ROOT / ".aikit"
        self.assertTrue(aikit_dir.is_dir())
        self.assertTrue((aikit_dir / "project.json").is_file())
        self.assertTrue((aikit_dir / "guidelines.md").is_file())
        self.assertTrue((aikit_dir / "decisions.md").is_file())
        self.assertTrue((aikit_dir / "task_ledger.json").is_file())

        project_json = json.loads((aikit_dir / "project.json").read_text(encoding="utf-8"))
        self.assertEqual(project_json.get("name"), "aegean-e")


if __name__ == "__main__":
    unittest.main()
