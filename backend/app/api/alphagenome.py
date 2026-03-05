"""
AlphaGenome variant effect prediction API endpoints.

Exposes endpoints for single predictions, batch processing,
stored results, and dashboard statistics.
"""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, AsyncSessionLocal
from app.core.deps import get_current_user
from app.services.alphagenome_service import (
    predict_variant_effect,
    run_batch_predictions,
    get_sample_predictions,
    get_prediction_stats,
    get_batch_status,
    VALID_OUTPUT_TYPES,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/alphagenome",
    tags=["alphagenome"],
    dependencies=[Depends(get_current_user)],
)


# ---- Request / Response Models ----

class PredictRequest(BaseModel):
    """Request body for single variant effect prediction."""
    chrom: str = Field(..., description="Chromosome, e.g. 'chr22'")
    pos: int = Field(..., gt=0, description="Genomic position (1-based)")
    ref: str = Field(..., min_length=1, description="Reference allele")
    alt: str = Field(..., min_length=1, description="Alternate allele")
    output_type: str = Field(
        "RNA_SEQ",
        description=f"Output type: {', '.join(VALID_OUTPUT_TYPES)}",
    )


class VariantInfo(BaseModel):
    chromosome: str
    position: int
    ref: str
    alt: str


class IntervalInfo(BaseModel):
    chromosome: str
    start: int
    end: int


class PredictResponse(BaseModel):
    """Variant effect prediction response."""
    ref_tracks: list[float]
    alt_tracks: list[float]
    variant_effect_score: float
    output_type: str
    interval: IntervalInfo
    variant: VariantInfo
    ontology_term: str | None


class BatchRunResponse(BaseModel):
    """Response when a batch prediction job is started."""
    message: str
    sample_id: str


# ---- Single Prediction ----

@router.post("/predict", response_model=PredictResponse)
async def predict_variant(request: PredictRequest):
    """
    Run AlphaGenome variant effect prediction for a single variant.
    """
    try:
        result = await predict_variant_effect(
            chrom=request.chrom,
            pos=request.pos,
            ref=request.ref,
            alt=request.alt,
            output_type=request.output_type,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.exception("AlphaGenome prediction failed")
        raise HTTPException(
            status_code=500,
            detail=f"AlphaGenome prediction failed: {str(e)}",
        )


# ---- Batch Processing ----

@router.post("/run-batch/{sample_id}", response_model=BatchRunResponse)
async def start_batch_prediction(
    sample_id: UUID,
    background_tasks: BackgroundTasks,
    output_type: str = Query("RNA_SEQ", description="Output type for batch"),
):
    """
    Trigger background AlphaGenome predictions for all variants in a sample.
    Predictions that already completed will be skipped.
    """
    async def _run():
        async with AsyncSessionLocal() as bg_db:
            await run_batch_predictions(
                sample_id=str(sample_id),
                db=bg_db,
                output_type=output_type,
            )

    background_tasks.add_task(_run)

    return BatchRunResponse(
        message="Batch prediction started. Check /status for progress.",
        sample_id=str(sample_id),
    )


# ---- Stored Predictions ----

@router.get("/predictions/{sample_id}")
async def list_predictions(
    sample_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Return all stored AlphaGenome predictions for a sample."""
    try:
        predictions = await get_sample_predictions(str(sample_id), db)
        return {"predictions": predictions, "count": len(predictions)}
    except Exception as e:
        logger.exception("Failed to fetch predictions")
        raise HTTPException(status_code=500, detail=str(e))


# ---- Dashboard Stats ----

@router.get("/stats/{sample_id}")
async def prediction_stats(
    sample_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Return aggregate AlphaGenome stats for the dashboard."""
    try:
        stats = await get_prediction_stats(str(sample_id), db)
        return stats
    except Exception as e:
        logger.exception("Failed to fetch stats")
        raise HTTPException(status_code=500, detail=str(e))


# ---- Batch Status ----

@router.get("/status/{sample_id}")
async def batch_status(
    sample_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Return batch job progress for a sample."""
    try:
        status = await get_batch_status(str(sample_id), db)
        return status
    except Exception as e:
        logger.exception("Failed to fetch batch status")
        raise HTTPException(status_code=500, detail=str(e))
