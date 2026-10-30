import importlib.util
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOL = ROOT / "tools" / "sync_editor.py"


def load_sync_tool():
    spec = importlib.util.spec_from_file_location("sync_editor_digest", TOOL)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class EditorBuildDigestTests(unittest.TestCase):
    def test_line_endings_do_not_change_the_digest(self):
        module = load_sync_tool()
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            lf = root / "lf.js"
            crlf = root / "crlf.js"
            lf.write_bytes(b"const a = 1;\nconst b = 2;\n")
            crlf.write_bytes(b"const a = 1;\r\nconst b = 2;\r\n")
            self.assertEqual(module._digest(lf), module._digest(crlf))
            self.assertEqual(module._payload(crlf), b"const a = 1;\nconst b = 2;\n")

    def test_binary_files_are_hashed_byte_for_byte(self):
        module = load_sync_tool()
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            binary = root / "logo.bin"
            other = root / "other.bin"
            binary.write_bytes(b"\x00\x01\r\n")
            other.write_bytes(b"\x00\x01\n")
            self.assertNotEqual(module._digest(binary), module._digest(other))
            self.assertEqual(module._payload(binary), b"\x00\x01\r\n")

    def test_source_hash_matches_across_line_endings(self):
        module = load_sync_tool()
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            lf_root = root / "lf"
            crlf_root = root / "crlf"
            lf_root.mkdir()
            crlf_root.mkdir()
            (lf_root / "app.js").write_bytes(b"const a = 1;\n")
            (crlf_root / "app.js").write_bytes(b"const a = 1;\r\n")
            self.assertEqual(
                module._source_hash([lf_root / "app.js"], lf_root),
                module._source_hash([crlf_root / "app.js"], crlf_root),
            )


if __name__ == "__main__":
    unittest.main()
