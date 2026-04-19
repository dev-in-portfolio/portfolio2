from fastapi import APIRouter, Depends, HTTPException

from .db import delete_run, fetch_history, fetch_run, insert_run
from .diff_json import diff_json
from .diff_text import diff_text
from .models import DiffRequest
from .security import get_user_key
from .settings import Settings
from .utils import ensure_max_length, sha256_text


def create_router(settings: Settings) -> APIRouter:
    router = APIRouter()

    @router.post("/diff")
    async def create_diff(payload: DiffRequest, user_key: str = Depends(get_user_key)):
        try:
            ensure_max_length(payload.a, settings.max_body_chars)
            ensure_max_length(payload.b, settings.max_body_chars)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        if not settings.database_url:
            raise HTTPException(status_code=500, detail="DATABASE_URL not configured")

        if payload.mode == "text":
            output = diff_text(
                payload.a,
                payload.b,
                payload.granularity or "line",
                payload.options.contextLines,
                payload.options.maxDiffChunks,
            )
        else:
            try:
                output = diff_json(
                    payload.a,
                    payload.b,
                    settings.max_json_depth,
                    settings.max_json_ops,
                )
            except ValueError as exc:
                raise HTTPException(status_code=400, detail="Invalid JSON") from exc

        summary = output["summary"]
        summary_payload = {
            "mode": payload.mode,
            "granularity": payload.granularity or "line",
            **summary,
        }
        result_payload = {
            "summary": summary_payload,
            "diff": output["diff"],
            "options": payload.options.model_dump(),
        }

        run_id = insert_run(
            settings.database_url,
            user_key,
            payload.mode,
            payload.granularity or "line",
            sha256_text(payload.a),
            sha256_text(payload.b),
            len(payload.a),
            len(payload.b),
            result_payload,
        )

        return {
            "id": run_id,
            "summary": summary_payload,
            "diff": output["diff"],
            "options": payload.options.model_dump(),
        }

    @router.post("/diff/validate")
    async def validate_diff(payload: DiffRequest, user_key: str = Depends(get_user_key)):
        try:
            ensure_max_length(payload.a, settings.max_body_chars)
            ensure_max_length(payload.b, settings.max_body_chars)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return {
            "ok": True,
            "mode": payload.mode,
            "granularity": payload.granularity or "line",
            "options": payload.options.model_dump(),
        }

    @router.get("/history")
    async def history(limit: int = 50, user_key: str = Depends(get_user_key)):
        if not settings.database_url:
            raise HTTPException(status_code=500, detail="DATABASE_URL not configured")

        limit = max(1, min(limit, 100))
        items = fetch_history(settings.database_url, user_key, limit)
        return {
            "items": [
                {
                    "id": item["id"],
                    "mode": item["mode"],
                    "granularity": item["granularity"],
                    "createdAt": item["created_at"],
                    "aHash": item["a_hash"],
                    "bHash": item["b_hash"],
                    "summary": item["result"]["summary"],
                }
                for item in items
            ]
        }

    @router.get("/runs/{run_id}")
    async def get_run(run_id: str, user_key: str = Depends(get_user_key)):
        if not settings.database_url:
            raise HTTPException(status_code=500, detail="DATABASE_URL not configured")

        run = fetch_run(settings.database_url, user_key, run_id)
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")
        return {
            "id": run["id"],
            "mode": run["mode"],
            "granularity": run["granularity"],
            "result": run["result"],
            "createdAt": run["created_at"],
        }

    @router.delete("/runs/{run_id}")
    async def delete(run_id: str, user_key: str = Depends(get_user_key)):
        if not settings.database_url:
            raise HTTPException(status_code=500, detail="DATABASE_URL not configured")

        ok = delete_run(settings.database_url, user_key, run_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Run not found")
        return {"ok": True}

    @router.post("/diff/compare")
    async def compare_diff(payload: DiffRequest, user_key: str = Depends(get_user_key)):
        """Compare two diff runs with detailed analysis"""
        try:
            ensure_max_length(payload.a, settings.max_body_chars)
            ensure_max_length(payload.b, settings.max_body_chars)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        if not settings.database_url:
            raise HTTPException(status_code=500, detail="DATABASE_URL not configured")

        if payload.mode == "text":
            output = diff_text(
                payload.a,
                payload.b,
                payload.granularity or "line",
                payload.options.contextLines,
                payload.options.maxDiffChunks,
            )
        else:
            try:
                output = diff_json(
                    payload.a,
                    payload.b,
                    settings.max_json_depth,
                    settings.max_json_ops,
                )
            except ValueError as exc:
                raise HTTPException(status_code=400, detail="Invalid JSON") from exc

        summary = output["summary"]
        summary_payload = {
            "mode": payload.mode,
            "granularity": payload.granularity or "line",
            **summary,
        }
        result_payload = {
            "summary": summary_payload,
            "diff": output["diff"],
            "options": payload.options.model_dump(),
        }

        run_id = insert_run(
            settings.database_url,
            user_key,
            payload.mode,
            payload.granularity or "line",
            sha256_text(payload.a),
            sha256_text(payload.b),
            len(payload.a),
            len(payload.b),
            result_payload,
        )

        # Enhanced comparison analysis
        comparison = analyze_comparison(output["diff"], payload.mode)

        return {
            "id": run_id,
            "summary": summary_payload,
            "diff": output["diff"],
            "comparison": comparison,
            "options": payload.options.model_dump(),
        }

    @router.post("/diff/batch")
    async def batch_diff(payload: dict, user_key: str = Depends(get_user_key)):
        """Run multiple diffs in batch mode"""
        if not settings.database_url:
            raise HTTPException(status_code=500, detail="DATABASE_URL not configured")

        items = payload.get("items", [])
        if not items or len(items) > 10:
            raise HTTPException(status_code=400, detail="1-10 items required")

        results = []
        for item in items:
            try:
                mode = item.get("mode", "text")
                granularity = item.get("granularity", "line")
                a = item.get("a", "")
                b = item.get("b", "")
                
                ensure_max_length(a, settings.max_body_chars)
                ensure_max_length(b, settings.max_body_chars)

                if mode == "text":
                    output = diff_text(a, b, granularity, 3, 200)
                else:
                    output = diff_json(a, b, settings.max_json_depth, settings.max_json_ops)

                summary = output["summary"]
                summary_payload = {
                    "mode": mode,
                    "granularity": granularity,
                    **summary,
                }
                result_payload = {
                    "summary": summary_payload,
                    "diff": output["diff"],
                }

                run_id = insert_run(
                    settings.database_url,
                    user_key,
                    mode,
                    granularity,
                    sha256_text(a),
                    sha256_text(b),
                    len(a),
                    len(b),
                    result_payload,
                )

                results.append({
                    "id": run_id,
                    "summary": summary_payload,
                    "diff": output["diff"],
                })
            except Exception as exc:
                results.append({
                    "error": str(exc),
                    "item": item,
                })

        return {"results": results, "count": len(results)}

    @router.post("/runs/{run_id}/export")
    async def export_run(run_id: str, payload: dict, user_key: str = Depends(get_user_key)):
        """Export run in various formats"""
        if not settings.database_url:
            raise HTTPException(status_code=500, detail="DATABASE_URL not configured")

        run = fetch_run(settings.database_url, user_key, run_id)
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")

        format_type = payload.get("format", "json")
        
        if format_type == "json":
            return {
                "format": "json",
                "run": run,
            }
        elif format_type == "unified":
            # Generate unified diff format
            unified_diff = generate_unified_diff(run["result"])
            return {
                "format": "unified",
                "diff": unified_diff,
            }
        elif format_type == "summary":
            return {
                "format": "summary",
                "summary": run["result"]["summary"],
            }
        else:
            raise HTTPException(status_code=400, detail="Invalid format")

    @router.post("/runs/batch/export")
    async def batch_export(payload: dict, user_key: str = Depends(get_user_key)):
        """Export multiple runs"""
        if not settings.database_url:
            raise HTTPException(status_code=500, detail="DATABASE_URL not configured")

        run_ids = payload.get("run_ids", [])
        if not run_ids or len(run_ids) > 20:
            raise HTTPException(status_code=400, detail="1-20 run IDs required")

        format_type = payload.get("format", "json")
        exports = []
        
        for run_id in run_ids:
            run = fetch_run(settings.database_url, user_key, run_id)
            if run:
                if format_type == "json":
                    exports.append(run)
                elif format_type == "summary":
                    exports.append({
                        "id": run["id"],
                        "summary": run["result"]["summary"],
                    })
        
        return {
            "format": format_type,
            "exports": exports,
            "count": len(exports),
        }

    @router.get("/runs/{run_id}/analysis")
    async def analyze_run(run_id: str, user_key: str = Depends(get_user_key)):
        """Get detailed analysis of a diff run"""
        if not settings.database_url:
            raise HTTPException(status_code=500, detail="DATABASE_URL not configured")

        run = fetch_run(settings.database_url, user_key, run_id)
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")

        analysis = detailed_analysis(run["result"])
        
        return {
            "run_id": run_id,
            "analysis": analysis,
            "created_at": run["created_at"],
        }

    return router


def analyze_comparison(diff_chunks, mode):
    """Analyze diff chunks for comparison insights"""
    adds = 0
    removes = 0
    changes = 0
    total_lines = 0
    
    for chunk in diff_chunks:
        chunk_type = chunk.get("type", "change")
        if chunk_type == "add":
            adds += 1
        elif chunk_type == "remove":
            removes += 1
        else:
            changes += 1
        
        # Count lines affected
        a_lines = len(chunk.get("a", []))
        b_lines = len(chunk.get("b", []))
        total_lines += max(a_lines, b_lines)
    
    return {
        "chunk_counts": {
            "add": adds,
            "remove": removes,
            "change": changes,
            "total": adds + removes + changes,
        },
        "line_impact": total_lines,
        "mode": mode,
        "complexity": "high" if (adds + removes + changes) > 10 else ("medium" if (adds + removes + changes) > 3 else "low"),
    }


def detailed_analysis(result):
    """Generate detailed analysis of diff result"""
    summary = result["summary"]
    diff_chunks = result["diff"]
    
    # Basic metrics
    total_chunks = len(diff_chunks)
    
    # Line-level analysis
    lines_added = 0
    lines_removed = 0
    lines_changed = 0
    
    for chunk in diff_chunks:
        chunk_type = chunk.get("type", "change")
        a_lines = len(chunk.get("a", []))
        b_lines = len(chunk.get("b", []))
        
        if chunk_type == "add":
            lines_added += b_lines
        elif chunk_type == "remove":
            lines_removed += a_lines
        else:
            lines_changed += max(a_lines, b_lines)
    
    # Complexity scoring
    complexity_score = (total_chunks * 0.3) + ((lines_added + lines_removed + lines_changed) * 0.1)
    complexity = "low" if complexity_score < 5 else ("medium" if complexity_score < 15 else "high")
    
    return {
        "metrics": {
            "total_chunks": total_chunks,
            "lines_added": lines_added,
            "lines_removed": lines_removed,
            "lines_changed": lines_changed,
            "total_lines_impacted": lines_added + lines_removed + lines_changed,
        },
        "complexity": {
            "score": round(complexity_score, 2),
            "level": complexity,
        },
        "summary": summary,
        "recommendations": generate_recommendations(complexity, summary["mode"]),
    }


def generate_recommendations(complexity, mode):
    """Generate recommendations based on analysis"""
    recommendations = []
    
    if complexity == "high":
        recommendations.append("High complexity detected - consider breaking into smaller changes")
    
    if mode == "text" and complexity == "high":
        recommendations.append("Text diff is complex - review line-by-line carefully")
    
    if mode == "json":
        recommendations.append("JSON diff detected - verify schema compatibility")
    
    return recommendations


def generate_unified_diff(result):
    """Generate unified diff format from result"""
    summary = result["summary"]
    diff_chunks = result["diff"]
    
    lines = []
    lines.append(f"--- Mode: {summary['mode']}, Granularity: {summary['granularity']}")
    lines.append(f"+++ Diff Analysis")
    
    for i, chunk in enumerate(diff_chunks, 1):
        chunk_type = chunk.get("type", "change")
        a_start = chunk.get("aStart", 0)
        a_end = chunk.get("aEnd", 0)
        b_start = chunk.get("bStart", 0)
        b_end = chunk.get("bEnd", 0)
        
        lines.append(f"@@ -{a_start},{a_end - a_start} +{b_start},{b_end - b_start} @@")
        
        # Show removed lines
        for line in chunk.get("a", []):
            lines.append(f"-{line}")
        
        # Show added lines
        for line in chunk.get("b", []):
            lines.append(f"+{line}")
    
    return "\n".join(lines)
