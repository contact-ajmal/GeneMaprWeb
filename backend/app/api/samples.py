from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, or_, case
from pathlib import Path
from uuid import UUID
from datetime import datetime
import tempfile
import os
import csv
import io
import uuid as uuid_mod

from app.core.database import get_db, AsyncSessionLocal
from app.core.deps import get_current_user
from app.models.user import User
from app.models.sample import Sample
from app.models.variant import Variant
from app.schemas.sample import (
    SampleResponse,
    SampleDetailResponse,
    SampleListResponse,
    SampleListSummary,
    SampleUpdate,
    DeleteResponse,
    BulkDeleteRequest,
    BulkDeleteResponse,
    StorageStatsResponse,
    ComparisonResponse,
    UploadWithSampleResponse,
)
from app.schemas.variant import TopGene, DistributionItem, VariantResponse
from app.services.vcf_parser import parse_and_store_vcf
from app.services.annotation_service import annotate_variants_by_upload_id
from app.services.comparison_service import compare_samples

router = APIRouter(
    prefix="/samples",
    tags=["samples"],
    dependencies=[Depends(get_current_user)],
)


async def _compute_sample_stats(sample_id: UUID, db: AsyncSession) -> dict:
    """Compute and update sample statistics from its variants."""
    base = select(Variant).where(Variant.sample_id == sample_id)

    total_result = await db.execute(
        select(func.count()).select_from(base.subquery())
    )
    total = total_result.scalar_one()

    pathogenic_result = await db.execute(
        select(func.count()).select_from(Variant)
        .where(Variant.sample_id == sample_id)
        .where(Variant.clinvar_significance.ilike("%pathogenic%"))
        .where(~Variant.clinvar_significance.ilike("%likely%"))
    )
    pathogenic = pathogenic_result.scalar_one()

    lp_result = await db.execute(
        select(func.count()).select_from(Variant)
        .where(Variant.sample_id == sample_id)
        .where(Variant.clinvar_significance.ilike("%likely pathogenic%"))
    )
    likely_pathogenic = lp_result.scalar_one()

    vus_result = await db.execute(
        select(func.count()).select_from(Variant)
        .where(Variant.sample_id == sample_id)
        .where(Variant.clinvar_significance.ilike("%uncertain%"))
    )
    vus = vus_result.scalar_one()

    benign_result = await db.execute(
        select(func.count()).select_from(Variant)
        .where(Variant.sample_id == sample_id)
        .where(Variant.clinvar_significance.ilike("%benign%"))
    )
    benign = benign_result.scalar_one()

    hr_result = await db.execute(
        select(func.count()).select_from(Variant)
        .where(Variant.sample_id == sample_id)
        .where(Variant.risk_score >= 8)
    )
    high_risk = hr_result.scalar_one()

    mean_result = await db.execute(
        select(func.avg(Variant.risk_score))
        .where(Variant.sample_id == sample_id)
        .where(Variant.risk_score.isnot(None))
    )
    mean_risk = float(mean_result.scalar_one() or 0.0)

    genes_result = await db.execute(
        select(func.count(func.distinct(Variant.gene_symbol)))
        .where(Variant.sample_id == sample_id)
        .where(Variant.gene_symbol.isnot(None))
    )
    unique_genes = genes_result.scalar_one()

    return {
        "total_variants": total,
        "pathogenic_count": pathogenic,
        "likely_pathogenic_count": likely_pathogenic,
        "vus_count": vus,
        "benign_count": benign,
        "high_risk_count": high_risk,
        "mean_risk_score": round(mean_risk, 2),
        "unique_genes": unique_genes,
    }


async def _get_top_genes(sample_id: UUID, db: AsyncSession, limit: int = 5) -> list[TopGene]:
    """Get top genes by variant count for a sample."""
    result = await db.execute(
        select(
            Variant.gene_symbol,
            func.count(Variant.id).label("count"),
            func.max(Variant.risk_score).label("max_risk"),
        )
        .where(Variant.sample_id == sample_id)
        .where(Variant.gene_symbol.isnot(None))
        .group_by(Variant.gene_symbol)
        .order_by(func.count(Variant.id).desc())
        .limit(limit)
    )
    return [TopGene(gene=row[0], count=row[1], max_risk=row[2] or 0) for row in result.all()]


async def _update_sample_stats(sample: Sample, db: AsyncSession):
    """Recompute and persist sample statistics."""
    stats = await _compute_sample_stats(sample.id, db)
    for key, value in stats.items():
        setattr(sample, key, value)
    await db.commit()


# ============================================================
# Upload
# ============================================================

