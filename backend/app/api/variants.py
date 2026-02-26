from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pathlib import Path
from uuid import UUID
import tempfile
import os
import csv
import io

from app.core.database import get_db
from app.models.variant import Variant
from app.schemas.variant import VariantResponse, UploadResponse, VariantListResponse
from app.services.vcf_parser import parse_and_store_vcf
from app.services.annotation_service import annotate_variants_by_upload_id

router = APIRouter(prefix="/variants", tags=["variants"])


@router.post("/upload", response_model=UploadResponse)
async def upload_vcf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload and parse a VCF file.

    Validates the file is a valid VCF, parses variants using pysam,
    normalizes them, and stores in PostgreSQL.
    Triggers annotation in background after upload.
    """
    # Validate file extension
    if not file.filename.endswith(('.vcf', '.vcf.gz')):
        raise HTTPException(
            status_code=400,
            detail="File must be a VCF file (.vcf or .vcf.gz)"
        )

    # Save uploaded file to temporary location
    with tempfile.NamedTemporaryFile(delete=False, suffix='.vcf') as tmp_file:
        tmp_path = Path(tmp_file.name)
        contents = await file.read()
        tmp_file.write(contents)

    try:
        # Parse and store variants
        variant_count, upload_id = await parse_and_store_vcf(tmp_path, db)

        # Trigger annotation in background
        # Note: We need to create a new db session for the background task
        async def annotate_upload():
            from app.core.database import AsyncSessionLocal
            async with AsyncSessionLocal() as bg_db:
                await annotate_variants_by_upload_id(upload_id, bg_db)

        background_tasks.add_task(annotate_upload)

        return UploadResponse(
            status="success",
            variant_count=variant_count,
            upload_id=upload_id,
            message=f"Successfully parsed and stored {variant_count} variants. Annotation in progress."
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing VCF file: {str(e)}"
        )

    finally:
        # Clean up temporary file
        if tmp_path.exists():
            os.unlink(tmp_path)


@router.get("", response_model=VariantListResponse)
async def get_variants(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    gene: str | None = Query(None, description="Filter by gene symbol"),
    significance: str | None = Query(None, description="Filter by ClinVar significance"),
    af_max: float | None = Query(None, ge=0, le=1, description="Maximum allele frequency (gnomAD)"),
    consequence: str | None = Query(None, description="Filter by consequence type"),
    min_score: int | None = Query(None, ge=0, description="Minimum risk score"),
    max_score: int | None = Query(None, ge=0, description="Maximum risk score"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get paginated list of variants with optional filtering.

    Supports filtering by:
    - gene: Gene symbol (exact match)
    - significance: ClinVar significance (partial match)
    - af_max: Maximum gnomAD allele frequency
    - consequence: Consequence type (partial match)
    - min_score: Minimum risk score
    - max_score: Maximum risk score

    Returns variants with pagination support.
    """
    # Build base query with filters
    query = select(Variant)

    # Apply filters
    if gene:
        query = query.where(Variant.gene_symbol == gene)

    if significance:
        query = query.where(Variant.clinvar_significance.ilike(f"%{significance}%"))

    if af_max is not None:
        query = query.where(Variant.gnomad_af <= af_max)

    if consequence:
        query = query.where(Variant.consequence.ilike(f"%{consequence}%"))

    if min_score is not None:
        query = query.where(Variant.risk_score >= min_score)

    if max_score is not None:
        query = query.where(Variant.risk_score <= max_score)

    # Get total count with filters
    count_query = select(func.count()).select_from(query.subquery())
    result = await db.execute(count_query)
    total = result.scalar_one()

    # Calculate offset and add pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(Variant.created_at.desc())

    # Execute query
    result = await db.execute(query)
    variants = result.scalars().all()

    return VariantListResponse(
        variants=[VariantResponse.model_validate(v) for v in variants],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/export/csv")
async def export_variants_csv(
    gene: str | None = Query(None, description="Filter by gene symbol"),
    significance: str | None = Query(None, description="Filter by ClinVar significance"),
    af_max: float | None = Query(None, ge=0, le=1, description="Maximum allele frequency (gnomAD)"),
    consequence: str | None = Query(None, description="Filter by consequence type"),
    min_score: int | None = Query(None, ge=0, description="Minimum risk score"),
    max_score: int | None = Query(None, ge=0, description="Maximum risk score"),
    db: AsyncSession = Depends(get_db)
):
    """
    Export filtered variants as CSV.

    Supports the same filters as GET /variants:
    - gene: Gene symbol (exact match)
    - significance: ClinVar significance (partial match)
    - af_max: Maximum gnomAD allele frequency
    - consequence: Consequence type (partial match)
    - min_score: Minimum risk score
    - max_score: Maximum risk score

    Returns a CSV file with all matching variants.
    """
    # Build query with same filters as get_variants
    query = select(Variant)

    # Apply filters
    if gene:
        query = query.where(Variant.gene_symbol == gene)

    if significance:
        query = query.where(Variant.clinvar_significance.ilike(f"%{significance}%"))

    if af_max is not None:
        query = query.where(Variant.gnomad_af <= af_max)

    if consequence:
        query = query.where(Variant.consequence.ilike(f"%{consequence}%"))

    if min_score is not None:
        query = query.where(Variant.risk_score >= min_score)

    if max_score is not None:
        query = query.where(Variant.risk_score <= max_score)

    # Execute query (no pagination for export)
    query = query.order_by(Variant.created_at.desc())
    result = await db.execute(query)
    variants = result.scalars().all()

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow([
        "ID",
        "Chromosome",
        "Position",
        "Reference",
        "Alternate",
        "rsID",
        "Gene",
        "Transcript",
        "Consequence",
        "Protein Change",
        "ClinVar Significance",
        "ClinVar Review Status",
        "ClinVar Condition",
        "gnomAD AF",
        "gnomAD AC",
        "gnomAD AN",
        "Risk Score",
        "Quality",
        "Filter Status",
        "Depth",
        "Allele Frequency",
        "Upload ID",
        "Annotation Status",
        "Created At"
    ])

    # Write data rows
    for variant in variants:
        writer.writerow([
            str(variant.id),
            variant.chrom,
            variant.pos,
            variant.ref,
            variant.alt,
            variant.rs_id or "",
            variant.gene_symbol or "",
            variant.transcript_id or "",
            variant.consequence or "",
            variant.protein_change or "",
            variant.clinvar_significance or "",
            variant.clinvar_review_status or "",
            variant.clinvar_condition or "",
            variant.gnomad_af if variant.gnomad_af is not None else "",
            variant.gnomad_ac if variant.gnomad_ac is not None else "",
            variant.gnomad_an if variant.gnomad_an is not None else "",
            variant.risk_score if variant.risk_score is not None else "",
            variant.qual if variant.qual is not None else "",
            variant.filter_status or "",
            variant.depth if variant.depth is not None else "",
            variant.allele_freq if variant.allele_freq is not None else "",
            variant.upload_id or "",
            variant.annotation_status or "",
            variant.created_at.isoformat() if variant.created_at else ""
        ])

    # Return CSV as streaming response
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=variants_export.csv"
        }
    )


@router.get("/{variant_id}", response_model=VariantResponse)
async def get_variant(
    variant_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a single variant by ID with full annotation details.

    Returns complete variant information including all annotation fields
    from ClinVar, gnomAD, and Ensembl.
    """
    # Query for the variant
    query = select(Variant).where(Variant.id == variant_id)
    result = await db.execute(query)
    variant = result.scalar_one_or_none()

    if not variant:
        raise HTTPException(
            status_code=404,
            detail=f"Variant with ID {variant_id} not found"
        )

    return VariantResponse.model_validate(variant)
