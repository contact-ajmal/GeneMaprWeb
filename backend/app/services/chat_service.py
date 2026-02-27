"""
AI chat service for conversational variant analysis.

Maintains conversation history per session in Redis and builds
variant context from the database for LLM prompts.
"""

import json
import logging
import re
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import get_redis
from app.models.variant import Variant

logger = logging.getLogger(__name__)

CHAT_SESSION_TTL = 3600  # 1 hour
MAX_HISTORY_MESSAGES = 20


async def get_conversation_history(session_id: str) -> list[dict]:
    """Retrieve conversation history from Redis."""
    redis = await get_redis()
    key = f"chat:session:{session_id}"
    data = await redis.get(key)
    if data:
        return json.loads(data)
    return []


async def save_conversation_history(
    session_id: str, history: list[dict]
) -> None:
    """Save conversation history to Redis with TTL."""
    redis = await get_redis()
    key = f"chat:session:{session_id}"
    # Keep only the last N messages to prevent context overflow
    trimmed = history[-MAX_HISTORY_MESSAGES:]
    await redis.setex(key, CHAT_SESSION_TTL, json.dumps(trimmed))


async def clear_conversation(session_id: str) -> None:
    """Clear conversation history for a session."""
    redis = await get_redis()
    key = f"chat:session:{session_id}"
    await redis.delete(key)


async def build_variant_context(db: AsyncSession) -> str:
    """
    Build a context string summarizing the current variant dataset.

    Pulls aggregate stats and key variant details from the database.
    """
    # Total variant count
    total_result = await db.execute(select(func.count()).select_from(Variant))
    total = total_result.scalar_one()

    if total == 0:
        return "No variants have been uploaded yet."

    sections = [f"Dataset contains {total} total variants."]

    # Unique genes
    genes_result = await db.execute(
        select(func.count(func.distinct(Variant.gene_symbol))).where(
            Variant.gene_symbol.isnot(None)
        )
    )
    unique_genes = genes_result.scalar_one()
    sections.append(f"Variants span {unique_genes} unique genes.")

    # Significance breakdown
    for label, pattern in [
        ("Pathogenic", "%pathogenic%"),
        ("Likely pathogenic", "%likely pathogenic%"),
        ("VUS (Uncertain significance)", "%uncertain%"),
        ("Benign", "%benign%"),
    ]:
        result = await db.execute(
            select(func.count())
            .select_from(Variant)
            .where(Variant.clinvar_significance.ilike(pattern))
        )
        count = result.scalar_one()
        if count > 0:
            sections.append(f"  - {label}: {count}")

    # High-risk variants (risk_score >= 8)
    high_risk_result = await db.execute(
        select(func.count())
        .select_from(Variant)
        .where(Variant.risk_score >= 8)
    )
    high_risk = high_risk_result.scalar_one()
    sections.append(f"High-risk variants (score >= 8): {high_risk}")

    # Mean risk score
    mean_result = await db.execute(
        select(func.avg(Variant.risk_score)).where(
            Variant.risk_score.isnot(None)
        )
    )
    mean_score = mean_result.scalar_one()
    if mean_score is not None:
        sections.append(f"Mean risk score: {mean_score:.1f}/16")

    # Top pathogenic / likely pathogenic variants (up to 15)
    path_variants = await db.execute(
        select(Variant)
        .where(Variant.clinvar_significance.ilike("%pathogenic%"))
        .order_by(Variant.risk_score.desc().nulls_last())
        .limit(15)
    )
    path_list = path_variants.scalars().all()
    if path_list:
        sections.append("\nKey pathogenic/likely pathogenic variants:")
        for v in path_list:
            line = f"  - {v.chrom}:{v.pos} {v.ref}>{v.alt}"
            if v.gene_symbol:
                line += f" ({v.gene_symbol})"
            if v.clinvar_significance:
                line += f" [{v.clinvar_significance}]"
            if v.risk_score is not None:
                line += f" risk={v.risk_score}/16"
            if v.clinvar_condition:
                cond = v.clinvar_condition[:100]
                line += f" condition: {cond}"
            sections.append(line)

    # Top risk-scored variants (up to 10, not already covered above)
    top_risk = await db.execute(
        select(Variant)
        .where(Variant.risk_score.isnot(None))
        .order_by(Variant.risk_score.desc())
        .limit(10)
    )
    top_list = top_risk.scalars().all()
    if top_list:
        sections.append("\nTop risk-scored variants:")
        for v in top_list:
            line = f"  - {v.chrom}:{v.pos} {v.ref}>{v.alt}"
            if v.gene_symbol:
                line += f" ({v.gene_symbol})"
            if v.consequence:
                line += f" [{v.consequence}]"
            line += f" risk={v.risk_score}/16"
            if v.gnomad_af is not None:
                line += f" AF={v.gnomad_af:.6f}"
            sections.append(line)

    # Top genes by variant count
    top_genes = await db.execute(
        select(
            Variant.gene_symbol,
            func.count(Variant.id).label("cnt"),
            func.max(Variant.risk_score).label("max_risk"),
        )
        .where(Variant.gene_symbol.isnot(None))
        .group_by(Variant.gene_symbol)
        .order_by(func.count(Variant.id).desc())
        .limit(10)
    )
    gene_rows = top_genes.all()
    if gene_rows:
        sections.append("\nTop genes by variant count:")
        for gene, cnt, max_risk in gene_rows:
            sections.append(
                f"  - {gene}: {cnt} variants (max risk: {max_risk or 'N/A'})"
            )

    return "\n".join(sections)


