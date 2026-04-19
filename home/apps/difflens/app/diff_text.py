import difflib
import re
from typing import List, Tuple


def _tokenize_words(text: str) -> List[str]:
    return re.findall(r"[A-Za-z0-9_]+|[^\w\s]", text)


def _build_chunks(
    a_seq: List[str],
    b_seq: List[str],
    context_lines: int,
    max_chunks: int
) -> List[dict]:
    matcher = difflib.SequenceMatcher(a=a_seq, b=b_seq)
    grouped = matcher.get_grouped_opcodes(n=context_lines)
    chunks = []

    for group in grouped:
        a_start = group[0][1]
        a_end = group[-1][2]
        b_start = group[0][3]
        b_end = group[-1][4]

        has_insert = any(tag == "insert" for tag, *_ in group)
        has_delete = any(tag == "delete" for tag, *_ in group)
        has_replace = any(tag == "replace" for tag, *_ in group)

        if has_replace or (has_insert and has_delete):
            chunk_type = "change"
        elif has_insert:
            chunk_type = "add"
        else:
            chunk_type = "remove"

        chunks.append(
            {
                "type": chunk_type,
                "aStart": a_start,
                "aEnd": a_end,
                "bStart": b_start,
                "bEnd": b_end,
                "a": a_seq[a_start:a_end],
                "b": b_seq[b_start:b_end],
            }
        )

        if len(chunks) >= max_chunks:
            break

    return chunks


def _summarize(opcodes: List[Tuple[str, int, int, int, int]]) -> Tuple[int, int, int]:
    adds = 0
    removes = 0
    changes = 0

    for tag, a0, a1, b0, b1 in opcodes:
        if tag == "insert":
            adds += b1 - b0
        elif tag == "delete":
            removes += a1 - a0
        elif tag == "replace":
            changes += max(a1 - a0, b1 - b0)

    return adds, removes, changes


def diff_text(a: str, b: str, granularity: str, context_lines: int, max_chunks: int) -> dict:
    if granularity == "word":
        a_seq = _tokenize_words(a)
        b_seq = _tokenize_words(b)
    else:
        a_seq = a.splitlines()
        b_seq = b.splitlines()

    matcher = difflib.SequenceMatcher(a=a_seq, b=b_seq)
    opcodes = matcher.get_opcodes()
    adds, removes, changes = _summarize(opcodes)

    chunks = _build_chunks(a_seq, b_seq, context_lines, max_chunks)

    return {
        "summary": {
            "adds": adds,
            "removes": removes,
            "changes": changes,
        },
        "diff": {"chunks": chunks},
    }
