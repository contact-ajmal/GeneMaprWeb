"""
Pharmacogenomics API endpoint.

Returns PGx-relevant variants, drug interactions, gene summaries, and
a full allele reference table from the knowledge base.
"""
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.pharmacogenomics import (
    PharmacogenomicsResponse,
    GeneReference,
    AlleleReference,
)
from app.services.pharmacogenomics_service import (
    get_pgx_data_for_all_variants,
    DRUG_GENE_MAP,
)

router = APIRouter(prefix="/pharmacogenomics", tags=["pharmacogenomics"])


@router.get("", response_model=PharmacogenomicsResponse)
async def get_pharmacogenomics(
    sample_id: UUID | None = Query(None, description="Filter by sample ID"),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve pharmacogenomic analysis for all annotated variants.

    Returns detected PGx variants, drug interactions with clinical
    recommendations, per-gene metabolizer summaries, and the full
    allele function reference table.
    """
    report = await get_pgx_data_for_all_variants(db, sample_id=sample_id)

    # Build allele reference from the knowledge base
    allele_reference: list[GeneReference] = []
    for gene, data in sorted(DRUG_GENE_MAP.items()):
        alleles_ref: dict[str, AlleleReference] = {}
        for allele_name, allele_info in data["alleles"].items():
            alleles_ref[allele_name] = AlleleReference(
                rsid=allele_info.get("rsid"),
                change=allele_info.get("change", ""),
                function=allele_info.get("function", ""),
            )
        allele_reference.append(
            GeneReference(
                gene=gene,
                chromosome=data.get("chromosome"),
                alleles=alleles_ref,
                drug_count=len(data["drugs"]),
            )
        )

    return PharmacogenomicsResponse(
        pgx_variants=report["pgx_variants"],
        drug_interactions=report["drug_interactions"],
        gene_summaries=report["gene_summaries"],
        summary=report["summary"],
        allele_reference=allele_reference,
    )