@router.post("/upload", response_model=UploadWithSampleResponse)
async def upload_vcf_with_sample(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    sample_name: str = Form(...),
    relationship_type: str = Form(None),
    description: str = Form(None),
    sample_type: str = Form("germline"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a VCF file associated with a named sample."""
    if not file.filename or not file.filename.endswith((".vcf", ".vcf.gz")):
        raise HTTPException(status_code=400, detail="File must be a VCF file (.vcf or .vcf.gz)")

    valid_relationships = {"proband", "mother", "father", "sibling", "unrelated", None, ""}
    if relationship_type and relationship_type not in valid_relationships:
        raise HTTPException(
            status_code=400,
            detail="Invalid relationship type. Must be one of: proband, mother, father, sibling, unrelated",
        )

    valid_types = {"germline", "somatic", "control"}
    if sample_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid sample type. Must be one of: {', '.join(valid_types)}",
        )

    # Check name uniqueness
    existing = await db.execute(select(Sample).where(Sample.name == sample_name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Sample name '{sample_name}' already exists")

    contents = await file.read()
    file_size = len(contents)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".vcf") as tmp_file:
        tmp_path = Path(tmp_file.name)
        tmp_file.write(contents)

    try:
        upload_id = str(uuid_mod.uuid4())
        sample = Sample(
            id=uuid_mod.uuid4(),
            name=sample_name,
            original_filename=file.filename,
            description=description if description else None,
            relationship_type=relationship_type if relationship_type else None,
            sample_type=sample_type,
            status="processing",
            upload_id=upload_id,
            file_size_bytes=file_size,
            user_id=current_user.id,
        )
        db.add(sample)
        await db.flush()

        variant_count, _ = await parse_and_store_vcf(
            tmp_path, db, upload_id=upload_id, sample_id=sample.id
        )

        # Update initial stats
        sample.total_variants = variant_count
        sample.status = "annotating"
        await db.commit()

        # Background annotation + stats update
        sample_id_str = str(sample.id)

        async def annotate_and_update():
            async with AsyncSessionLocal() as bg_db:
                try:
                    await annotate_variants_by_upload_id(upload_id, bg_db)
                    # Recompute stats after annotation
                    result = await bg_db.execute(select(Sample).where(Sample.id == sample.id))
                    s = result.scalar_one_or_none()
                    if s:
                        stats = await _compute_sample_stats(s.id, bg_db)
                        for key, value in stats.items():
                            setattr(s, key, value)
                        s.status = "complete"
                        s.processing_completed_at = datetime.utcnow()
                        await bg_db.commit()
                except Exception:
                    result = await bg_db.execute(select(Sample).where(Sample.id == sample.id))
                    s = result.scalar_one_or_none()
                    if s:
                        s.status = "failed"
                        await bg_db.commit()

        background_tasks.add_task(annotate_and_update)

        return UploadWithSampleResponse(
            status="success",
            variant_count=variant_count,
            upload_id=upload_id,
            sample_id=sample_id_str,
            sample_name=sample.name,
            message=f"Successfully parsed {variant_count} variants for sample '{sample_name}'. Annotation in progress.",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing VCF file: {str(e)}")
    finally:
        if tmp_path.exists():
            os.unlink(tmp_path)


# ============================================================
# List / Search / Paginate
# ============================================================

@router.get("", response_model=SampleListResponse)
async def list_samples(
    search: str | None = Query(None, description="Search by name, filename, description"),
    status: str | None = Query(None, description="Filter by status"),
    sample_type: str | None = Query(None, description="Filter by sample type"),
    sort_by: str = Query("uploaded_at", description="Sort field"),
    sort_order: str = Query("desc", description="Sort direction: asc or desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all samples with pagination, search, and filtering."""
    query = select(Sample)

    # Scope to current user's samples (admins see all)
    if current_user.role != "admin":
        query = query.where(Sample.user_id == current_user.id)

    # Search
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                Sample.name.ilike(pattern),
                Sample.original_filename.ilike(pattern),
                Sample.description.ilike(pattern),
            )
        )

    # Filters
    if status:
        query = query.where(Sample.status == status)
    else:
        # By default exclude archived
        query = query.where(Sample.status != "archived")

    if sample_type:
        query = query.where(Sample.sample_type == sample_type)

    # Sorting
    sort_map = {
        "uploaded_at": Sample.uploaded_at,
        "name": Sample.name,
        "total_variants": Sample.total_variants,
        "pathogenic_count": Sample.pathogenic_count,
        "mean_risk_score": Sample.mean_risk_score,
    }
    sort_col = sort_map.get(sort_by, Sample.uploaded_at)
    if sort_order == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    # Count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    result = await db.execute(query)
    samples = result.scalars().all()

    # Build responses with top genes
    sample_responses = []
    for s in samples:
        resp = SampleResponse.model_validate(s)
        top = await _get_top_genes(s.id, db, limit=3)
        resp.top_genes = top
        sample_responses.append(resp)

    # Summary stats (across ALL non-archived samples, not just current page)
    summary_q = select(
        func.count(Sample.id),
        func.coalesce(func.sum(Sample.total_variants), 0),
        func.coalesce(func.sum(Sample.pathogenic_count), 0),
        func.coalesce(func.sum(Sample.file_size_bytes), 0),
    ).where(Sample.status != "archived")
    summary_row = (await db.execute(summary_q)).one()

    summary = SampleListSummary(
        total_samples=summary_row[0],
        total_variants_all=summary_row[1],
        total_pathogenic_all=summary_row[2],
        storage_used_bytes=summary_row[3],
    )

    return SampleListResponse(
        samples=sample_responses,
        total=total,
        page=page,
        page_size=page_size,
        summary=summary,
    )


