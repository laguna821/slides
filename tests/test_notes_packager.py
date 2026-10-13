"""Independent synthetic-credential tests; never use the site's real credential."""
import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("notes_packager", ROOT / "scripts/package-notes.py")
PACKAGER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PACKAGER)
SYNTHETIC_PASSWORD = "synthetic-test-only-31"
SOURCE = b'''<script type="application/json" id="deck-meta">{"id":"synthetic-deck"}</script>
<section class="slide" id="s1"><p>Public text</p></section>
<section class="slide" id="s2"></section>
<script type="application/json" id="speaker-notes-enc">{}</script>'''


def decrypt(enc, password=SYNTHETIC_PASSWORD):
    # Independent stdlib PBKDF2 derivation, rather than the producer's KDF class.
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), base64.b64decode(enc["salt"]), enc["iterations"], 32)
    return json.loads(AESGCM(key).decrypt(base64.b64decode(enc["iv"]), base64.b64decode(enc["ciphertext"]), enc["aad"].encode()))


class NotesPackagerTests(unittest.TestCase):
    def test_authored_roundtrip_no_plaintext_and_payload_only_change(self):
        notes = {"s1": "비공개 합성 노트 ONLY_SYNTHETIC_SECRET <script>&", "s2": "Line 1\nLine 2"}
        output = PACKAGER.package(SOURCE, notes, SYNTHETIC_PASSWORD)
        enc = json.loads(PACKAGER.PAYLOAD.search(output)[2])
        self.assertEqual(decrypt(enc), notes)
        self.assertNotIn(b"ONLY_SYNTHETIC_SECRET", output)
        self.assertNotIn(SYNTHETIC_PASSWORD.encode(), output)
        self.assertEqual(PACKAGER.PAYLOAD.sub(b"", SOURCE), PACKAGER.PAYLOAD.sub(b"", output))
        self.assertEqual(enc["aad"], "achmage-notes-v1:synthetic-deck")

    def test_empty_notes_have_real_authenticated_ciphertext(self):
        enc = PACKAGER.envelope({}, SYNTHETIC_PASSWORD, "synthetic-deck")
        self.assertEqual(decrypt(enc), {})
        self.assertEqual(len(base64.b64decode(enc["ciphertext"])), 18)

    def test_random_nonce_and_salt(self):
        a = PACKAGER.envelope({}, SYNTHETIC_PASSWORD, "synthetic-deck")
        b = PACKAGER.envelope({}, SYNTHETIC_PASSWORD, "synthetic-deck")
        for key in ("salt", "iv", "ciphertext"):
            self.assertNotEqual(a[key], b[key])

    def test_wrong_password_and_authenticated_field_tampering(self):
        enc = PACKAGER.envelope({"s1": "synthetic note"}, SYNTHETIC_PASSWORD, "synthetic-deck")
        with self.assertRaises(InvalidTag):
            decrypt(enc, "wrong-test-only-32")
        for field in ("salt", "iv", "ciphertext", "aad", "iterations"):
            changed = dict(enc)
            if field == "aad":
                changed[field] += "-other-deck"
            elif field == "iterations":
                changed[field] -= 1
            else:
                value = bytearray(base64.b64decode(changed[field]))
                value[0] ^= 1
                changed[field] = base64.b64encode(value).decode()
            with self.subTest(field=field), self.assertRaises(InvalidTag):
                decrypt(changed)

    def test_invalid_note_ids_and_data(self):
        for notes in ({"missing": "note"}, {1: "note"}, {"s1": 3}, {"s1": "x" * 64001}, []):
            with self.subTest(notes_type=type(notes).__name__), self.assertRaises(ValueError):
                PACKAGER.package(SOURCE, notes, SYNTHETIC_PASSWORD)
        for malformed in (SOURCE.replace(b'id="s2"', b'id="s1"'), SOURCE.replace(b' id="s2"', b''), SOURCE.replace(b'class="slide"', b'class="other"')):
            with self.assertRaises(ValueError):
                PACKAGER.package(malformed, {}, SYNTHETIC_PASSWORD)

    def test_ambiguous_payload_or_metadata_rejected(self):
        for malformed in (SOURCE + PACKAGER.PAYLOAD.search(SOURCE)[0], SOURCE + PACKAGER.META.search(SOURCE)[0], SOURCE.replace(b'id="speaker-notes-enc"', b'id="other"')):
            with self.assertRaises(ValueError):
                PACKAGER.package(malformed, {}, SYNTHETIC_PASSWORD)

    def test_project_pin_exception_and_rejected_short_passwords(self):
        self.assertEqual(decrypt(PACKAGER.envelope({}, "9462", "test"), "9462"), {})
        for password in ("", "123", "12345", "abcd", "１２３４"):
            with self.subTest(password=password), self.assertRaises(ValueError):
                PACKAGER.envelope({}, password, "test")

    def test_existing_outputs_preserve_all_non_envelope_bytes_and_hashes(self):
        manifest = json.loads((ROOT / "content/presenter-notes.json").read_text(encoding="utf-8"))
        for entry in manifest["decks"]:
            original = (ROOT / "public" / entry["source"].lstrip("/")).read_bytes()
            output = (ROOT / "public" / entry["url"].lstrip("/")).read_bytes()
            self.assertEqual(hashlib.sha256(original).hexdigest(), entry["sourceSha256"])
            self.assertEqual(hashlib.sha256(output).hexdigest(), entry["sha256"])
            self.assertEqual(PACKAGER.PAYLOAD.sub(b"", original), PACKAGER.PAYLOAD.sub(b"", output))
        producer = manifest["producer"]
        self.assertEqual(hashlib.sha256((ROOT / producer["path"]).read_bytes()).hexdigest(), producer["sha256"])


if __name__ == "__main__":
    unittest.main()
