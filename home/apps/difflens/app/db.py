import json
from typing import Any, Dict, List

import psycopg


def fetch_history(database_url: str, user_key: str, limit: int) -> List[Dict[str, Any]]:
    query = (
        "select id, mode, granularity, result, created_at, a_hash, b_hash "
        "from diff_runs where user_key = %s order by created_at desc limit %s"
    )
    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(query, (user_key, limit))
            rows = cur.fetchall()

    items = []
    for row in rows:
        run_id, mode, granularity, result, created_at, a_hash, b_hash = row
        items.append(
            {
                "id": str(run_id),
                "mode": mode,
                "granularity": granularity,
                "result": result,
                "created_at": created_at.isoformat(),
                "a_hash": a_hash,
                "b_hash": b_hash,
            }
        )
    return items


def fetch_run(database_url: str, user_key: str, run_id: str):
    query = (
        "select id, mode, granularity, result, created_at "
        "from diff_runs where id = %s and user_key = %s"
    )
    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(query, (run_id, user_key))
            row = cur.fetchone()

    if not row:
        return None

    run_id, mode, granularity, result, created_at = row
    return {
        "id": str(run_id),
        "mode": mode,
        "granularity": granularity,
        "result": result,
        "created_at": created_at.isoformat(),
    }


def insert_run(
    database_url: str,
    user_key: str,
    mode: str,
    granularity: str,
    a_hash: str,
    b_hash: str,
    a_size: int,
    b_size: int,
    result: Dict[str, Any],
) -> str:
    query = (
        "insert into diff_runs (user_key, mode, granularity, a_hash, b_hash, a_size, b_size, result) "
        "values (%s, %s, %s, %s, %s, %s, %s, %s) returning id"
    )
    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                query,
                (user_key, mode, granularity, a_hash, b_hash, a_size, b_size, json.dumps(result)),
            )
            run_id = cur.fetchone()[0]
        conn.commit()
    return str(run_id)


def delete_run(database_url: str, user_key: str, run_id: str) -> bool:
    query = "delete from diff_runs where id = %s and user_key = %s"
    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(query, (run_id, user_key))
            deleted = cur.rowcount > 0
        conn.commit()
    return deleted
