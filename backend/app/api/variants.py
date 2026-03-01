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
from app.schemas.variant import (
    VariantResponse,
    VariantDetailResponse,
    ACMGClassification,
    ACMGCriterionDetail,
    PopulationFrequencies,
    ExternalLinks,
    UploadResponse,
    VariantListResponse,
    VariantStatsResponse,
    TopGene,
    DistributionItem,
    GenomeViewResponse,
    GenomeAnnotation,
    ChromosomeSummary,
)
from app.services.vcf_parser import parse_and_store_vcf
from app.services.annotation_service import annotate_variants_by_upload_id
from app.services.acmg_service import assess_acmg_criteria
from app.services.gnomad_service import get_population_frequencies

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
    if not file.filename or not file.filename.endswith(('.vcf', '.vcf.gz')):
        raise HTTPException(
            status_code=400,
            detail="File must be a VCF file (.vcf or .vcf.gz)"
        )

    # Save uploaded file to temporary location
    contents = await file.read()

    with tempfile.NamedTemporaryFile(delete=False, suffix='.vcf') as tmp_file:
        tmp_path = Path(tmp_file.name)
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


@router.get("/stats", response_model=VariantStatsResponse)
async def get_variant_stats(
    sample_id: UUID | None = Query(None, description="Filter by sample ID"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get aggregated statistics from the current dataset.

    Returns comprehensive statistics including:
    - Total variant counts by ClinVar significance
    - High risk variant counts (risk_score >= 8)
    - Mean risk score and allele frequency
    - Top 10 genes by variant count
    - Distribution of variants by consequence type
    - Distribution by ClinVar significance
    - Distribution by risk score ranges
    - Distribution by allele frequency ranges
    """
    # Helper to apply sample filter
    def _sample_filter(q):
        if sample_id:
            return q.where(Variant.sample_id == sample_id)
        return q

    # Get total variants
    total_result = await db.execute(
        _sample_filter(select(func.count()).select_from(Variant))
    )
    total_variants = total_result.scalar_one()

    if total_variants == 0:
        # Return empty stats if no variants
        return VariantStatsResponse(
            total_variants=0,
            pathogenic_count=0,
            likely_pathogenic_count=0,
            vus_count=0,
            benign_count=0,
            high_risk_count=0,
            mean_risk_score=0.0,
            mean_allele_frequency=0.0,
            unique_genes=0,
            top_genes=[],
            consequence_distribution=[],
            clinvar_distribution=[],
            risk_score_distribution=[],
            af_distribution=[]
        )

    # Count by ClinVar significance
    pathogenic_result = await db.execute(
        _sample_filter(
            select(func.count()).select_from(Variant)
            .where(Variant.clinvar_significance.ilike('%pathogenic%'))
            .where(~Variant.clinvar_significance.ilike('%likely%'))
        )
    )
    pathogenic_count = pathogenic_result.scalar_one()

    likely_pathogenic_result = await db.execute(
        _sample_filter(
            select(func.count()).select_from(Variant)
            .where(Variant.clinvar_significance.ilike('%likely pathogenic%'))
        )
    )
    likely_pathogenic_count = likely_pathogenic_result.scalar_one()

    vus_result = await db.execute(
        _sample_filter(
            select(func.count()).select_from(Variant)
            .where(Variant.clinvar_significance.ilike('%uncertain%'))
        )
    )
    vus_count = vus_result.scalar_one()

    benign_result = await db.execute(
        _sample_filter(
            select(func.count()).select_from(Variant)
            .where(Variant.clinvar_significance.ilike('%benign%'))
        )
    )
    benign_count = benign_result.scalar_one()

    # High risk count (risk_score >= 8)
    high_risk_result = await db.execute(
        _sample_filter(
            select(func.count()).select_from(Variant)
            .where(Variant.risk_score >= 8)
        )
    )
    high_risk_count = high_risk_result.scalar_one()

    # Mean risk score
    mean_risk_result = await db.execute(
        _sample_filter(
            select(func.avg(Variant.risk_score))
            .where(Variant.risk_score.isnot(None))
        )
    )
    mean_risk_score = float(mean_risk_result.scalar_one() or 0.0)

    # Mean allele frequency
    mean_af_result = await db.execute(
        _sample_filter(
            select(func.avg(Variant.gnomad_af))
            .where(Variant.gnomad_af.isnot(None))
        )
    )
    mean_allele_frequency = float(mean_af_result.scalar_one() or 0.0)

    # Unique genes
    unique_genes_result = await db.execute(
        _sample_filter(
            select(func.count(func.distinct(Variant.gene_symbol)))
            .where(Variant.gene_symbol.isnot(None))
        )
    )
    unique_genes = unique_genes_result.scalar_one()

    # Top 10 genes by variant count with max risk score
    top_genes_q = (
        select(
            Variant.gene_symbol,
            func.count(Variant.id).label('count'),
            func.max(Variant.risk_score).label('max_risk')
        )
        .where(Variant.gene_symbol.isnot(None))
        .group_by(Variant.gene_symbol)
        .order_by(func.count(Variant.id).desc())
        .limit(10)
    )
    if sample_id:
        top_genes_q = top_genes_q.where(Variant.sample_id == sample_id)
    top_genes_result = await db.execute(top_genes_q)
    top_genes = [
        TopGene(gene=row[0], count=row[1], max_risk=row[2] or 0)
        for row in top_genes_result.all()
    ]

    # Consequence distribution
    cons_q = (
        select(
            Variant.consequence,
            func.count(Variant.id).label('count')
        )
        .where(Variant.consequence.isnot(None))
        .group_by(Variant.consequence)
        .order_by(func.count(Variant.id).desc())
    )
    if sample_id:
        cons_q = cons_q.where(Variant.sample_id == sample_id)
    consequence_result = await db.execute(cons_q)
    consequence_distribution = [
        DistributionItem(name=row[0], count=row[1])
        for row in consequence_result.all()
    ]

    # ClinVar distribution
    clinvar_q = (
        select(
            Variant.clinvar_significance,
            func.count(Variant.id).label('count')
        )
        .where(Variant.clinvar_significance.isnot(None))
        .group_by(Variant.clinvar_significance)
        .order_by(func.count(Variant.id).desc())
    )
    if sample_id:
        clinvar_q = clinvar_q.where(Variant.sample_id == sample_id)
    clinvar_result = await db.execute(clinvar_q)
    clinvar_distribution = [
        DistributionItem(name=row[0], count=row[1])
        for row in clinvar_result.all()
    ]

    # Risk score distribution (0-2, 3-5, 6-8, 9+)
    risk_ranges = [
        ("0-2", 0, 2),
        ("3-5", 3, 5),
        ("6-8", 6, 8),
        ("9+", 9, float('inf'))
    ]
    risk_score_distribution = []
    for range_name, min_val, max_val in risk_ranges:
        if max_val == float('inf'):
            rq = _sample_filter(
                select(func.count()).select_from(Variant)
                .where(Variant.risk_score >= min_val)
            )
        else:
            rq = _sample_filter(
                select(func.count()).select_from(Variant)
                .where(Variant.risk_score >= min_val)
                .where(Variant.risk_score <= max_val)
            )
        count_result = await db.execute(rq)
        count = count_result.scalar_one()
        if count > 0:
            risk_score_distribution.append(DistributionItem(name=range_name, count=count))

    # Allele frequency distribution (<0.001, 0.001-0.01, 0.01-0.05, >0.05)
    af_ranges = [
        ("<0.001", 0, 0.001),
        ("0.001-0.01", 0.001, 0.01),
        ("0.01-0.05", 0.01, 0.05),
        (">0.05", 0.05, float('inf'))
    ]
    af_distribution = []
    for range_name, min_val, max_val in af_ranges:
        if max_val == float('inf'):
            aq = _sample_filter(
                select(func.count()).select_from(Variant)
                .where(Variant.gnomad_af >= min_val)
            )
        else:
            aq = _sample_filter(
                select(func.count()).select_from(Variant)
                .where(Variant.gnomad_af >= min_val)
                .where(Variant.gnomad_af < max_val)
            )
        count_result = await db.execute(aq)
        count = count_result.scalar_one()
        if count > 0:
            af_distribution.append(DistributionItem(name=range_name, count=count))

    return VariantStatsResponse(
        total_variants=total_variants,
        pathogenic_count=pathogenic_count,
        likely_pathogenic_count=likely_pathogenic_count,
        vus_count=vus_count,
        benign_count=benign_count,
        high_risk_count=high_risk_count,
        mean_risk_score=round(mean_risk_score, 2),
        mean_allele_frequency=round(mean_allele_frequency, 6),
        unique_genes=unique_genes,
        top_genes=top_genes,
        consequence_distribution=consequence_distribution,
        clinvar_distribution=clinvar_distribution,
        risk_score_distribution=risk_score_distribution,
        af_distribution=af_distribution
    )


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
    sample_id: UUID | None = Query(None, description="Filter by sample ID"),
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
    - sample_id: Filter to a specific sample

    Returns variants with pagination support.
    """
    # Build base query with filters
    query = select(Variant)

    # Sample filter
    if sample_id:
        query = query.where(Variant.sample_id == sample_id)

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

    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return VariantListResponse(
        variants=[VariantResponse.model_validate(v) for v in variants],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/export/csv")
async def export_variants_csv(
    gene: str | None = Query(None, description="Filter by gene symbol"),
    significance: str | None = Query(None, description="Filter by ClinVar significance"),
    af_max: float | None = Query(None, ge=0, le=1, description="Maximum allele frequency (gnomAD)"),
    consequence: str | None = Query(None, description="Filter by consequence type"),
    min_score: int | None = Query(None, ge=0, description="Minimum risk score"),
    max_score: int | None = Query(None, ge=0, description="Maximum risk score"),
    sample_id: UUID | None = Query(None, description="Filter by sample ID"),
    db: AsyncSession = Depends(get_db)
):
    """Export filtered variants as CSV."""
    # Build query with same filters as get_variants
    query = select(Variant)

    if sample_id:
        query = query.where(Variant.sample_id == sample_id)

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


@router.get("/genome-view", response_model=GenomeViewResponse)
async def get_genome_view(
    gene: str | None = Query(None, description="Filter by gene symbol"),
    significance: str | None = Query(None, description="Filter by ClinVar significance"),
    af_max: float | None = Query(None, ge=0, le=1, description="Maximum allele frequency"),
    consequence: str | None = Query(None, description="Filter by consequence type"),
    min_score: int | None = Query(None, ge=0, description="Minimum risk score"),
    max_score: int | None = Query(None, ge=0, description="Maximum risk score"),
    sample_id: UUID | None = Query(None, description="Filter by sample ID"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get variants formatted for genome ideogram visualization.

    Returns annotations array and per-chromosome summary statistics.
    """
    query = select(Variant)

    if sample_id:
        query = query.where(Variant.sample_id == sample_id)

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

    query = query.order_by(Variant.chrom, Variant.pos)
    result = await db.execute(query)
    variants = result.scalars().all()

    annotations: list[GenomeAnnotation] = []
    summary: dict[str, dict] = {}

    for v in variants:
        chrom = v.chrom.replace("chr", "")
        label = v.gene_symbol or ""
        if v.protein_change:
            label = f"{label} {v.protein_change}".strip()
        if not label:
            label = f"{chrom}:{v.pos}"

        annotations.append(GenomeAnnotation(
            name=label,
            chr=chrom,
            start=v.pos,
            stop=v.pos + max(len(v.ref), 1),
            risk_score=v.risk_score,
            clinvar_significance=v.clinvar_significance,
            consequence=v.consequence,
            gene=v.gene_symbol,
            allele_frequency=v.gnomad_af,
            variant_id=str(v.id),
        ))

        if chrom not in summary:
            summary[chrom] = {"count": 0, "max_risk": 0, "pathogenic": 0}
        summary[chrom]["count"] += 1
        summary[chrom]["max_risk"] = max(
            summary[chrom]["max_risk"], v.risk_score or 0
        )
        sig = (v.clinvar_significance or "").lower()
        if "pathogenic" in sig and "benign" not in sig:
            summary[chrom]["pathogenic"] += 1

    chromosome_summary = {
        k: ChromosomeSummary(**v) for k, v in summary.items()
    }

    return GenomeViewResponse(
        annotations=annotations,
        chromosome_summary=chromosome_summary,
    )


@router.get("/{variant_id}", response_model=VariantDetailResponse)
async def get_variant(
    variant_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a single variant by ID with full annotation details,
    ACMG classification, population frequencies, and external links.
    """
    query = select(Variant).where(Variant.id == variant_id)
    result = await db.execute(query)
    variant = result.scalar_one_or_none()

    if not variant:
        raise HTTPException(
            status_code=404,
            detail=f"Variant with ID {variant_id} not found"
        )

    # Build base response
    base = VariantResponse.model_validate(variant)
    response_data = base.model_dump()

    # ACMG classification
    acmg_raw = assess_acmg_criteria(variant)
    acmg = ACMGClassification(
        criteria_met=acmg_raw["criteria_met"],
        criteria_details={
            k: ACMGCriterionDetail(**v) for k, v in acmg_raw["criteria_details"].items()
        },
        classification=acmg_raw["classification"],
        classification_reason=acmg_raw["classification_reason"],
    )
    response_data["acmg_criteria"] = acmg

    # Population frequencies (try cache first, then live query)
    try:
        pop_freq = await get_population_frequencies(
            variant.chrom, variant.pos, variant.ref, variant.alt
        )
        # If we have no population data from the API but do have gnomad_af,
        # use the stored value as the overall frequency
        if pop_freq["overall"] is None and variant.gnomad_af is not None:
            pop_freq["overall"] = variant.gnomad_af
        response_data["population_frequencies"] = PopulationFrequencies(**pop_freq)
    except Exception:
        # Graceful degradation — return what we have from the variant record
        response_data["population_frequencies"] = PopulationFrequencies(
            overall=variant.gnomad_af
        )

    # External links
    chrom_clean = variant.chrom.replace("chr", "")
    gene = variant.gene_symbol or ""
    rs_id = variant.rs_id or ""
    protein_change = variant.protein_change or ""
    variant_desc = f"{gene} {protein_change}".strip() if gene else f"{chrom_clean}:{variant.pos}"

    links = ExternalLinks(
        clinvar=f"https://www.ncbi.nlm.nih.gov/clinvar/?term={chrom_clean}[chr]+AND+{variant.pos}[chrpos37]" if variant.pos else None,
        gnomad=f"https://gnomad.broadinstitute.org/variant/{chrom_clean}-{variant.pos}-{variant.ref}-{variant.alt}?dataset=gnomad_r4",
        ensembl=f"https://www.ensembl.org/Homo_sapiens/Variation/Explore?v={rs_id}" if rs_id else None,
        pubmed=f"https://pubmed.ncbi.nlm.nih.gov/?term={variant_desc.replace(' ', '+')}",
        uniprot=f"https://www.uniprot.org/uniprotkb?query={gene}+AND+organism_id:9606" if gene else None,
    )
    response_data["external_links"] = links

    return VariantDetailResponse(**response_data)
