from __future__ import annotations

import bcrypt


_MAX_BCRYPT_BYTES = 72


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > _MAX_BCRYPT_BYTES:
        raise ValueError("Password is too long for bcrypt; use 72 bytes or fewer.")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > _MAX_BCRYPT_BYTES:
        return False
    try:
        return bcrypt.checkpw(password_bytes, password_hash.encode("utf-8"))
    except (TypeError, ValueError):
        return False


def password_policy_error(password: str) -> str | None:
    if len(password) < 8:
        return "Password must contain at least 8 characters."
    if len(password.encode("utf-8")) > _MAX_BCRYPT_BYTES:
        return "Password is too long for bcrypt; use 72 bytes or fewer."
    return None