# ============================================================
# Storage Stats
# ============================================================

@router.get("/storage-stats", response_model=StorageStatsResponse)
async def get_storage_stats(db: AsyncSession = Depends(get_db)):
    """Get storage usage statistics."""
    total_samples_result = await db.execute(select(func.count()).select_from(Sample))
    total_samples = total_samples_result.scalar_one()

    total_variants_result = await db.execute(select(func.count()).select_from(Variant))
    total_variants = total_variants_result.scalar_one()

    storage_result = await db.execute(
        select(func.coalesce(func.sum(Sample.file_size_bytes), 0))
    )
    storage_bytes = storage_result.scalar_one()

    # By status
    status_result = await db.execute(
        select(Sample.status, func.count(Sample.id)).group_by(Sample.status)
    )
    samples_by_status = {row[0]: row[1] for row in status_result.all()}

    # By type
    type_result = await db.execute(
        select(Sample.sample_type, func.count(Sample.id)).group_by(Sample.sample_type)
    )
    samples_by_type = {row[0]: row[1] for row in type_result.all()}

    # Oldest / newest
    oldest_result = await db.execute(
        select(Sample).order_by(Sample.uploaded_at.asc()).limit(1)
    )
    oldest = oldest_result.scalar_one_or_none()

    newest_result = await db.execute(
        select(Sample).order_by(Sample.uploaded_at.desc()).limit(1)
    )
    newest = newest_result.scalar_one_or_none()

    def sample_summary(s):
        if not s:
            return None
        return {"id": str(s.id), "name": s.name, "uploaded_at": s.uploaded_at.isoformat()}

    return StorageStatsResponse(
        total_samples=total_samples,
        total_variants=total_variants,
        storage_used_mb=round(storage_bytes / (1024 * 1024), 2),
        samples_by_status=samples_by_status,
        samples_by_type=samples_by_type,
        oldest_sample=sample_summary(oldest),
        newest_sample=sample_summary(newest),
    )


# ============================================================
# Single Sample Detail
# ============================================================

@router.get("/{sample_id}", response_model=SampleDetailResponse)
async def get_sample(
    sample_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get full sample details with variant preview and distributions."""
    result = await db.execute(select(Sample).where(Sample.id == sample_id))
    sample = result.scalar_one_or_none()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")

    # Update last accessed
    sample.last_accessed_at = datetime.utcnow()
    await db.commit()

    resp = SampleDetailResponse.model_validate(sample)

    # Top 5 highest-risk variants
    top_v_result = await db.execute(
        select(Variant)
        .where(Variant.sample_id == sample_id)
        .where(Variant.risk_score.isnot(None))
        .order_by(Variant.risk_score.desc())
        .limit(5)
    )
    resp.top_variants = [VariantResponse.model_validate(v) for v in top_v_result.scalars().all()]

    # Chromosome distribution
    chrom_result = await db.execute(
        select(Variant.chrom, func.count(Variant.id))
        .where(Variant.sample_id == sample_id)
        .group_by(Variant.chrom)
    )
    resp.chromosome_distribution = {row[0]: row[1] for row in chrom_result.all()}

    # Top affected genes
    resp.top_affected_genes = await _get_top_genes(sample_id, db, limit=10)

    # ClinVar distribution
    clinvar_result = await db.execute(
        select(Variant.clinvar_significance, func.count(Variant.id))
        .where(Variant.sample_id == sample_id)
        .where(Variant.clinvar_significance.isnot(None))
        .group_by(Variant.clinvar_significance)
        .order_by(func.count(Variant.id).desc())
    )
    resp.clinvar_distribution = [DistributionItem(name=r[0], count=r[1]) for r in clinvar_result.all()]

    # Consequence distribution
    cons_result = await db.execute(
        select(Variant.consequence, func.count(Variant.id))
        .where(Variant.sample_id == sample_id)
        .where(Variant.consequence.isnot(None))
        .group_by(Variant.consequence)
        .order_by(func.count(Variant.id).desc())
    )
    resp.consequence_distribution = [DistributionItem(name=r[0], count=r[1]) for r in cons_result.all()]

    return resp


# ============================================================
# Update Sample
# ============================================================

@router.put("/{sample_id}", response_model=SampleResponse)
async def update_sample(
    sample_id: UUID,
    update: SampleUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update editable sample fields."""
    result = await db.execute(select(Sample).where(Sample.id == sample_id))
    sample = result.scalar_one_or_none()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")

    if update.name is not None and update.name != sample.name:
        # Check uniqueness
        existing = await db.execute(select(Sample).where(Sample.name == update.name))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail=f"Sample name '{update.name}' already exists")
        sample.name = update.name

    if update.description is not None:
        sample.description = update.description
    if update.relationship_type is not None:
        sample.relationship_type = update.relationship_type
    if update.sample_type is not None:
        sample.sample_type = update.sample_type

    await db.commit()
    await db.refresh(sample)
    return SampleResponse.model_validate(sample)


