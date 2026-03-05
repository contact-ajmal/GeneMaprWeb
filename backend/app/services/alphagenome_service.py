"""
AlphaGenome variant effect prediction service.

Wraps the alphagenome Python client to provide variant effect predictions
via Google DeepMind's AlphaGenome model.
"""

from __future__ import annotations

import logging
import asyncio
from functools import lru_cache
from typing import Any

import numpy as np

from app.core.config import settings

logger = logging.getLogger(__name__)

# Valid output types exposed to the API (must match alphagenome.models.dna_client.OutputType)
VALID_OUTPUT_TYPES = ["RNA_SEQ", "CAGE", "DNASE", "CHIP_HISTONE", "ATAC"]

# Default: pass None to let AlphaGenome return all supported ontologies
DEFAULT_ONTOLOGY_TERM = None

# Maximum number of data points to return for track visualisation
MAX_TRACK_POINTS = 512

# Timeout for AlphaGenome API calls (seconds)
PREDICTION_TIMEOUT = 120


def _get_client():
    """Lazily create and cache an AlphaGenome client."""
    try:
        from alphagenome.models import dna_client
    except ImportError:
        raise RuntimeError(
            "The 'alphagenome' package is not installed. "
            "Run: pip install alphagenome"
        )

    api_key = settings.alphagenome_api_key
    if not api_key:
        raise ValueError(
            "ALPHAGENOME_API_KEY is not set. "
            "Get a key at https://deepmind.google.com/science/alphagenome"
        )

    return dna_client.create(api_key)


@lru_cache(maxsize=1)
def _cached_client():
    return _get_client()


def _downsample(arr: np.ndarray, max_points: int = MAX_TRACK_POINTS) -> list[float]:
    """Downsample a 1-D array by averaging into bins for frontend rendering."""
    if len(arr) <= max_points:
        return [round(float(v), 6) for v in arr]
    bin_size = len(arr) // max_points
    downsampled = [
        round(float(np.mean(arr[i * bin_size : (i + 1) * bin_size])), 6)
        for i in range(max_points)
    ]
    return downsampled


def _safe_tracks(output_obj: Any) -> list[float]:
    """Extract a 1-D numeric array from an AlphaGenome output object."""
    # The output objects expose a .values or numpy array attribute
    if hasattr(output_obj, "values"):
        arr = np.asarray(output_obj.values).flatten()
    else:
        arr = np.asarray(output_obj).flatten()
    return _downsample(arr)


def _compute_effect_score(ref_arr: list[float], alt_arr: list[float]) -> float:
    """
    Compute a simple variant effect score as the mean absolute
    log2 fold-change between ALT and REF tracks.
    """
    ref = np.array(ref_arr, dtype=np.float64)
    alt = np.array(alt_arr, dtype=np.float64)
    # Avoid log of zero
    eps = 1e-8
    log_fc = np.log2((alt + eps) / (ref + eps))
    return round(float(np.mean(np.abs(log_fc))), 4)


