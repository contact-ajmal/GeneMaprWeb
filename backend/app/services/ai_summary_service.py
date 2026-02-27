"""
AI-powered variant summary generation service.

Generates clinical genetics summaries for variants using OpenRouter API.
"""
from typing import Optional
import httpx
import logging
from app.models.variant import Variant
from app.core.config import settings

logger = logging.getLogger(__name__)


async def call_llm(prompt: str) -> str:
    """
    Call OpenRouter API to generate text.

    Args:
        prompt: The prompt to send to the LLM

    Returns:
        Generated summary text
    """
    url = f"{settings.llm_base_url}/chat/completions"
    logger.info(f"Calling LLM API at: {url}")
    logger.info(f"Using model: {settings.llm_model}")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            logger.info("Making POST request to OpenRouter...")
            response = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {settings.llm_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.llm_model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a clinical genetics expert. Provide concise, professional summaries of genetic variants for medical professionals."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 0.3,
                    "max_tokens": 500,
                }
            )
            logger.info(f"OpenRouter response status: {response.status_code}")
            response.raise_for_status()
            result = response.json()
            logger.info("Successfully received response from OpenRouter")
            return result["choices"][0]["message"]["content"].strip()
    except httpx.HTTPStatusError as e:
        logger.error(f"LLM API HTTP error: {e.response.status_code} - {e.response.text}")
        return None
    except httpx.RequestError as e:
        logger.error(f"LLM API request error: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"LLM API call failed: {type(e).__name__} - {str(e)}")
        return None


async def generate_variant_summary(variant: Variant) -> str:
    """
    Generate a professional clinical genetics summary for a variant using AI.

    First attempts to use LLM (OpenRouter) for summary generation.
    Falls back to template-based summary if LLM is unavailable.

    Args:
        variant: The annotated variant

    Returns:
        Professional clinical summary text
    """
    # Try AI-generated summary first
    logger.info(f"Generating summary for variant {variant.id}")
    logger.info(f"LLM API key configured: {bool(settings.llm_api_key and settings.llm_api_key != 'stub')}")
    logger.info(f"LLM base URL: {settings.llm_base_url}")
    logger.info(f"LLM model: {settings.llm_model}")

    if settings.llm_api_key and settings.llm_api_key != "stub":
        logger.info(f"Attempting to call LLM for variant {variant.id}")
        prompt = _build_llm_prompt(variant)
        logger.debug(f"LLM prompt: {prompt[:200]}...")
        ai_summary = await call_llm(prompt)
        if ai_summary:
            logger.info(f"Successfully generated AI summary for variant {variant.id}")
            return ai_summary
        logger.warning(f"LLM call failed for variant {variant.id}, falling back to template")
    else:
        logger.info(f"LLM not configured, using template for variant {variant.id}")

    # Fallback: Build template-based summary
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


def _build_llm_prompt(variant: Variant) -> str:
    """
    Build a prompt for the LLM to generate a variant summary.

    Args:
        variant: The annotated variant

    Returns:
        Formatted prompt text
    """
    prompt_parts = []

    # Basic variant info
    prompt_parts.append(f"Variant: {variant.chrom}:{variant.pos} {variant.ref}>{variant.alt}")
    if variant.rs_id:
        prompt_parts.append(f"dbSNP ID: rs{variant.rs_id}")

    # Gene and consequence
    if variant.gene_symbol:
        prompt_parts.append(f"Gene: {variant.gene_symbol}")
    if variant.transcript_id:
        prompt_parts.append(f"Transcript: {variant.transcript_id}")
    if variant.consequence:
        prompt_parts.append(f"Consequence: {variant.consequence}")
    if variant.protein_change:
        prompt_parts.append(f"Protein change: {variant.protein_change}")

    # Clinical significance
    if variant.clinvar_significance:
        prompt_parts.append(f"ClinVar significance: {variant.clinvar_significance}")
        if variant.clinvar_review_status:
            prompt_parts.append(f"ClinVar review status: {variant.clinvar_review_status}")
        if variant.clinvar_condition:
            prompt_parts.append(f"Associated condition: {variant.clinvar_condition[:200]}")

    # Population frequency
    if variant.gnomad_af is not None:
        prompt_parts.append(f"gnomAD allele frequency: {variant.gnomad_af:.6f}")
    elif variant.allele_freq is not None:
        prompt_parts.append(f"Allele frequency: {variant.allele_freq:.6f}")

    # Risk score
    if variant.risk_score is not None:
        prompt_parts.append(f"Risk score: {variant.risk_score}/16")

    prompt = "\n".join(prompt_parts)
    prompt += "\n\nProvide a brief clinical genetics summary (3-4 sentences) for this variant, including: pathogenicity assessment, functional impact, and clinical recommendations if applicable."

    return prompt


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


async def generate_and_store_summary(variant: Variant) -> None:
    """
    Generate and store AI summary for a variant.

    Modifies the variant object in-place, setting the ai_summary field.

    Args:
        variant: The variant to summarize (will be modified in-place)
    """
    variant.ai_summary = await generate_variant_summary(variant)
