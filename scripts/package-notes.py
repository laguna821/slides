"""Site-only notes-envelope producer 1.0.0.

Crypto format derived from frozen Achmage render.py encrypt_notes (369538c1).
The renderer and browser runtime are not modified. Only one JSON payload changes.
The explicit project PIN exception is NOT a new shared-engine password default.
"""
import argparse
import base64
import getpass
import hashlib
import json
import re
import secrets
from pathlib import Path
from html.parser import HTMLParser
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

PAYLOAD = re.compile(rb'(<script type="application/json" id="speaker-notes-enc">)(.*?)(</script>)', re.S)
META = re.compile(rb'<script type="application/json" id="deck-meta">(.*?)</script>', re.S)

def digest(data):
    return hashlib.sha256(data).hexdigest()

def envelope(notes, password, deck_id):
    if not (len(password) >= 8 or re.fullmatch(r"[0-9]{4}", password)):
        raise ValueError("Use the project four-digit PIN or a passphrase of at least 8 characters")
    salt, iv = secrets.token_bytes(16), secrets.token_bytes(12)
    key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=600000).derive(password.encode())
    aad = ("achmage-notes-v1:" + deck_id).encode()
    cipher = AESGCM(key).encrypt(iv, json.dumps(notes, ensure_ascii=False).encode(), aad)
    enc = dict(version=1, kdf="PBKDF2-SHA256", iterations=600000, algorithm="AES-256-GCM",
               salt=base64.b64encode(salt).decode(), iv=base64.b64encode(iv).decode(),
               aad=aad.decode(), ciphertext=base64.b64encode(cipher).decode())
    assert json.loads(AESGCM(key).decrypt(iv, cipher, aad)) == notes
    return enc

def package(source, notes, password):
    if len(PAYLOAD.findall(source)) != 1 or len(META.findall(source)) != 1:
        raise ValueError("Expected exactly one engine metadata and encrypted notes element")
    meta = json.loads(META.search(source)[1])
    if not isinstance(notes, dict) or any(not isinstance(k, str) or not isinstance(v, str) or len(v)>64000 for k,v in notes.items()):
        raise ValueError("Notes must map slide IDs to text")
    class Slides(HTMLParser):
        def __init__(self):
            super().__init__()
            self.ids=[]
        def handle_starttag(self, tag, attrs):
            a=dict(attrs)
            if "slide" in a.get("class","").split():
                self.ids.append(a.get("id"))
    parsed=Slides()
    parsed.feed(source.decode("utf-8"))
    slide_ids=set(parsed.ids)
    if not parsed.ids or None in slide_ids or len(slide_ids)!=len(parsed.ids):
        raise ValueError("Missing or duplicate slide IDs")
    if any(k not in slide_ids for k in notes):
        raise ValueError("Unknown note slide ID")
    enc = envelope(notes, password, meta["id"])
    output = PAYLOAD.sub(lambda m:m[1]+json.dumps(enc,separators=(",",":")).encode()+m[3], source)
    assert PAYLOAD.sub(b"<notes-payload/>",source) == PAYLOAD.sub(b"<notes-payload/>",output)
    return output

if __name__ == "__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--source",type=Path,required=True)
    ap.add_argument("--output",type=Path,required=True)
    ap.add_argument("--notes-file",type=Path)
    ap.add_argument("--empty",action="store_true",help="Explicit locked shell, no authored notes")
    args=ap.parse_args()
    if bool(args.notes_file)==args.empty: ap.error("Choose --notes-file or --empty")
    if args.source.resolve()==args.output.resolve() or args.output.exists(): ap.error("Preserve source; output must be a new path")
    notes=json.loads(args.notes_file.read_text(encoding="utf-8")) if args.notes_file else {}
    password=getpass.getpass("Project notes password: ")
    output=package(args.source.read_bytes(),notes,password)
    password=None
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_bytes(output)
    print(json.dumps({"sha256":digest(output),"notesState":"empty" if not notes else "authored","producer":"studio-notes-envelope/1.0.0"}))
