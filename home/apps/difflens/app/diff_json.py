import json
from typing import Any, List


def _walk(a: Any, b: Any, path: str, depth: int, max_depth: int, ops: List[dict], max_ops: int) -> None:
    if len(ops) >= max_ops:
        return
    if depth > max_depth:
        ops.append({"type": "change", "path": path, "old": "<depth-limit>", "new": "<depth-limit>"})
        return

    if isinstance(a, dict) and isinstance(b, dict):
        a_keys = sorted(a.keys())
        b_keys = sorted(b.keys())
        for key in a_keys:
            next_path = f"{path}/{key}"
            if key not in b:
                ops.append({"type": "remove", "path": next_path, "old": a[key]})
                if len(ops) >= max_ops:
                    return
            else:
                _walk(a[key], b[key], next_path, depth + 1, max_depth, ops, max_ops)
                if len(ops) >= max_ops:
                    return
        for key in b_keys:
            if key not in a:
                ops.append({"type": "add", "path": f"{path}/{key}", "value": b[key]})
                if len(ops) >= max_ops:
                    return
        return

    if isinstance(a, list) and isinstance(b, list):
        max_len = max(len(a), len(b))
        for idx in range(max_len):
            next_path = f"{path}/{idx}"
            if idx >= len(a):
                ops.append({"type": "add", "path": next_path, "value": b[idx]})
            elif idx >= len(b):
                ops.append({"type": "remove", "path": next_path, "old": a[idx]})
            else:
                _walk(a[idx], b[idx], next_path, depth + 1, max_depth, ops, max_ops)
            if len(ops) >= max_ops:
                return
        return

    if a != b:
        ops.append({"type": "change", "path": path, "old": a, "new": b})


def diff_json(a_raw: str, b_raw: str, max_depth: int, max_ops: int) -> dict:
    a = json.loads(a_raw)
    b = json.loads(b_raw)

    ops: List[dict] = []
    _walk(a, b, "", 0, max_depth, ops, max_ops)

    adds = sum(1 for op in ops if op["type"] == "add")
    removes = sum(1 for op in ops if op["type"] == "remove")
    changes = sum(1 for op in ops if op["type"] == "change")

    return {
        "summary": {
            "adds": adds,
            "removes": removes,
            "changes": changes,
        },
        "diff": {"operations": ops},
    }
