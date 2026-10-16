"""Content sniffing for uploads: the declared MIME type must match the file's real bytes."""
import codecs

_SIGNATURES = {
    "image/png": lambda h: h.startswith(b"\x89PNG\r\n\x1a\n"),
    "image/jpeg": lambda h: h.startswith(b"\xff\xd8\xff"),
    "image/gif": lambda h: h.startswith((b"GIF87a", b"GIF89a")),
    "image/webp": lambda h: h[:4] == b"RIFF" and h[8:12] == b"WEBP",
    "application/pdf": lambda h: b"%PDF-" in h[:1024],
    "video/mp4": lambda h: h[4:8] == b"ftyp",
    "video/quicktime": lambda h: h[4:8] == b"ftyp",
    "video/webm": lambda h: h.startswith(b"\x1a\x45\xdf\xa3"),
}


def _is_utf8_text(head: bytes) -> bool:
    if b"\x00" in head:
        return False
    try:
        # incremental + final=False tolerates a multibyte char cut off at the sample boundary
        codecs.getincrementaldecoder("utf-8")().decode(head, final=False)
    except UnicodeDecodeError:
        return False
    return True


def _looks_like_json(head: bytes) -> bool:
    if not _is_utf8_text(head):
        return False
    text = head.decode("utf-8", errors="ignore").lstrip("\ufeff \t\r\n")
    return text[:1] in ("{", "[")


def signature_matches(declared_mime: str, head: bytes) -> bool:
    """True if `head` (first few KB of the file) is consistent with `declared_mime`.

    MIME types without a known signature rule are not verified (returns True); restrict
    ALLOWED_UPLOAD_TYPES to types listed here if every upload must be sniffed.
    """
    mime = (declared_mime or "").split(";")[0].strip().lower()
    if mime == "text/plain":
        return _is_utf8_text(head)
    if mime == "application/json":
        return _looks_like_json(head)
    check = _SIGNATURES.get(mime)
    return True if check is None else bool(check(head))
