import hashlib


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def ensure_max_length(value: str, max_len: int) -> None:
    if len(value) > max_len:
        raise ValueError(f"Input exceeds {max_len} characters.")
