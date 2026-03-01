from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, and_, literal
from pathlib import Path
from datetime import datetime
import math
from collections import defaultdict
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
    AdvancedVariantStatsResponse,
    SummaryMetrics,
    ClinicalSignificanceBreakdown,
    SignificanceDetail,
    ConsequenceItem,
    GeneAnalysis,
    GeneAnalysisItem,
    AlleleFrequencySpectrum,
    AFBin,
    ScatterDataPoint,
    RiskScoreAnalysis,
    RiskScoreBin,
    ChromosomeDistributionItem,
    ACMGSummary,
    ACMGCriterionFrequency,
    ActionableSummary,
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


@router.get("/stats/advanced", response_model=AdvancedVariantStatsResponse)
async def get_advanced_variant_stats(
    sample_id: UUID | None = Query(None, description="Filter by sample ID"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get comprehensive advanced analytics data for the analytics dashboard.

    Returns deeply structured data including clinical significance breakdown,
    consequence analysis, gene-level analysis, allele frequency spectrum with
    scatter data, risk score percentiles, chromosome distribution, ACMG summary,
    actionable findings, and AI-generated insights.
    """
    from app.services.acmg_service import assess_acmg_criteria, ACMG_CRITERIA

    def _sf(q):
        if sample_id:
            return q.where(Variant.sample_id == sample_id)
        return q

    # ── Fetch all variants once for in-memory analysis ──
    all_q = _sf(select(Variant))
    result = await db.execute(all_q)
    all_variants = result.scalars().all()

    total = len(all_variants)
    if total == 0:
        empty_sig = SignificanceDetail(count=0, percentage=0.0, genes=[])
        return AdvancedVariantStatsResponse(
            summary=SummaryMetrics(
                total_variants=0, total_genes_affected=0, samples_analyzed=0,
                mean_quality_score=0.0, analysis_date=datetime.utcnow().strftime("%Y-%m-%d"),
            ),
            clinical_significance=ClinicalSignificanceBreakdown(
                pathogenic=empty_sig, likely_pathogenic=empty_sig,
                uncertain_significance=empty_sig, likely_benign=empty_sig,
                benign=empty_sig, conflicting=empty_sig, not_provided=empty_sig,
            ),
            consequences=[], gene_analysis=GeneAnalysis(top_genes=[], genes_with_multiple_hits=0, genes_pathogenic_only=[]),
            allele_frequency_spectrum=AlleleFrequencySpectrum(
                ultra_rare=AFBin(count=0, af_range="<0.0001"),
                very_rare=AFBin(count=0, af_range="0.0001-0.001"),
                rare=AFBin(count=0, af_range="0.001-0.01"),
                low_frequency=AFBin(count=0, af_range="0.01-0.05"),
                common=AFBin(count=0, af_range=">0.05"),
                not_found=AFBin(count=0, af_range="N/A"),
                scatter_data=[],
            ),
            risk_scores=RiskScoreAnalysis(
                distribution=[], mean=0, median=0, std_dev=0, max=0, p90=0, p95=0,
            ),
            chromosome_distribution=[], acmg_summary=ACMGSummary(criteria_frequency=[]),
            actionable_summary=ActionableSummary(
                total_actionable=0, pharmacogenomic_variants=0,
                cancer_predisposition=0, carrier_status=0, high_confidence_pathogenic=0,
            ),
            ai_insights=["No variant data available for analysis."],
        )

    # ── Helper: classify significance ──
    def _classify_sig(sig: str | None) -> str:
        if not sig:
            return "not_provided"
        s = sig.lower()
        if "conflicting" in s:
            return "conflicting"
        if "likely pathogenic" in s:
            return "likely_pathogenic"
        if "pathogenic" in s:
            return "pathogenic"
        if "likely benign" in s:
            return "likely_benign"
        if "benign" in s:
            return "benign"
        if "uncertain" in s:
            return "uncertain_significance"
        return "not_provided"

    # ── Summary Metrics ──
    all_genes = set()
    all_samples = set()
    qual_scores = []
    for v in all_variants:
        if v.gene_symbol:
            all_genes.add(v.gene_symbol)
        if v.sample_id:
            all_samples.add(v.sample_id)
        if v.qual is not None:
            qual_scores.append(v.qual)

    summary = SummaryMetrics(
        total_variants=total,
        total_genes_affected=len(all_genes),
        samples_analyzed=max(len(all_samples), 1),
        mean_quality_score=round(sum(qual_scores) / len(qual_scores), 1) if qual_scores else 0.0,
        analysis_date=datetime.utcnow().strftime("%Y-%m-%d"),
    )

    # ── Clinical Significance Breakdown ──
    sig_buckets: dict[str, list] = {
        "pathogenic": [], "likely_pathogenic": [], "uncertain_significance": [],
        "likely_benign": [], "benign": [], "conflicting": [], "not_provided": [],
    }
    for v in all_variants:
        cat = _classify_sig(v.clinvar_significance)
        sig_buckets[cat].append(v)

    def _sig_detail(variants: list) -> SignificanceDetail:
        genes = list({v.gene_symbol for v in variants if v.gene_symbol})[:20]
        return SignificanceDetail(
            count=len(variants),
            percentage=round(len(variants) / total * 100, 1) if total else 0,
            genes=sorted(genes),
        )

    clinical_significance = ClinicalSignificanceBreakdown(
        pathogenic=_sig_detail(sig_buckets["pathogenic"]),
        likely_pathogenic=_sig_detail(sig_buckets["likely_pathogenic"]),
        uncertain_significance=_sig_detail(sig_buckets["uncertain_significance"]),
        likely_benign=_sig_detail(sig_buckets["likely_benign"]),
        benign=_sig_detail(sig_buckets["benign"]),
        conflicting=_sig_detail(sig_buckets["conflicting"]),
        not_provided=_sig_detail(sig_buckets["not_provided"]),
    )

    # ── Consequence Distribution ──
    cons_data: dict[str, dict] = defaultdict(lambda: {"count": 0, "pathogenic": 0})
    for v in all_variants:
        c = v.consequence or "unknown"
        cons_data[c]["count"] += 1
        if _classify_sig(v.clinvar_significance) in ("pathogenic", "likely_pathogenic"):
            cons_data[c]["pathogenic"] += 1

    consequences = sorted([
        ConsequenceItem(
            type=ctype,
            count=d["count"],
            pathogenic_pct=round(d["pathogenic"] / d["count"] * 100, 1) if d["count"] else 0,
        )
        for ctype, d in cons_data.items()
    ], key=lambda x: x.count, reverse=True)

    # ── Gene-Level Analysis ──
    gene_data: dict[str, dict] = defaultdict(lambda: {
        "variants": [], "pathogenic": 0, "risk_scores": [],
        "consequences": set(), "chromosomes": set(), "clinvar": defaultdict(int),
    })
    for v in all_variants:
        g = v.gene_symbol or "Intergenic"
        gene_data[g]["variants"].append(v)
        if _classify_sig(v.clinvar_significance) in ("pathogenic", "likely_pathogenic"):
            gene_data[g]["pathogenic"] += 1
        if v.risk_score is not None:
            gene_data[g]["risk_scores"].append(v.risk_score)
        if v.consequence:
            gene_data[g]["consequences"].add(v.consequence)
        gene_data[g]["chromosomes"].add(v.chrom)
        sig_label = v.clinvar_significance or "Not provided"
        gene_data[g]["clinvar"][sig_label] += 1

    top_gene_items = sorted(gene_data.items(), key=lambda x: len(x[1]["variants"]), reverse=True)[:20]
    gene_analysis_items = []
    for gene_name, gd in top_gene_items:
        rs = gd["risk_scores"]
        gene_analysis_items.append(GeneAnalysisItem(
            gene=gene_name,
            variant_count=len(gd["variants"]),
            pathogenic_count=gd["pathogenic"],
            max_risk_score=max(rs) if rs else 0,
            mean_risk_score=round(sum(rs) / len(rs), 1) if rs else 0,
            consequences=sorted(gd["consequences"]),
            chromosomes=sorted(gd["chromosomes"]),
            clinvar_classifications=dict(gd["clinvar"]),
        ))

    genes_multiple = sum(1 for gd in gene_data.values() if len(gd["variants"]) > 1)
    genes_path_only = [
        g for g, gd in gene_data.items()
        if g != "Intergenic"
        and len(gd["variants"]) == gd["pathogenic"]
        and gd["pathogenic"] > 0
    ]

    gene_analysis = GeneAnalysis(
        top_genes=gene_analysis_items,
        genes_with_multiple_hits=genes_multiple,
        genes_pathogenic_only=sorted(genes_path_only)[:20],
    )

    # ── Allele Frequency Spectrum ──
    af_bins = {"ultra_rare": 0, "very_rare": 0, "rare": 0, "low_frequency": 0, "common": 0, "not_found": 0}
    scatter_data = []
    for v in all_variants:
        af = v.gnomad_af
        if af is None:
            af_bins["not_found"] += 1
        elif af < 0.0001:
            af_bins["ultra_rare"] += 1
        elif af < 0.001:
            af_bins["very_rare"] += 1
        elif af < 0.01:
            af_bins["rare"] += 1
        elif af < 0.05:
            af_bins["low_frequency"] += 1
        else:
            af_bins["common"] += 1

        if af is not None and af > 0 and v.risk_score is not None:
            scatter_data.append(ScatterDataPoint(
                variant_id=str(v.id),
                gene=v.gene_symbol or "Unknown",
                af=af,
                risk_score=v.risk_score,
                significance=v.clinvar_significance or "Not provided",
                consequence=v.consequence or "Unknown",
            ))

    allele_frequency_spectrum = AlleleFrequencySpectrum(
        ultra_rare=AFBin(count=af_bins["ultra_rare"], af_range="<0.0001"),
        very_rare=AFBin(count=af_bins["very_rare"], af_range="0.0001-0.001"),
        rare=AFBin(count=af_bins["rare"], af_range="0.001-0.01"),
        low_frequency=AFBin(count=af_bins["low_frequency"], af_range="0.01-0.05"),
        common=AFBin(count=af_bins["common"], af_range=">0.05"),
        not_found=AFBin(count=af_bins["not_found"], af_range="N/A"),
        scatter_data=scatter_data[:500],  # cap for performance
    )

    # ── Risk Score Analysis ──
    risk_values = [v.risk_score for v in all_variants if v.risk_score is not None]
    if risk_values:
        sorted_risks = sorted(risk_values)
        n = len(sorted_risks)
        mean_r = sum(sorted_risks) / n
        median_r = sorted_risks[n // 2] if n % 2 else (sorted_risks[n // 2 - 1] + sorted_risks[n // 2]) / 2
        variance = sum((x - mean_r) ** 2 for x in sorted_risks) / n
        std_dev_r = math.sqrt(variance)
        p90_r = sorted_risks[int(n * 0.9)] if n > 1 else sorted_risks[0]
        p95_r = sorted_risks[int(n * 0.95)] if n > 1 else sorted_risks[0]
        max_r = sorted_risks[-1]
    else:
        mean_r = median_r = std_dev_r = p90_r = p95_r = 0.0
        max_r = 0

    risk_bins = [
        ("0-2", "Low", 0, 2, "#00ff88"),
        ("3-5", "Moderate", 3, 5, "#ffaa00"),
        ("6-8", "High", 6, 8, "#ff8c00"),
        ("9-12", "Very High", 9, 12, "#ff3366"),
        ("13+", "Critical", 13, 999, "#cc0033"),
    ]
    risk_distribution = []
    for rng, label, lo, hi, color in risk_bins:
        cnt = sum(1 for r in risk_values if lo <= r <= hi)
        risk_distribution.append(RiskScoreBin(range=rng, label=label, count=cnt, color=color))

    risk_scores = RiskScoreAnalysis(
        distribution=risk_distribution,
        mean=round(mean_r, 1),
        median=round(median_r, 1),
        std_dev=round(std_dev_r, 2),
        max=max_r,
        p90=round(p90_r, 1),
        p95=round(p95_r, 1),
    )

    # ── Chromosome Distribution ──
    chrom_data: dict[str, dict] = defaultdict(lambda: {"count": 0, "pathogenic": 0, "genes": set()})
    for v in all_variants:
        ch = v.chrom.replace("chr", "")
        chrom_data[ch]["count"] += 1
        if _classify_sig(v.clinvar_significance) in ("pathogenic", "likely_pathogenic"):
            chrom_data[ch]["pathogenic"] += 1
        if v.gene_symbol:
            chrom_data[ch]["genes"].add(v.gene_symbol)

    chrom_order = [str(i) for i in range(1, 23)] + ["X", "Y", "MT"]
    chromosome_distribution = []
    for ch in chrom_order:
        if ch in chrom_data:
            d = chrom_data[ch]
            chromosome_distribution.append(ChromosomeDistributionItem(
                chromosome=ch,
                variant_count=d["count"],
                pathogenic_count=d["pathogenic"],
                genes=sorted(d["genes"])[:10],
            ))

    # ── ACMG Summary ──
    acmg_counts: dict[str, int] = defaultdict(int)
    for v in all_variants:
        acmg_result = assess_acmg_criteria(v)
        for criterion in acmg_result["criteria_met"]:
            acmg_counts[criterion] += 1

    acmg_freq = []
    for criterion, info in ACMG_CRITERIA.items():
        cnt = acmg_counts.get(criterion, 0)
        if cnt > 0:
            acmg_freq.append(ACMGCriterionFrequency(
                criterion=criterion,
                met_count=cnt,
                description=info["label"],
            ))
    acmg_freq.sort(key=lambda x: x.met_count, reverse=True)
    acmg_summary = ACMGSummary(criteria_frequency=acmg_freq)

    # ── Actionable Summary ──
    PGX_GENES = {"CYP2C19", "CYP2D6", "CYP3A5", "CYP2C9", "DPYD", "TPMT", "NUDT15",
                 "UGT1A1", "SLCO1B1", "VKORC1", "CYP1A2", "CYP2B6", "NAT2", "G6PD"}
    CANCER_GENES = {"BRCA1", "BRCA2", "TP53", "MLH1", "MSH2", "MSH6", "PMS2",
                    "APC", "MUTYH", "CDH1", "PTEN", "STK11", "PALB2", "ATM",
                    "CHEK2", "RAD51C", "RAD51D", "BARD1", "RB1", "NF1", "NF2", "VHL"}

    pgx_count = 0
    cancer_count = 0
    carrier_count = 0
    high_conf_path = 0
    for v in all_variants:
        sig = _classify_sig(v.clinvar_significance)
        gene = v.gene_symbol or ""
        if gene in PGX_GENES:
            pgx_count += 1
        if gene in CANCER_GENES and sig in ("pathogenic", "likely_pathogenic"):
            cancer_count += 1
        review = (v.clinvar_review_status or "").lower()
        if sig == "pathogenic" and ("2" in review or "3" in review or "4" in review or "expert" in review):
            high_conf_path += 1
        if sig in ("pathogenic", "likely_pathogenic") and v.gnomad_af and v.gnomad_af > 0.001:
            carrier_count += 1

    total_actionable = pgx_count + cancer_count + high_conf_path
    actionable = ActionableSummary(
        total_actionable=total_actionable,
        pharmacogenomic_variants=pgx_count,
        cancer_predisposition=cancer_count,
        carrier_status=carrier_count,
        high_confidence_pathogenic=high_conf_path,
    )

    # ── AI Insights (deterministic rules) ──
    insights = []
    path_pct = clinical_significance.pathogenic.percentage + clinical_significance.likely_pathogenic.percentage
    vus_pct = clinical_significance.uncertain_significance.percentage

    if vus_pct > 50:
        insights.append(
            f"{vus_pct:.0f}% of variants are classified as VUS, "
            "suggesting further investigation may be warranted for clinical reporting."
        )
    if path_pct > 20:
        insights.append(
            f"{path_pct:.0f}% of variants are pathogenic or likely pathogenic — "
            "this is an elevated rate that may indicate a disease-enriched sample."
        )

    # Gene-specific insights
    for gi in gene_analysis_items[:5]:
        if gi.pathogenic_count >= 2:
            insights.append(
                f"{gi.gene} has {gi.pathogenic_count} pathogenic variants — "
                "consider cascade family testing if clinically indicated."
            )

    if pgx_count > 0:
        pgx_gene_list = [v.gene_symbol for v in all_variants if v.gene_symbol in PGX_GENES]
        unique_pgx = sorted(set(pgx_gene_list))[:5]
        insights.append(
            f"{pgx_count} pharmacogenomic variant(s) detected "
            f"affecting {', '.join(unique_pgx)} metabolism."
        )

    if cancer_count > 0:
        insights.append(
            f"{cancer_count} cancer predisposition variant(s) identified — "
            "genetic counseling may be recommended."
        )

    lof_variants = [v for v in all_variants if v.consequence and any(
        c in v.consequence.lower() for c in ["frameshift", "stop_gained", "splice_donor", "splice_acceptor"]
    )]
    if lof_variants:
        lof_genes = sorted({v.gene_symbol for v in lof_variants if v.gene_symbol})
        insights.append(
            f"{len(lof_variants)} loss-of-function variant(s) detected across "
            f"{len(lof_genes)} gene(s): {', '.join(lof_genes[:5])}."
        )

    if risk_scores.p95 > 0:
        high_risk_count = sum(1 for r in risk_values if r > risk_scores.p95)
        insights.append(
            f"95th percentile risk score is {risk_scores.p95:.0f}, "
            f"with {high_risk_count} variant(s) exceeding this threshold."
        )

    ultra_rare_pct = round(allele_frequency_spectrum.ultra_rare.count / total * 100, 1) if total else 0
    if ultra_rare_pct > 30:
        insights.append(
            f"{ultra_rare_pct}% of variants are ultra-rare (AF < 0.0001), "
            "consistent with a rare disease or highly penetrant variant panel."
        )

    if not insights:
        insights.append("Analysis complete. No notable patterns detected in this dataset.")

    return AdvancedVariantStatsResponse(
        summary=summary,
        clinical_significance=clinical_significance,
        consequences=consequences,
        gene_analysis=gene_analysis,
        allele_frequency_spectrum=allele_frequency_spectrum,
        risk_scores=risk_scores,
        chromosome_distribution=chromosome_distribution,
        acmg_summary=acmg_summary,
        actionable_summary=actionable,
        ai_insights=insights[:8],
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
