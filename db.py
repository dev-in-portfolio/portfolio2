import os
import json
import uuid
from datetime import datetime
from contextlib import contextmanager
from typing import Any, Dict, List, Tuple

import psycopg

FALLBACK_FILE = "routeforge_db_fallback.json"
_use_fallback = None

def get_database_url() -> str:
    return os.getenv("DATABASE_URL", "")

def check_db_connection() -> bool:
    global _use_fallback
    if _use_fallback is not None:
        return not _use_fallback
        
    db_url = get_database_url()
    if not db_url:
        _use_fallback = True
        return False
    try:
        # Attempt connection check with short timeout
        with psycopg.connect(db_url, connect_timeout=3) as conn:
            _use_fallback = False
            return True
    except Exception:
        _use_fallback = True
        return False

def get_local_db() -> Dict[str, List]:
    if not os.path.exists(FALLBACK_FILE):
        db = {"datasets": [], "stops": []}
        save_local_db(db)
        return db
    try:
        with open(FALLBACK_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return {"datasets": [], "stops": []}

def save_local_db(db: Dict[str, List]) -> None:
    try:
        with open(FALLBACK_FILE, "w") as f:
            json.dump(db, f, indent=2)
    except Exception as e:
        print(f"Error saving local db: {e}")

@contextmanager
def get_conn():
    database_url = get_database_url()
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set.")
    with psycopg.connect(database_url, autocommit=True) as conn:
        yield conn

def list_datasets() -> List[Tuple]:
    if check_db_connection():
        try:
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("select id, name, created_at from datasets order by created_at desc")
                    return cur.fetchall()
        except Exception:
            pass
            
    db = get_local_db()
    return [(d["id"], d["name"], d["created_at"]) for d in db["datasets"]]

def create_dataset(name: str) -> None:
    if check_db_connection():
        try:
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("insert into datasets (name) values (%s)", [name])
                    return
        except Exception:
            pass
            
    db = get_local_db()
    db["datasets"].insert(0, {
        "id": str(uuid.uuid4()),
        "name": name,
        "created_at": datetime.now().isoformat()
    })
    save_local_db(db)

def insert_stops(dataset_id: str, rows: List[Dict[str, Any]]) -> None:
    if check_db_connection():
        try:
            with get_conn() as conn:
                with conn.cursor() as cur:
                    for row in rows:
                        cur.execute(
                            """
                            insert into stops (dataset_id, name, address, city, state, zip, lat, lon, notes, source)
                            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            """,
                            [
                                dataset_id,
                                row.get("name", ""),
                                row.get("address", ""),
                                row.get("city", ""),
                                row.get("state", ""),
                                row.get("zip", ""),
                                float(row.get("lat")) if row.get("lat") != "" and row.get("lat") is not None else None,
                                float(row.get("lon")) if row.get("lon") != "" and row.get("lon") is not None else None,
                                row.get("notes", ""),
                                row.get("source", ""),
                            ],
                        )
                    return
        except Exception:
            pass
            
    db = get_local_db()
    for row in rows:
        db["stops"].append({
            "id": str(uuid.uuid4()),
            "dataset_id": dataset_id,
            "name": row.get("name", ""),
            "address": row.get("address", ""),
            "city": row.get("city", ""),
            "state": row.get("state", ""),
            "zip": str(row.get("zip", "")),
            "lat": float(row.get("lat")) if row.get("lat") != "" and row.get("lat") is not None else None,
            "lon": float(row.get("lon")) if row.get("lon") != "" and row.get("lon") is not None else None,
            "notes": row.get("notes", ""),
            "source": row.get("source", ""),
            "created_at": datetime.now().isoformat()
        })
    save_local_db(db)

def list_stops(dataset_id: str) -> List[Tuple]:
    if check_db_connection():
        try:
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "select id, name, address, city, state, zip, lat, lon, notes, source from stops where dataset_id = %s",
                        [dataset_id],
                    )
                    return cur.fetchall()
        except Exception:
            pass
            
    db = get_local_db()
    stops = [s for s in db["stops"] if s["dataset_id"] == dataset_id]
    return [
        (s["id"], s["name"], s["address"], s["city"], s["state"], s["zip"], s["lat"], s["lon"], s["notes"], s["source"])
        for s in stops
    ]

def update_stop(stop_id: str, fields: Dict[str, Any]) -> None:
    if check_db_connection():
        try:
            if not fields:
                return
            cols = []
            values = []
            for key, value in fields.items():
                cols.append(f"{key} = %s")
                values.append(value)
            values.append(stop_id)
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        f"update stops set {', '.join(cols)} where id = %s",
                        values,
                    )
                    return
        except Exception:
            pass
            
    db = get_local_db()
    for s in db["stops"]:
        if s["id"] == stop_id:
            for k, v in fields.items():
                s[k] = v
            break
    save_local_db(db)