# ============================================================
# Delete Sample
# ============================================================

@router.delete("/{sample_id}", response_model=DeleteResponse)
async def delete_sample(
    sample_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a sample and all its associated variants."""
    result = await db.execute(select(Sample).where(Sample.id == sample_id))
    sample = result.scalar_one_or_none()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")

    sample_name = sample.name

    # Count variants before deleting
    count_result = await db.execute(
        select(func.count()).select_from(Variant).where(Variant.sample_id == sample_id)
    )
    variant_count = count_result.scalar_one()

    # Delete variants explicitly then sample
    await db.execute(delete(Variant).where(Variant.sample_id == sample_id))
    await db.delete(sample)
    await db.commit()

    return DeleteResponse(deleted_variants=variant_count, sample_name=sample_name)


# ============================================================
# Archive / Unarchive
# ============================================================

@router.post("/{sample_id}/archive", response_model=SampleResponse)
async def archive_sample(
    sample_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Archive a sample (hide from default views)."""
    result = await db.execute(select(Sample).where(Sample.id == sample_id))
    sample = result.scalar_one_or_none()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")

    sample.status = "archived"
    await db.commit()
    await db.refresh(sample)
    return SampleResponse.model_validate(sample)


@router.post("/{sample_id}/unarchive", response_model=SampleResponse)
async def unarchive_sample(
    sample_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Unarchive a sample."""
    result = await db.execute(select(Sample).where(Sample.id == sample_id))
    sample = result.scalar_one_or_none()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")

    sample.status = "complete"
    await db.commit()
    await db.refresh(sample)
    return SampleResponse.model_validate(sample)


# ============================================================
# Bulk Delete
# ============================================================

@router.delete("/bulk", response_model=BulkDeleteResponse)
async def bulk_delete_samples(
    request: BulkDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple samples at once."""
    total_deleted_variants = 0
    total_deleted_samples = 0

    for sid in request.sample_ids:
        result = await db.execute(select(Sample).where(Sample.id == sid))
        sample = result.scalar_one_or_none()
        if sample:
            count_result = await db.execute(
                select(func.count()).select_from(Variant).where(Variant.sample_id == sid)
            )
            total_deleted_variants += count_result.scalar_one()
            await db.execute(delete(Variant).where(Variant.sample_id == sid))
            await db.delete(sample)
            total_deleted_samples += 1

    await db.commit()
    return BulkDeleteResponse(
        deleted_samples=total_deleted_samples,
        deleted_variants=total_deleted_variants,
    )


# ============================================================
# Rescore / Reannotate
# ============================================================

@router.post("/{sample_id}/rescore")
async def rescore_sample(
    sample_id: UUID,
    background_tasks: BackgroundTasks,
    scoring_profile_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Re-run scoring pipeline on all variants in this sample."""
    result = await db.execute(select(Sample).where(Sample.id == sample_id))
    sample = result.scalar_one_or_none()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")

    async def do_rescore():
        from app.services.scoring_service import score_variant, get_scoring_profile
        async with AsyncSessionLocal() as bg_db:
            profile = None
            if scoring_profile_id:
                profile = await get_scoring_profile(scoring_profile_id, bg_db)

            variants_result = await bg_db.execute(
                select(Variant).where(Variant.sample_id == sample_id)
            )
            variants = variants_result.scalars().all()
            for v in variants:
                new_score = score_variant(v, profile)
                v.risk_score = new_score
                if scoring_profile_id:
                    v.scoring_profile_id = scoring_profile_id

            # Update sample stats
            s_result = await bg_db.execute(select(Sample).where(Sample.id == sample_id))
            s = s_result.scalar_one_or_none()
            if s:
                if scoring_profile_id and profile:
                    s.scoring_profile_id = scoring_profile_id
                    s.scoring_profile_name = profile.name if hasattr(profile, "name") else None
                stats = await _compute_sample_stats(sample_id, bg_db)
                for key, value in stats.items():
                    setattr(s, key, value)

            await bg_db.commit()

    background_tasks.add_task(do_rescore)
    return {"status": "rescoring", "sample_id": str(sample_id)}


@router.post("/{sample_id}/reannotate")
async def reannotate_sample(
    sample_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Re-run annotation pipeline on all variants in this sample."""
    result = await db.execute(select(Sample).where(Sample.id == sample_id))
    sample = result.scalar_one_or_none()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")

    sample.status = "annotating"
    await db.commit()

    async def do_reannotate():
        async with AsyncSessionLocal() as bg_db:
            try:
                await annotate_variants_by_upload_id(sample.upload_id, bg_db)
                s_result = await bg_db.execute(select(Sample).where(Sample.id == sample_id))
                s = s_result.scalar_one_or_none()
                if s:
                    stats = await _compute_sample_stats(sample_id, bg_db)
                    for key, value in stats.items():
                        setattr(s, key, value)
                    s.status = "complete"
                    s.processing_completed_at = datetime.utcnow()
                    await bg_db.commit()
            except Exception:
                s_result = await bg_db.execute(select(Sample).where(Sample.id == sample_id))
                s = s_result.scalar_one_or_none()
                if s:
                    s.status = "failed"
                    await bg_db.commit()

    background_tasks.add_task(do_reannotate)
    return {"status": "reannotating", "sample_id": str(sample_id)}


# ============================================================
# Export
# ============================================================

@router.get("/{sample_id}/export")
async def export_sample_csv(
    sample_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Export all variants for this sample as CSV."""
    result = await db.execute(select(Sample).where(Sample.id == sample_id))
    sample = result.scalar_one_or_none()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")

    v_result = await db.execute(
        select(Variant)
        .where(Variant.sample_id == sample_id)
        .order_by(Variant.chrom, Variant.pos)
    )
    variants = v_result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Chromosome", "Position", "Reference", "Alternate", "rsID",
        "Gene", "Transcript", "Consequence", "Protein Change",
        "ClinVar Significance", "ClinVar Review Status", "ClinVar Condition",
        "gnomAD AF", "gnomAD AC", "gnomAD AN",
        "Risk Score", "Quality", "Filter Status", "Depth", "Allele Frequency",
        "AI Summary", "Annotation Status", "Created At",
    ])

    for v in variants:
        writer.writerow([
            str(v.id), v.chrom, v.pos, v.ref, v.alt, v.rs_id or "",
            v.gene_symbol or "", v.transcript_id or "", v.consequence or "",
            v.protein_change or "", v.clinvar_significance or "",
            v.clinvar_review_status or "", v.clinvar_condition or "",
            v.gnomad_af if v.gnomad_af is not None else "",
            v.gnomad_ac if v.gnomad_ac is not None else "",
            v.gnomad_an if v.gnomad_an is not None else "",
            v.risk_score if v.risk_score is not None else "",
            v.qual if v.qual is not None else "",
            v.filter_status or "",
            v.depth if v.depth is not None else "",
            v.allele_freq if v.allele_freq is not None else "",
            v.ai_summary or "",
            v.annotation_status or "",
            v.created_at.isoformat() if v.created_at else "",
        ])

    output.seek(0)
    filename = f"{sample.name}_variants.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ============================================================
# Comparison (existing)
# ============================================================

@router.get("/compare", response_model=ComparisonResponse)
async def compare_sample_variants(
    sample_ids: str = Query(..., description="Comma-separated sample UUIDs"),
    db: AsyncSession = Depends(get_db),
):
    """Compare variants across multiple samples."""
    try:
        ids = [UUID(sid.strip()) for sid in sample_ids.split(",")]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid sample ID format")

    if len(ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 sample IDs required")
    if len(ids) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 samples for comparison")

    try:
        comparison = await compare_samples(ids, db)
        return comparison
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