async def extract_sources(
    reply: str, db: AsyncSession
) -> list[dict]:
    """
    Extract variant references from the AI reply and match them to DB records.

    Looks for patterns like gene names, chr:pos notation, and rs IDs.
    """
    sources = []
    seen_ids = set()

    # Extract gene symbols mentioned (uppercase 2-10 char words that could be genes)
    gene_pattern = re.findall(r"\b([A-Z][A-Z0-9]{1,9})\b", reply)

    # Extract chr:pos patterns
    chrpos_pattern = re.findall(
        r"(?:chr)?(\d{1,2}|[XY]):(\d+)", reply, re.IGNORECASE
    )

    # Extract rs IDs
    rs_pattern = re.findall(r"rs(\d+)", reply, re.IGNORECASE)

    # Look up genes
    for gene in set(gene_pattern):
        if gene in seen_ids:
            continue
        result = await db.execute(
            select(Variant)
            .where(Variant.gene_symbol == gene)
            .limit(1)
        )
        variant = result.scalar_one_or_none()
        if variant:
            seen_ids.add(gene)
            sources.append(
                {
                    "variant_id": str(variant.id),
                    "gene": variant.gene_symbol,
                    "relevance": f"Mentioned gene: {gene}",
                }
            )

    # Look up chr:pos
    for chrom, pos in chrpos_pattern:
        key = f"{chrom}:{pos}"
        if key in seen_ids:
            continue
        result = await db.execute(
            select(Variant)
            .where(Variant.chrom.ilike(f"%{chrom}"))
            .where(Variant.pos == int(pos))
            .limit(1)
        )
        variant = result.scalar_one_or_none()
        if variant:
            seen_ids.add(key)
            sources.append(
                {
                    "variant_id": str(variant.id),
                    "gene": variant.gene_symbol,
                    "relevance": f"Referenced position: {key}",
                }
            )

    # Look up rs IDs
    for rs in set(rs_pattern):
        rs_key = f"rs{rs}"
        if rs_key in seen_ids:
            continue
        result = await db.execute(
            select(Variant).where(Variant.rs_id == rs).limit(1)
        )
        variant = result.scalar_one_or_none()
        if variant:
            seen_ids.add(rs_key)
            sources.append(
                {
                    "variant_id": str(variant.id),
                    "gene": variant.gene_symbol,
                    "relevance": f"Referenced dbSNP: {rs_key}",
                }
            )

    return sources[:10]  # Cap at 10 sources


