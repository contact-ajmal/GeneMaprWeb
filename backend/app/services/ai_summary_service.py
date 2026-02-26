"""
AI-powered variant summary generation service.

Generates clinical genetics summaries for variants.
Currently uses template-based generation, designed to be swappable with
real LLM integration (OpenAI, Anthropic, etc.) in the future.
"""
from typing import Optional
from app.models.variant import Variant


def call_llm(prompt: str) -> str:
    """
    Stub LLM call function.

    In production, this would call OpenAI, Anthropic Claude, or another LLM API.
    For now, returns a structured template-based summary.

    Args:
        prompt: The prompt to send to the LLM

    Returns:
        Generated summary text
    """
    # This is a stub - in production would call:
    # - OpenAI GPT-4
    # - Anthropic Claude
    # - Local LLM via Ollama
    # - etc.
    return "[LLM response placeholder]"


def generate_variant_summary(variant: Variant) -> str:
    """
    Generate a professional clinical genetics summary for a variant.

    Creates a structured summary including:
    - Variant identification
    - Gene and functional impact
    - Clinical significance
    - Population frequency
    - Risk assessment

    Args:
        variant: The annotated variant

    Returns:
        Professional clinical summary text
    """
    # Build summary sections
    sections = []

    # Section 1: Variant Identification
    variant_id = f"{variant.chrom}:{variant.pos} {variant.ref}>{variant.alt}"
    if variant.rs_id:
        variant_id += f" (rs{variant.rs_id})"

    sections.append(f"**Variant:** {variant_id}")

    # Section 2: Gene and Functional Impact
    if variant.gene_symbol:
        gene_info = f"**Gene:** {variant.gene_symbol}"
        if variant.transcript_id:
            gene_info += f" (Transcript: {variant.transcript_id})"
        sections.append(gene_info)

    if variant.consequence:
        consequence_info = f"**Consequence:** {variant.consequence}"
        if variant.protein_change:
            consequence_info += f" ({variant.protein_change})"
        sections.append(consequence_info)

    # Section 3: Clinical Significance
    if variant.clinvar_significance:
        clinvar_info = f"**ClinVar Significance:** {variant.clinvar_significance}"
        if variant.clinvar_review_status:
            clinvar_info += f" (Review Status: {variant.clinvar_review_status})"
        sections.append(clinvar_info)

        if variant.clinvar_condition:
            # Truncate long condition lists
            condition = variant.clinvar_condition
            if len(condition) > 200:
                condition = condition[:200] + "..."
            sections.append(f"**Associated Condition(s):** {condition}")

    # Section 4: Population Frequency
    if variant.gnomad_af is not None:
        af_percent = variant.gnomad_af * 100
        rarity = "rare" if variant.gnomad_af < 0.01 else "common"
        af_info = f"**gnomAD Allele Frequency:** {af_percent:.4f}% ({rarity})"
        if variant.gnomad_ac is not None and variant.gnomad_an is not None:
            af_info += f" (AC={variant.gnomad_ac}, AN={variant.gnomad_an})"
        sections.append(af_info)
    elif variant.allele_freq is not None:
        af_percent = variant.allele_freq * 100
        sections.append(f"**Allele Frequency:** {af_percent:.4f}%")

    # Section 5: Risk Assessment
    if variant.risk_score is not None:
        risk_level = "High" if variant.risk_score >= 8 else "Moderate" if variant.risk_score >= 4 else "Low"
        sections.append(f"**Risk Score:** {variant.risk_score}/16 ({risk_level} priority)")

    # Section 6: Clinical Interpretation
    interpretation = _generate_interpretation(variant)
    if interpretation:
        sections.append(f"\n**Clinical Interpretation:**\n{interpretation}")

    # Combine all sections
    summary = "\n\n".join(sections)

    return summary


def _generate_interpretation(variant: Variant) -> str:
    """
    Generate clinical interpretation based on variant characteristics.

    Args:
        variant: The annotated variant

    Returns:
        Clinical interpretation text
    """
    interpretations = []

    # Pathogenicity interpretation
    if variant.clinvar_significance:
        sig_lower = variant.clinvar_significance.lower()
        if "pathogenic" in sig_lower and "benign" not in sig_lower:
            if "likely" in sig_lower:
                interpretations.append(
                    "This variant is classified as likely pathogenic in ClinVar, "
                    "suggesting it may contribute to disease risk. Clinical correlation "
                    "and additional evidence may be warranted."
                )
            else:
                interpretations.append(
                    "This variant is classified as pathogenic in ClinVar, "
                    "indicating strong evidence for disease causation. "
                    "Genetic counseling is recommended."
                )
        elif "benign" in sig_lower:
            interpretations.append(
                "This variant is classified as benign or likely benign, "
                "suggesting it is unlikely to be disease-causing."
            )
        elif "uncertain" in sig_lower or "vus" in sig_lower:
            interpretations.append(
                "This variant has uncertain significance. Additional evidence "
                "from functional studies or family segregation may be needed "
                "for classification."
            )

    # Frequency interpretation
    if variant.gnomad_af is not None:
        if variant.gnomad_af > 0.05:
            interpretations.append(
                f"The variant is common in the general population (AF={variant.gnomad_af:.4f}), "
                "which generally argues against a role in rare Mendelian disease."
            )
        elif variant.gnomad_af < 0.001:
            interpretations.append(
                f"The variant is extremely rare (AF={variant.gnomad_af:.6f}), "
                "consistent with a potential role in rare genetic disease."
            )
        elif variant.gnomad_af < 0.01:
            interpretations.append(
                f"The variant is rare (AF={variant.gnomad_af:.4f}), "
                "which is compatible with pathogenicity for rare conditions."
            )

    # Functional consequence interpretation
    if variant.consequence:
        cons_lower = variant.consequence.lower()
        if any(term in cons_lower for term in ["stop_gained", "frameshift"]):
            interpretations.append(
                "The variant results in a loss-of-function consequence "
                "(nonsense or frameshift), which typically disrupts protein function."
            )
        elif "missense" in cons_lower:
            interpretations.append(
                "The variant causes a missense change, altering the protein sequence. "
                "The functional impact depends on the specific amino acid substitution "
                "and its location within the protein."
            )
        elif "synonymous" in cons_lower:
            interpretations.append(
                "The variant is synonymous (does not change the amino acid sequence) "
                "and is therefore unlikely to affect protein function, though potential "
                "effects on splicing cannot be ruled out."
            )

    # Combine interpretations
    if interpretations:
        return " ".join(interpretations)
    else:
        return "Limited annotation data available for clinical interpretation."


def generate_and_store_summary(variant: Variant) -> None:
    """
    Generate and store AI summary for a variant.

    Modifies the variant object in-place, setting the ai_summary field.

    Args:
        variant: The variant to summarize (will be modified in-place)
    """
    variant.ai_summary = generate_variant_summary(variant)
