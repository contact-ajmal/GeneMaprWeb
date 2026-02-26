"""
Variant risk scoring service.

Implements scoring rules based on clinical significance, allele frequency,
and functional consequence to generate a risk score for each variant.
"""
from typing import Optional
from app.models.variant import Variant


# Loss-of-function consequences
LOF_CONSEQUENCES = {
    "stop_gained",
    "frameshift_variant",
    "splice_acceptor_variant",
    "splice_donor_variant",
    "start_lost",
    "stop_lost",
    "transcript_ablation"
}

# Missense and moderate impact consequences
MISSENSE_CONSEQUENCES = {
    "missense_variant",
    "inframe_deletion",
    "inframe_insertion",
    "protein_altering_variant"
}


def calculate_variant_score(variant: Variant) -> int:
    """
    Calculate risk score for a variant based on annotation data.

    Scoring rules:
    - ClinVar Pathogenic: +5
    - ClinVar Likely pathogenic: +4
    - Rare variant (gnomAD AF < 0.01): +3
    - Loss-of-function consequence: +4
    - Missense variant: +2
    - Synonymous variant: 0

    Args:
        variant: The variant to score

    Returns:
        Integer risk score (0-16 possible range)
    """
    score = 0

    # ClinVar significance scoring
    if variant.clinvar_significance:
        sig_lower = variant.clinvar_significance.lower()
        if "pathogenic" in sig_lower:
            if "likely" in sig_lower or "probable" in sig_lower:
                score += 4  # Likely pathogenic
            else:
                score += 5  # Pathogenic
        elif "benign" in sig_lower:
            # Benign variants don't contribute to risk score
            pass

    # Allele frequency scoring (rare variants)
    # Use gnomAD AF if available, otherwise fall back to VCF allele_freq
    af = variant.gnomad_af if variant.gnomad_af is not None else variant.allele_freq
    if af is not None and af < 0.01:
        score += 3  # Rare variant

    # Consequence scoring
    if variant.consequence:
        consequence_lower = variant.consequence.lower()

        # Check for loss-of-function
        if any(lof in consequence_lower for lof in LOF_CONSEQUENCES):
            score += 4
        # Check for missense
        elif any(mis in consequence_lower for mis in MISSENSE_CONSEQUENCES):
            score += 2
        # Synonymous variants get 0 (already initialized to 0)

    return score


def score_variant(variant: Variant) -> None:
    """
    Calculate and update the risk score for a variant.

    Modifies the variant object in-place, setting the risk_score field.

    Args:
        variant: The variant to score (will be modified in-place)
    """
    variant.risk_score = calculate_variant_score(variant)