async def predict_variant_effect(
    chrom: str,
    pos: int,
    ref: str,
    alt: str,
    output_type: str = "RNA_SEQ",
    ontology_term: str | None = DEFAULT_ONTOLOGY_TERM,
) -> dict[str, Any]:
    """
    Run AlphaGenome variant effect prediction.

    Returns a JSON-serializable dict with reference/alternate tracks,
    variant effect score, and metadata.
    """
    from alphagenome.data import genome
    from alphagenome.models import dna_client as dna_client_module

    if output_type not in VALID_OUTPUT_TYPES:
        raise ValueError(
            f"Invalid output_type '{output_type}'. "
            f"Must be one of: {VALID_OUTPUT_TYPES}"
        )

    output_type_enum = getattr(dna_client_module.OutputType, output_type)

    # Build interval centred on the variant
    # Supported lengths: 16384, 131072, 524288, 1048576
    # Using 131,072 bp (128kb) – good balance of context vs speed
    window_size = 131_072  # 2^17, smallest supported length with good context
    half = window_size // 2
    start = max(0, pos - half)
    end = pos + half

    interval = genome.Interval(chromosome=chrom, start=start, end=end)
    variant = genome.Variant(
        chromosome=chrom,
        position=pos,
        reference_bases=ref,
        alternate_bases=alt,
    )

    logger.info(
        "AlphaGenome prediction: %s:%d %s>%s  output=%s",
        chrom, pos, ref, alt, output_type,
    )

    # Run the blocking API call in a thread to avoid blocking the event loop
    def _call():
        model = _cached_client()
        return model.predict_variant(
            interval=interval,
            variant=variant,
            ontology_terms=[ontology_term] if ontology_term else None,
            requested_outputs=[output_type_enum],
        )

    try:
        outputs = await asyncio.wait_for(
            asyncio.to_thread(_call),
            timeout=PREDICTION_TIMEOUT,
        )
    except asyncio.TimeoutError:
        raise RuntimeError(
            f"AlphaGenome prediction timed out after {PREDICTION_TIMEOUT}s. "
            "The API may be under heavy load — please try again later."
        )

    # Extract tracks from the output
    output_key = output_type.lower()
    ref_output = getattr(outputs.reference, output_key, None)
    alt_output = getattr(outputs.alternate, output_key, None)

    if ref_output is None or alt_output is None:
        raise RuntimeError(
            f"AlphaGenome did not return {output_type} data. "
            "Try a different output type."
        )

    ref_tracks = _safe_tracks(ref_output)
    alt_tracks = _safe_tracks(alt_output)
    effect_score = _compute_effect_score(ref_tracks, alt_tracks)

    # Build interval info
    result_interval = {
        "chromosome": chrom,
        "start": start,
        "end": end,
    }

    return {
        "ref_tracks": ref_tracks,
        "alt_tracks": alt_tracks,
        "variant_effect_score": effect_score,
        "output_type": output_type,
        "interval": result_interval,
        "variant": {
            "chromosome": chrom,
            "position": pos,
            "ref": ref,
            "alt": alt,
        },
        "ontology_term": ontology_term,
    }


# ---------------------------------------------------------------------------
# Batch prediction helpers
# ---------------------------------------------------------------------------

BATCH_DELAY_SECONDS = 2.0  # delay between API calls to avoid rate limits
MAX_RETRIES = 3            # retries per variant on transient errors
RETRY_BASE_DELAY = 2.0     # base seconds for exponential backoff


def _is_retryable(error: Exception) -> bool:
    """Check if a gRPC / network error is transient and worth retrying."""
    msg = str(error).lower()
    retryable_patterns = [
        "socket closed",
        "unavailable",
        "handshake read failed",
        "failed to connect",
        "connection reset",
        "deadline exceeded",
        "resource exhausted",
        "too many requests",
        "503",
        "429",
    ]
    return any(p in msg for p in retryable_patterns)


