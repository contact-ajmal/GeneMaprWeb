"""
Annotation orchestrator service.

Coordinates calls to ClinVar, gnomAD, and Ensembl services.
Updates variant records with annotation results.
"""
import asyncio
from datetime import datetime
from typing import List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.variant import Variant
from app.services.clinvar_service import get_clinvar_annotation
from app.services.gnomad_service import get_gnomad_annotation
from app.services.ensembl_service import get_ensembl_annotation
from app.services.scoring_service import score_variant
from app.services.ai_summary_service import generate_and_store_summary


async def annotate_variant(variant: Variant, db: AsyncSession) -> None:
    """
    Annotate a single variant by calling all annotation services.

    Updates the variant record in the database with annotation results.
    Uses asyncio.gather for concurrent API calls.
    """
    try:
        # Call all annotation services concurrently
        clinvar_data, gnomad_data, ensembl_data = await asyncio.gather(
            get_clinvar_annotation(
                variant.chrom,
                variant.pos,
                variant.ref,
                variant.alt
            ),
            get_gnomad_annotation(
                variant.chrom,
                variant.pos,
                variant.ref,
                variant.alt
            ),
            get_ensembl_annotation(
                variant.chrom,
                variant.pos,
                variant.ref,
                variant.alt
            ),
            return_exceptions=True  # Don't fail if one service errors
        )

        # Update variant with ClinVar data
        if isinstance(clinvar_data, dict):
            variant.clinvar_significance = clinvar_data.get("clinvar_significance")
            variant.clinvar_review_status = clinvar_data.get("clinvar_review_status")
            variant.clinvar_condition = clinvar_data.get("clinvar_condition")

        # Update variant with gnomAD data
        if isinstance(gnomad_data, dict):
            variant.gnomad_af = gnomad_data.get("gnomad_af")
            variant.gnomad_ac = gnomad_data.get("gnomad_ac")
            variant.gnomad_an = gnomad_data.get("gnomad_an")

        # Update variant with Ensembl data
        if isinstance(ensembl_data, dict):
            variant.gene_symbol = ensembl_data.get("gene_symbol")
            variant.transcript_id = ensembl_data.get("transcript_id")
            variant.consequence = ensembl_data.get("consequence")
            variant.protein_change = ensembl_data.get("protein_change")

        # Calculate risk score and generate AI summary
        score_variant(variant)
        await generate_and_store_summary(variant)

        # Update annotation metadata
        variant.annotation_status = "completed"
        variant.annotated_at = datetime.utcnow()

        # Commit changes
        await db.commit()
        await db.refresh(variant)

    except Exception as e:
        # Mark annotation as failed but don't crash
        print(f"Annotation error for variant {variant.id}: {str(e)}")
        variant.annotation_status = "failed"
        variant.annotated_at = datetime.utcnow()
        await db.commit()


async def annotate_variants_by_upload_id(upload_id: str, db: AsyncSession) -> int:
    """
    Annotate all variants for a given upload_id.

    Returns:
        Number of variants annotated
    """
    # Fetch all variants for this upload
    query = select(Variant).where(Variant.upload_id == upload_id)
    result = await db.execute(query)
    variants = result.scalars().all()

    # Annotate each variant
    for variant in variants:
        await annotate_variant(variant, db)

    return len(variants)


async def annotate_variant_by_id(variant_id: UUID, db: AsyncSession) -> Variant:
    """
    Annotate a single variant by ID.

    Returns:
        The annotated variant
    """
    # Fetch variant
    query = select(Variant).where(Variant.id == variant_id)
    result = await db.execute(query)
    variant = result.scalar_one_or_none()

    if not variant:
        raise ValueError(f"Variant {variant_id} not found")

    # Annotate
    await annotate_variant(variant, db)

    return variant
