from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.scoring_profile import ScoringProfile
from app.models.variant import Variant
from app.schemas.scoring_profile import (
    ScoringProfileCreate,
    ScoringProfileUpdate,
    ScoringProfileResponse,
    ScoringWeights,
    RescoreResponse,
)
from app.services.scoring_service import calculate_variant_score

router = APIRouter(
    prefix="/scoring-profiles",
    tags=["scoring-profiles"],
    dependencies=[Depends(get_current_user)],
)


# Default profile seed data
DEFAULT_PROFILES = [
    {
        "name": "General Screening",
        "description": "Balanced scoring for general genomic screening. Standard weights across all categories.",
        "weights": ScoringWeights().model_dump(),
    },
    {
        "name": "Oncology Panel",
        "description": "Optimized for cancer gene panels. Higher weight for loss-of-function variants and known oncogenes.",
        "weights": ScoringWeights(
            pathogenic=6,
            likely_pathogenic=5,
            lof_bonus=5,
            missense_bonus=3,
            splice_site_bonus=4,
            custom_gene_weights={
                "BRCA1": 2.0, "BRCA2": 2.0, "TP53": 2.0,
                "APC": 1.8, "MLH1": 1.8, "MSH2": 1.8,
                "PTEN": 1.5, "RB1": 1.5, "VHL": 1.5,
                "KRAS": 1.5, "BRAF": 1.5, "EGFR": 1.5,
            },
        ).model_dump(),
    },
    {
        "name": "Cardiac Screen",
        "description": "Tuned for cardiomyopathy and arrhythmia panels. Elevated weights for cardiac genes.",
        "weights": ScoringWeights(
            pathogenic=6,
            likely_pathogenic=5,
            lof_bonus=5,
            missense_bonus=3,
            custom_gene_weights={
                "MYBPC3": 2.0, "MYH7": 2.0, "SCN5A": 2.0,
                "KCNQ1": 1.8, "KCNH2": 1.8, "LMNA": 1.8,
                "TTN": 1.5, "RYR2": 1.5, "TNNT2": 1.5,
                "DSP": 1.5, "PKP2": 1.5,
            },
        ).model_dump(),
    },
    {
        "name": "Pharmacogenomics",
        "description": "For pharmacogenomic analysis. Lower clinical significance weights, higher allele frequency-based scoring.",
        "weights": ScoringWeights(
            pathogenic=3,
            likely_pathogenic=2,
            vus=2,
            rare_bonus=4,
            ultra_rare_bonus=2,
            missense_bonus=3,
            lof_bonus=3,
            custom_gene_weights={
                "CYP2D6": 2.0, "CYP2C19": 2.0, "CYP2C9": 2.0,
                "CYP3A5": 1.8, "DPYD": 2.0, "TPMT": 2.0,
                "UGT1A1": 1.8, "VKORC1": 1.8, "SLCO1B1": 1.5,
                "NUDT15": 1.5, "CYP1A2": 1.5,
            },
        ).model_dump(),
    },
    {
        "name": "Rare Disease",
        "description": "Maximizes scoring for ultra-rare variants and loss-of-function mutations. Best for rare disease diagnosis.",
        "weights": ScoringWeights(
            pathogenic=6,
            likely_pathogenic=5,
            rare_bonus=4,
            ultra_rare_bonus=3,
            ultra_rare_af_threshold=0.0001,
            lof_bonus=6,
            splice_site_bonus=4,
            missense_bonus=3,
            inframe_indel_bonus=2,
        ).model_dump(),
    },
]


async def seed_default_profiles(db: AsyncSession) -> None:
    """Seed default scoring profiles if they don't exist."""
    result = await db.execute(
        select(func.count()).select_from(ScoringProfile)
    )
    count = result.scalar_one()
    if count > 0:
        return

    for profile_data in DEFAULT_PROFILES:
        profile = ScoringProfile(
            name=profile_data["name"],
            description=profile_data["description"],
            is_default=True,
            weights=profile_data["weights"],
        )
        db.add(profile)
    await db.commit()


@router.get("", response_model=list[ScoringProfileResponse])
async def list_profiles(db: AsyncSession = Depends(get_db)):
    """List all scoring profiles."""
    result = await db.execute(
        select(ScoringProfile).order_by(ScoringProfile.is_default.desc(), ScoringProfile.name)
    )
    profiles = result.scalars().all()
    return [ScoringProfileResponse.model_validate(p) for p in profiles]


@router.get("/{profile_id}", response_model=ScoringProfileResponse)
async def get_profile(profile_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a single scoring profile by ID."""
    result = await db.execute(
        select(ScoringProfile).where(ScoringProfile.id == profile_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Scoring profile not found")
    return ScoringProfileResponse.model_validate(profile)


@router.post("", response_model=ScoringProfileResponse, status_code=201)
async def create_profile(
    data: ScoringProfileCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new custom scoring profile."""
    # Check name uniqueness
    existing = await db.execute(
        select(ScoringProfile).where(ScoringProfile.name == data.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A profile with this name already exists")

    profile = ScoringProfile(
        name=data.name,
        description=data.description,
        is_default=False,
        weights=data.weights.model_dump(),
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return ScoringProfileResponse.model_validate(profile)


@router.put("/{profile_id}", response_model=ScoringProfileResponse)
async def update_profile(
    profile_id: UUID,
    data: ScoringProfileUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a scoring profile."""
    result = await db.execute(
        select(ScoringProfile).where(ScoringProfile.id == profile_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Scoring profile not found")

    if data.name is not None:
        # Check name uniqueness (exclude current profile)
        existing = await db.execute(
            select(ScoringProfile)
            .where(ScoringProfile.name == data.name)
            .where(ScoringProfile.id != profile_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="A profile with this name already exists")
        profile.name = data.name

    if data.description is not None:
        profile.description = data.description

    if data.weights is not None:
        profile.weights = data.weights.model_dump()

    await db.commit()
    await db.refresh(profile)
    return ScoringProfileResponse.model_validate(profile)


@router.delete("/{profile_id}", status_code=204)
async def delete_profile(profile_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete a scoring profile. Default profiles cannot be deleted."""
    result = await db.execute(
        select(ScoringProfile).where(ScoringProfile.id == profile_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Scoring profile not found")

    if profile.is_default:
        raise HTTPException(status_code=403, detail="Default profiles cannot be deleted")

    await db.delete(profile)
    await db.commit()


@router.post("/rescore", response_model=RescoreResponse)
async def rescore_variants(
    profile_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Recalculate all variant scores using the specified scoring profile."""
    # Fetch the profile
    result = await db.execute(
        select(ScoringProfile).where(ScoringProfile.id == profile_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Scoring profile not found")

    weights = profile.weights

    # Fetch all annotated variants
    result = await db.execute(
        select(Variant).where(Variant.annotation_status == "completed")
    )
    variants = result.scalars().all()

    rescored = 0
    for variant in variants:
        new_score = calculate_variant_score(variant, weights)
        variant.risk_score = new_score
        variant.scoring_profile_id = profile.id
        rescored += 1

    await db.commit()

    return RescoreResponse(
        status="completed",
        variants_rescored=rescored,
        profile_name=profile.name,
    )
