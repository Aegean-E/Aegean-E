import importlib.util
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOL = ROOT / "tools" / "sync_live_apps.py"


def load_sync_tool():
    spec = importlib.util.spec_from_file_location("sync_live_apps_digest", TOOL)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class LiveBuildDigestTests(unittest.TestCase):
    def test_line_endings_do_not_change_the_digest(self):
        module = load_sync_tool()
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            lf_root = root / "lf"
            crlf_root = root / "crlf"
            lf_root.mkdir()
            crlf_root.mkdir()
            (lf_root / "app.js").write_bytes(b"const a = 1;\nconst b = 2;\n")
            (crlf_root / "app.js").write_bytes(b"const a = 1;\r\nconst b = 2;\r\n")
            self.assertEqual(
                module._digest([lf_root / "app.js"], lf_root),
                module._digest([crlf_root / "app.js"], crlf_root),
            )

    def test_binary_files_are_hashed_byte_for_byte(self):
        module = load_sync_tool()
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "logo.bin").write_bytes(b"\x00\x01\r\n")
            other = Path(temp) / "other"
            other.mkdir()
            (other / "logo.bin").write_bytes(b"\x00\x01\n")
            self.assertNotEqual(
                module._digest([root / "logo.bin"], root),
                module._digest([other / "logo.bin"], other),
            )


if __name__ == "__main__":
    unittest.main()