async def chat(
    message: str,
    session_id: str,
    variant_context: bool,
    db: AsyncSession,
) -> dict:
    """
    Process a chat message, build context, call LLM, and return response.

    Args:
        message: User's chat message
        session_id: Session identifier for conversation continuity
        variant_context: Whether to include variant dataset context
        db: Database session

    Returns:
        Dict with reply, sources, and session_id
    """
    # Get conversation history
    history = await get_conversation_history(session_id)

    # Build variant context if requested
    context = ""
    if variant_context:
        context = await build_variant_context(db)

    # Build the system prompt
    total_result = await db.execute(select(func.count()).select_from(Variant))
    total = total_result.scalar_one()

    system_prompt = (
        "You are a clinical genomics AI assistant for GeneMapr, a premium genomic "
        "variant interpretation platform. You have access to a VCF analysis containing "
        f"{total} variants. Answer questions about the variants using the provided data. "
        "Be precise, cite specific variants (using gene names and chr:pos notation), and "
        "use professional clinical genetics terminology. Format your responses with "
        "markdown: use **bold** for emphasis, bullet points for lists, and `code` for "
        "variant notations. If uncertain about something, say so clearly."
    )

    if context:
        system_prompt += f"\n\nCurrent dataset context:\n{context}"

    # Build messages array for LLM
    messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Add current user message
    messages.append({"role": "user", "content": message})

    # Call LLM with full messages (using the existing call_llm but adapted)
    reply = await _call_llm_chat(messages)

    if not reply:
        reply = (
            "I apologize, but I'm unable to generate a response at the moment. "
            "This could be due to the AI service being temporarily unavailable. "
            "Please try again in a few moments."
        )

    # Extract variant references from the reply
    sources = await extract_sources(reply, db)

    # Update conversation history
    history.append({"role": "user", "content": message})
    history.append({"role": "assistant", "content": reply})
    await save_conversation_history(session_id, history)

    return {
        "reply": reply,
        "sources": sources,
        "session_id": session_id,
    }


async def _call_llm_chat(messages: list[dict]) -> str | None:
    """
    Call LLM with a full messages array for chat conversations.

    Reuses the existing OpenRouter configuration from settings.
    """
    import httpx
    from app.core.config import settings

    if not settings.llm_api_key or settings.llm_api_key == "stub":
        logger.info("LLM not configured, returning template response")
        return _generate_fallback_response(messages)

    url = f"{settings.llm_base_url}/chat/completions"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {settings.llm_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.llm_model,
                    "messages": messages,
                    "temperature": 0.4,
                    "max_tokens": 1000,
                },
            )
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"].strip()
    except httpx.HTTPStatusError as e:
        logger.error(f"Chat LLM HTTP error: {e.response.status_code} - {e.response.text}")
        return None
    except httpx.RequestError as e:
        logger.error(f"Chat LLM request error: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Chat LLM call failed: {type(e).__name__} - {str(e)}")
        return None


def _generate_fallback_response(messages: list[dict]) -> str:
    """
    Generate a template-based response when LLM is unavailable.

    Parses the system prompt context to provide basic answers.
    """
    user_msg = ""
    context = ""
    for msg in messages:
        if msg["role"] == "user":
            user_msg = msg["content"]
        if msg["role"] == "system":
            context = msg["content"]

    msg_lower = user_msg.lower()

    if any(w in msg_lower for w in ["pathogenic", "clinically significant", "dangerous"]):
        return (
            "Based on the dataset analysis, here are the key findings regarding pathogenic variants:\n\n"
            "The dataset contains variants classified by ClinVar with varying levels of clinical significance. "
            "Pathogenic and likely pathogenic variants are flagged with higher risk scores (8+/16) and "
            "warrant clinical attention.\n\n"
            "To see specific pathogenic variants, check the **Dashboard** page and filter by "
            "ClinVar significance, or look at the variant detail modal for AI-generated summaries.\n\n"
            "*Note: AI chat is running in template mode. Configure an LLM API key for detailed analysis.*"
        )

    if any(w in msg_lower for w in ["pharmacogenomic", "drug", "medication"]):
        return (
            "Pharmacogenomic analysis requires mapping variants to known drug-gene interactions. "
            "While the current dataset has been annotated with ClinVar data, specific pharmacogenomic "
            "databases (e.g., PharmGKB, CPIC) would provide more targeted drug-gene interaction data.\n\n"
            "Check variants in genes known for pharmacogenomic relevance such as **CYP2D6**, "
            "**CYP2C19**, **DPYD**, **TPMT**, and **UGT1A1** in your dataset.\n\n"
            "*Note: AI chat is running in template mode. Configure an LLM API key for detailed analysis.*"
        )

    if any(w in msg_lower for w in ["summary", "summarize", "overview"]):
        return (
            "Here's a high-level overview of the dataset:\n\n"
            "The variant dataset has been processed through the GeneMapr annotation pipeline, which includes:\n"
            "- **Ensembl VEP** for gene and consequence annotations\n"
            "- **ClinVar** for clinical significance classification\n"
            "- **gnomAD** for population allele frequency data\n"
            "- **Risk scoring** (0-16 scale) based on pathogenicity, rarity, and functional impact\n\n"
            "Visit the **Analytics** page for detailed charts and distributions, or the **Dashboard** "
            "for a filterable variant table.\n\n"
            "*Note: AI chat is running in template mode. Configure an LLM API key for detailed analysis.*"
        )

    if any(w in msg_lower for w in ["conflicting", "uncertain", "vus"]):
        return (
            "Variants of uncertain significance (VUS) are variants where current evidence is insufficient "
            "to classify them as pathogenic or benign. These are common in clinical genomic testing.\n\n"
            "In your dataset, VUS variants can be found by filtering for 'Uncertain significance' in the "
            "ClinVar significance filter on the **Dashboard**.\n\n"
            "Key considerations for VUS:\n"
            "- Population frequency data from gnomAD can help assess rarity\n"
            "- Functional consequence (missense, frameshift, etc.) provides clues\n"
            "- Family segregation studies may help reclassify over time\n\n"
            "*Note: AI chat is running in template mode. Configure an LLM API key for detailed analysis.*"
        )

    return (
        "Thank you for your question. I can help you analyze your variant dataset.\n\n"
        "Here are some things I can help with:\n"
        "- **Pathogenic variant analysis** — identifying clinically significant variants\n"
        "- **Gene-level summaries** — understanding variant burden per gene\n"
        "- **Risk assessment** — explaining risk scores and their components\n"
        "- **Population frequency** — interpreting gnomAD allele frequency data\n"
        "- **Clinical significance** — explaining ClinVar classifications\n\n"
        "Try asking a specific question about your variants!\n\n"
        "*Note: AI chat is running in template mode. Configure an LLM API key for detailed analysis.*"
    )


