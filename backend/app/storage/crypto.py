"""Streaming authenticated encryption for files stored in GridFS.

Format (all integers big-endian):

    header : MAGIC (5 bytes) || salt (16 bytes)
    frame* : u32 meta || ciphertext

    meta   : bit 31 = "final frame" flag, bits 0..30 = ciphertext length (incl. 16-byte GCM tag)

Each file gets its own AES-256-GCM key derived with HKDF-SHA256 from the master key
and the random per-file salt. Each frame is encrypted with nonce = frame index (96-bit
counter) and AAD = the final-frame flag, so frames cannot be reordered, dropped from
the middle, or truncated off the end without authentication failing.
"""
import os
from typing import AsyncIterator, Optional

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

ENCRYPTION_ID = "aes-256-gcm-chunked-v1"
MAGIC = b"OWLY\x01"
SALT_LEN = 16
HEADER_LEN = len(MAGIC) + SALT_LEN
CHUNK_SIZE = 64 * 1024
TAG_LEN = 16
_FINAL_BIT = 0x80000000
_HKDF_INFO = b"ownly/file/v1"


class DecryptionError(Exception):
    """Raised when stored file content is malformed, tampered with, or the key is wrong."""


def _file_key(master_key: bytes, salt: bytes) -> bytes:
    return HKDF(
        algorithm=hashes.SHA256(), length=32, salt=salt, info=_HKDF_INFO
    ).derive(master_key)


def _nonce(index: int) -> bytes:
    return index.to_bytes(12, "big")


def _frame(aes: AESGCM, index: int, plaintext: bytes, last: bool) -> bytes:
    aad = b"\x01" if last else b"\x00"
    ct = aes.encrypt(_nonce(index), plaintext, aad)
    meta = len(ct) | (_FINAL_BIT if last else 0)
    return meta.to_bytes(4, "big") + ct


async def encrypt_stream(
    source: AsyncIterator[bytes], master_key: bytes
) -> AsyncIterator[bytes]:
    salt = os.urandom(SALT_LEN)
    aes = AESGCM(_file_key(master_key, salt))
    yield MAGIC + salt

    buf = bytearray()
    index = 0
    async for part in source:
        buf.extend(part)
        # Strictly greater: always hold back at least one byte for the final frame.
        while len(buf) > CHUNK_SIZE:
            block = bytes(buf[:CHUNK_SIZE])
            del buf[:CHUNK_SIZE]
            yield _frame(aes, index, block, last=False)
            index += 1
    yield _frame(aes, index, bytes(buf), last=True)


async def decrypt_stream(
    source: AsyncIterator[bytes], master_key: bytes
) -> AsyncIterator[bytes]:
    buf = bytearray()
    aes: Optional[AESGCM] = None
    index = 0
    saw_final = False

    async for part in source:
        buf.extend(part)

        if aes is None:
            if len(buf) < HEADER_LEN:
                continue
            if bytes(buf[: len(MAGIC)]) != MAGIC:
                raise DecryptionError("Unrecognised encrypted file header.")
            salt = bytes(buf[len(MAGIC):HEADER_LEN])
            del buf[:HEADER_LEN]
            aes = AESGCM(_file_key(master_key, salt))

        while len(buf) >= 4:
            if saw_final:
                raise DecryptionError("Unexpected data after final frame.")
            meta = int.from_bytes(buf[:4], "big")
            last = bool(meta & _FINAL_BIT)
            length = meta & ~_FINAL_BIT
            if length < TAG_LEN or length > CHUNK_SIZE + TAG_LEN:
                raise DecryptionError("Invalid frame length.")
            if len(buf) < 4 + length:
                break
            ct = bytes(buf[4:4 + length])
            del buf[:4 + length]
            try:
                plaintext = aes.decrypt(_nonce(index), ct, b"\x01" if last else b"\x00")
            except InvalidTag:
                raise DecryptionError("File failed authentication (tampered or wrong key).")
            index += 1
            saw_final = last
            if plaintext:
                yield plaintext

    if aes is None or not saw_final or buf:
        raise DecryptionError("Encrypted file is truncated.")