async def run_batch_predictions(
    sample_id: str,
    db,  # AsyncSession
    output_type: str = "RNA_SEQ",
) -> None:
    """
    Run AlphaGenome predictions for every variant in a sample.

    - Skips variants that already have a completed prediction.
    - Marks each row pending → running → completed/failed.
    - Retries transient gRPC errors with exponential backoff.
    - Sleeps between calls to respect API rate limits.
    """
    from datetime import datetime
    from sqlalchemy import select
    from app.models.variant import Variant
    from app.models.alphagenome_prediction import AlphaGenomePrediction
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    import uuid as uuid_mod

    # 1. Fetch all variants for this sample
    result = await db.execute(
        select(Variant).where(Variant.sample_id == sample_id)
    )
    variants = result.scalars().all()

    if not variants:
        logger.warning("No variants found for sample %s", sample_id)
        return

    logger.info(
        "Starting AlphaGenome batch for sample %s — %d variants",
        sample_id, len(variants),
    )

    for idx, v in enumerate(variants):
        # Check if a completed prediction already exists
        existing = await db.execute(
            select(AlphaGenomePrediction)
            .where(AlphaGenomePrediction.variant_id == v.id)
            .where(AlphaGenomePrediction.status == "completed")
        )
        if existing.scalar_one_or_none():
            continue

        # Upsert a row in running state
        pred_id = uuid_mod.uuid4()
        stmt = pg_insert(AlphaGenomePrediction).values(
            id=pred_id,
            variant_id=v.id,
            sample_id=sample_id,
            output_type=output_type,
            status="running",
            chrom=v.chrom,
            pos=v.pos,
            ref=v.ref,
            alt=v.alt,
            gene_symbol=v.gene_symbol,
            created_at=datetime.utcnow(),
        ).on_conflict_do_update(
            constraint="uq_ag_variant",
            set_={"status": "running", "error_message": None},
        )
        await db.execute(stmt)
        await db.commit()

        # Run prediction with retries
        last_error = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                result_data = await predict_variant_effect(
                    chrom=v.chrom, pos=v.pos, ref=v.ref, alt=v.alt,
                    output_type=output_type,
                )

                # Update with results
                pred_row = (
                    await db.execute(
                        select(AlphaGenomePrediction)
                        .where(AlphaGenomePrediction.variant_id == v.id)
                    )
                ).scalar_one()

                pred_row.variant_effect_score = result_data["variant_effect_score"]
                pred_row.ref_tracks = result_data["ref_tracks"]
                pred_row.alt_tracks = result_data["alt_tracks"]
                pred_row.interval_chrom = result_data["interval"]["chromosome"]
                pred_row.interval_start = result_data["interval"]["start"]
                pred_row.interval_end = result_data["interval"]["end"]
                pred_row.status = "completed"
                pred_row.completed_at = datetime.utcnow()
                pred_row.error_message = None
                await db.commit()

                logger.info(
                    "AlphaGenome batch [%d/%d] %s:%d score=%.4f",
                    idx + 1, len(variants), v.chrom, v.pos,
                    result_data["variant_effect_score"],
                )
                last_error = None
                break  # success — exit retry loop

            except Exception as e:
                last_error = e
                if _is_retryable(e) and attempt < MAX_RETRIES:
                    delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
                    logger.warning(
                        "AlphaGenome batch [%d/%d] %s:%d attempt %d/%d failed (retrying in %.0fs): %s",
                        idx + 1, len(variants), v.chrom, v.pos,
                        attempt, MAX_RETRIES, delay, str(e)[:120],
                    )
                    # Clear the cached client so a fresh connection is made
                    _cached_client.cache_clear()
                    await asyncio.sleep(delay)
                else:
                    break  # non-retryable or exhausted retries

        # If all retries failed, mark as failed
        if last_error is not None:
            logger.warning(
                "AlphaGenome batch [%d/%d] %s:%d FAILED after %d attempts: %s",
                idx + 1, len(variants), v.chrom, v.pos,
                MAX_RETRIES, str(last_error)[:200],
            )
            pred_row = (
                await db.execute(
                    select(AlphaGenomePrediction)
                    .where(AlphaGenomePrediction.variant_id == v.id)
                )
            ).scalar_one_or_none()
            if pred_row:
                pred_row.status = "failed"
                pred_row.error_message = str(last_error)[:500]
                await db.commit()

        # Rate limit
        await asyncio.sleep(BATCH_DELAY_SECONDS)

    logger.info("AlphaGenome batch complete for sample %s", sample_id)


async def get_sample_predictions(
    sample_id: str,
    db,
) -> list[dict[str, Any]]:
    """Return all stored AlphaGenome predictions for a sample."""
    from sqlalchemy import select
    from app.models.alphagenome_prediction import AlphaGenomePrediction

    result = await db.execute(
        select(AlphaGenomePrediction)
        .where(AlphaGenomePrediction.sample_id == sample_id)
        .order_by(AlphaGenomePrediction.variant_effect_score.desc().nullslast())
    )
    rows = result.scalars().all()

    return [
        {
            "id": str(r.id),
            "variant_id": str(r.variant_id),
            "chrom": r.chrom,
            "pos": r.pos,
            "ref": r.ref,
            "alt": r.alt,
            "gene_symbol": r.gene_symbol,
            "output_type": r.output_type,
            "variant_effect_score": r.variant_effect_score,
            "ref_tracks": r.ref_tracks,
            "alt_tracks": r.alt_tracks,
            "interval_chrom": r.interval_chrom,
            "interval_start": r.interval_start,
            "interval_end": r.interval_end,
            "status": r.status,
            "error_message": r.error_message,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        }
        for r in rows
    ]