async def get_suggestions(db: AsyncSession) -> list[dict]:
    """
    Generate contextual starter questions based on the current dataset.
    """
    total_result = await db.execute(select(func.count()).select_from(Variant))
    total = total_result.scalar_one()

    suggestions = []

    if total == 0:
        return [
            {
                "text": "Upload a VCF file first to start analyzing variants",
                "category": "getting_started",
            }
        ]

    # Always include these base suggestions
    suggestions.append(
        {
            "text": "What are the most clinically significant variants in this dataset?",
            "category": "clinical",
        }
    )
    suggestions.append(
        {
            "text": "Summarize the pathogenic variants and their associated conditions",
            "category": "summary",
        }
    )

    # Check for pharmacogenomic-relevant genes
    pharma_genes = ["CYP2D6", "CYP2C19", "CYP2C9", "DPYD", "TPMT", "UGT1A1"]
    pharma_result = await db.execute(
        select(func.count())
        .select_from(Variant)
        .where(Variant.gene_symbol.in_(pharma_genes))
    )
    pharma_count = pharma_result.scalar_one()
    if pharma_count > 0:
        suggestions.append(
            {
                "text": "Are there any actionable pharmacogenomic findings?",
                "category": "pharmacogenomics",
            }
        )

    # Check for VUS variants
    vus_result = await db.execute(
        select(func.count())
        .select_from(Variant)
        .where(Variant.clinvar_significance.ilike("%uncertain%"))
    )
    vus_count = vus_result.scalar_one()
    if vus_count > 0:
        suggestions.append(
            {
                "text": "Which variants have conflicting or uncertain evidence?",
                "category": "vus",
            }
        )

    # Check if multiple genes have variants
    gene_count_result = await db.execute(
        select(func.count(func.distinct(Variant.gene_symbol))).where(
            Variant.gene_symbol.isnot(None)
        )
    )
    gene_count = gene_count_result.scalar_one()
    if gene_count > 1:
        suggestions.append(
            {
                "text": "What genes have multiple variants and what does that suggest?",
                "category": "gene_analysis",
            }
        )

    # High risk suggestion if applicable
    high_risk_result = await db.execute(
        select(func.count())
        .select_from(Variant)
        .where(Variant.risk_score >= 8)
    )
    high_risk = high_risk_result.scalar_one()
    if high_risk > 0:
        suggestions.append(
            {
                "text": f"Explain the {high_risk} high-risk variants and recommended actions",
                "category": "risk",
            }
        )

    return suggestions[:6]