async def get_prediction_stats(
    sample_id: str,
    db,
) -> dict[str, Any]:
    """Return aggregate AlphaGenome stats for a sample."""
    from sqlalchemy import select, func
    from app.models.alphagenome_prediction import AlphaGenomePrediction

    base_q = select(AlphaGenomePrediction).where(
        AlphaGenomePrediction.sample_id == sample_id
    )

    result = await db.execute(base_q)
    rows = result.scalars().all()

    total = len(rows)
    completed = [r for r in rows if r.status == "completed"]
    failed = [r for r in rows if r.status == "failed"]
    running = [r for r in rows if r.status == "running"]
    pending = [r for r in rows if r.status == "pending"]

    scores = [r.variant_effect_score for r in completed if r.variant_effect_score is not None]
    mean_score = round(sum(scores) / len(scores), 4) if scores else 0.0
    max_score = round(max(scores), 4) if scores else 0.0
    high_impact = len([s for s in scores if s >= 0.5])

    # Score distribution bins
    bins = [
        {"label": "< 0.1", "min": 0.0, "max": 0.1, "count": 0},
        {"label": "0.1–0.2", "min": 0.1, "max": 0.2, "count": 0},
        {"label": "0.2–0.5", "min": 0.2, "max": 0.5, "count": 0},
        {"label": "0.5–1.0", "min": 0.5, "max": 1.0, "count": 0},
        {"label": "≥ 1.0", "min": 1.0, "max": 999.0, "count": 0},
    ]
    for s in scores:
        for b in bins:
            if b["min"] <= s < b["max"]:
                b["count"] += 1
                break

    # Top impact variants
    top_variants = sorted(completed, key=lambda r: r.variant_effect_score or 0, reverse=True)[:10]
    top = [
        {
            "variant_id": str(r.variant_id),
            "chrom": r.chrom,
            "pos": r.pos,
            "ref": r.ref,
            "alt": r.alt,
            "gene_symbol": r.gene_symbol,
            "variant_effect_score": r.variant_effect_score,
        }
        for r in top_variants
    ]

    return {
        "total": total,
        "completed": len(completed),
        "failed": len(failed),
        "running": len(running),
        "pending": len(pending),
        "mean_score": mean_score,
        "max_score": max_score,
        "high_impact_count": high_impact,
        "score_distribution": [{"label": b["label"], "count": b["count"]} for b in bins],
        "top_variants": top,
    }


async def get_batch_status(
    sample_id: str,
    db,
) -> dict[str, Any]:
    """Return batch job progress for a sample."""
    from sqlalchemy import select, func
    from app.models.alphagenome_prediction import AlphaGenomePrediction
    from app.models.variant import Variant

    # Total variants in sample
    total_result = await db.execute(
        select(func.count()).select_from(Variant).where(Variant.sample_id == sample_id)
    )
    total_variants = total_result.scalar_one()

    # Prediction counts by status
    pred_result = await db.execute(
        select(
            AlphaGenomePrediction.status,
            func.count(AlphaGenomePrediction.id),
        )
        .where(AlphaGenomePrediction.sample_id == sample_id)
        .group_by(AlphaGenomePrediction.status)
    )
    status_counts = {row[0]: row[1] for row in pred_result.all()}

    completed = status_counts.get("completed", 0)
    failed = status_counts.get("failed", 0)
    running = status_counts.get("running", 0)
    pending = status_counts.get("pending", 0)
    processed = completed + failed

    is_running = running > 0 or pending > 0
    progress = round(processed / total_variants * 100, 1) if total_variants else 0

    return {
        "total_variants": total_variants,
        "completed": completed,
        "failed": failed,
        "running": running,
        "pending": pending,
        "processed": processed,
        "progress": progress,
        "is_running": is_running,
    }

