"""
Pharmacogenomics service.

Provides drug-gene interaction knowledge base and PGx variant detection.
Maps detected variants to star alleles, metabolizer status, and drug impacts.
"""
from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.variant import Variant


# ──────────────────────────────────────────────────────────────
# Drug-Gene Interaction Knowledge Base
# ──────────────────────────────────────────────────────────────

DRUG_GENE_MAP: dict[str, dict[str, Any]] = {
    "CYP2C19": {
        "drugs": [
            {
                "name": "Clopidogrel",
                "category": "Antiplatelet",
                "interaction": "Prodrug activation",
                "poor_metabolizer": "Reduced efficacy — consider prasugrel or ticagrelor",
                "intermediate_metabolizer": "Reduced efficacy — consider alternative or higher dose",
                "normal_metabolizer": "Standard response expected",
                "rapid_metabolizer": "Standard response expected",
                "ultra_rapid_metabolizer": "Standard response expected",
                "guideline": "CPIC 2022",
            },
            {
                "name": "Omeprazole",
                "category": "Proton Pump Inhibitor",
                "interaction": "Hepatic metabolism",
                "poor_metabolizer": "Increased exposure — reduce dose by 50%",
                "intermediate_metabolizer": "Moderately increased exposure — consider dose reduction",
                "normal_metabolizer": "Standard dosing",
                "rapid_metabolizer": "Reduced efficacy — increase dose or switch to rabeprazole",
                "ultra_rapid_metabolizer": "Significantly reduced efficacy — switch agent",
                "guideline": "CPIC 2020",
            },
            {
                "name": "Sertraline",
                "category": "SSRI Antidepressant",
                "interaction": "Hepatic metabolism (minor pathway)",
                "poor_metabolizer": "Consider 50% dose reduction; monitor for adverse effects",
                "intermediate_metabolizer": "Standard dose; monitor closely",
                "normal_metabolizer": "Standard dosing",
                "rapid_metabolizer": "Standard dosing; may need higher dose",
                "ultra_rapid_metabolizer": "Consider alternative SSRI or higher starting dose",
                "guideline": "CPIC 2023",
            },
            {
                "name": "Voriconazole",
                "category": "Antifungal",
                "interaction": "Primary hepatic metabolism",
                "poor_metabolizer": "4x higher exposure — use alternative antifungal",
                "intermediate_metabolizer": "2x higher exposure — reduce dose",
                "normal_metabolizer": "Standard dosing",
                "rapid_metabolizer": "Reduced exposure — increase dose or use alternative",
                "ultra_rapid_metabolizer": "Very low exposure — use alternative antifungal",
                "guideline": "CPIC 2020",
            },
        ],
        "alleles": {
            "*1": {"rsid": None, "change": "Wild type", "function": "Normal function"},
            "*2": {"rsid": "rs4244285", "change": "G>A", "function": "No function"},
            "*3": {"rsid": "rs4986893", "change": "G>A", "function": "No function"},
            "*17": {"rsid": "rs12248560", "change": "C>T", "function": "Increased function"},
        },
        "chromosome": "10",
    },
    "CYP2C9": {
        "drugs": [
            {
                "name": "Warfarin",
                "category": "Anticoagulant",
                "interaction": "Primary metabolism (S-warfarin)",
                "poor_metabolizer": "Significantly reduced clearance — reduce dose 50-80%",
                "intermediate_metabolizer": "Reduced clearance — reduce dose 20-40%",
                "normal_metabolizer": "Standard dosing per INR",
                "rapid_metabolizer": "Standard dosing per INR",
                "ultra_rapid_metabolizer": "May require higher doses",
                "guideline": "CPIC 2017",
            },
            {
                "name": "Phenytoin",
                "category": "Anticonvulsant",
                "interaction": "Primary hepatic metabolism",
                "poor_metabolizer": "Reduce dose by 50%; increased toxicity risk",
                "intermediate_metabolizer": "Reduce dose by 25%",
                "normal_metabolizer": "Standard dosing",
                "rapid_metabolizer": "Standard dosing",
                "ultra_rapid_metabolizer": "Standard dosing",
                "guideline": "CPIC 2020",
            },
            {
                "name": "Celecoxib",
                "category": "NSAID (COX-2 inhibitor)",
                "interaction": "Hepatic metabolism",
                "poor_metabolizer": "Start with 50% of lowest dose",
                "intermediate_metabolizer": "Start with lowest recommended dose",
                "normal_metabolizer": "Standard dosing",
                "rapid_metabolizer": "Standard dosing",
                "ultra_rapid_metabolizer": "Standard dosing",
                "guideline": "CPIC 2020",
            },
        ],
        "alleles": {
            "*1": {"rsid": None, "change": "Wild type", "function": "Normal function"},
            "*2": {"rsid": "rs1799853", "change": "C>T", "function": "Decreased function"},
            "*3": {"rsid": "rs1057910", "change": "A>C", "function": "No function"},
            "*5": {"rsid": "rs28371686", "change": "C>G", "function": "No function"},
        },
        "chromosome": "10",
    },
    "CYP2D6": {
        "drugs": [
            {
                "name": "Codeine",
                "category": "Opioid Analgesic",
                "interaction": "Prodrug activation to morphine",
                "poor_metabolizer": "No analgesic effect — use alternative analgesic",
                "intermediate_metabolizer": "Reduced morphine formation — consider alternative",
                "normal_metabolizer": "Standard response",
                "rapid_metabolizer": "Standard response; monitor",
                "ultra_rapid_metabolizer": "AVOID — risk of fatal respiratory depression",
                "guideline": "CPIC 2019",
            },
            {
                "name": "Tamoxifen",
                "category": "Selective Estrogen Receptor Modulator",
                "interaction": "Activation to endoxifen",
                "poor_metabolizer": "Reduced efficacy — consider aromatase inhibitor",
                "intermediate_metabolizer": "Reduced efficacy — consider higher dose or alternative",
                "normal_metabolizer": "Standard dosing",
                "rapid_metabolizer": "Standard dosing",
                "ultra_rapid_metabolizer": "Increased endoxifen levels; standard dose adequate",
                "guideline": "CPIC 2018",
            },
            {
                "name": "Tramadol",
                "category": "Opioid Analgesic",
                "interaction": "Activation to O-desmethyltramadol",
                "poor_metabolizer": "Reduced efficacy — use alternative analgesic",
                "intermediate_metabolizer": "Reduced efficacy — consider dose increase",
                "normal_metabolizer": "Standard dosing",
                "rapid_metabolizer": "Standard dosing; monitor",
                "ultra_rapid_metabolizer": "AVOID — respiratory depression risk",
                "guideline": "CPIC 2021",
            },
            {
                "name": "Atomoxetine",
                "category": "ADHD Medication",
                "interaction": "Primary hepatic metabolism",
                "poor_metabolizer": "2-5x higher exposure — start at 40mg, titrate slowly",
                "intermediate_metabolizer": "Moderately increased exposure — start low",
                "normal_metabolizer": "Standard dosing",
                "rapid_metabolizer": "Standard dosing",
                "ultra_rapid_metabolizer": "May require higher dose",
                "guideline": "CPIC 2023",
            },
        ],
        "alleles": {
            "*1": {"rsid": None, "change": "Wild type", "function": "Normal function"},
            "*3": {"rsid": "rs35742686", "change": "delA", "function": "No function"},
            "*4": {"rsid": "rs3892097", "change": "G>A", "function": "No function"},
            "*5": {"rsid": None, "change": "Gene deletion", "function": "No function"},
            "*10": {"rsid": "rs1065852", "change": "C>T", "function": "Decreased function"},
            "*41": {"rsid": "rs28371725", "change": "G>A", "function": "Decreased function"},
        },
        "chromosome": "22",
    },
    "VKORC1": {
        "drugs": [
            {
                "name": "Warfarin",
                "category": "Anticoagulant",
                "interaction": "Target sensitivity (vitamin K epoxide reductase)",
                "poor_metabolizer": "N/A (sensitivity gene, not metabolizer)",
                "intermediate_metabolizer": "N/A",
                "normal_metabolizer": "AG genotype — moderate sensitivity, ~30% dose reduction",
                "rapid_metabolizer": "N/A",
                "ultra_rapid_metabolizer": "N/A",
                "guideline": "CPIC 2017",
            },
        ],
        "alleles": {
            "-1639G>A": {
                "rsid": "rs9923231",
                "change": "G>A",
                "function": "Increased warfarin sensitivity",
            },
            "1173C>T": {
                "rsid": "rs9934438",
                "change": "C>T",
                "function": "Increased warfarin sensitivity",
            },
        },
        "sensitivity_map": {
            "GG": {"label": "Normal sensitivity", "dose_adjustment": "Standard dose"},
            "AG": {"label": "Moderate sensitivity", "dose_adjustment": "Reduce dose ~30%"},
            "AA": {"label": "High sensitivity", "dose_adjustment": "Reduce dose ~50%"},
        },
        "chromosome": "16",
    },
    "DPYD": {
        "drugs": [
            {
                "name": "5-Fluorouracil",
                "category": "Antimetabolite Chemotherapy",
                "interaction": "Primary catabolism",
                "poor_metabolizer": "CONTRAINDICATED — life-threatening toxicity",
                "intermediate_metabolizer": "Reduce dose by 50%; monitor closely",
                "normal_metabolizer": "Standard dosing",
                "rapid_metabolizer": "Standard dosing",
                "ultra_rapid_metabolizer": "Standard dosing",
                "guideline": "CPIC 2018",
            },
            {
                "name": "Capecitabine",
                "category": "Antimetabolite Chemotherapy",
                "interaction": "Prodrug converted to 5-FU; catabolism by DPYD",
                "poor_metabolizer": "CONTRAINDICATED — life-threatening toxicity",
                "intermediate_metabolizer": "Reduce dose by 50%; monitor closely",
                "normal_metabolizer": "Standard dosing",
                "rapid_metabolizer": "Standard dosing",
                "ultra_rapid_metabolizer": "Standard dosing",
                "guideline": "CPIC 2018",
            },
            {
                "name": "Tegafur",
                "category": "Antimetabolite Chemotherapy",
                "interaction": "Prodrug converted to 5-FU; catabolism by DPYD",
                "poor_metabolizer": "CONTRAINDICATED — life-threatening toxicity",
                "intermediate_metabolizer": "Reduce dose by 50%",
                "normal_metabolizer": "Standard dosing",
                "rapid_metabolizer": "Standard dosing",
                "ultra_rapid_metabolizer": "Standard dosing",
                "guideline": "CPIC 2018",
            },
        ],
        "alleles": {
            "*2A": {"rsid": "rs3918290", "change": "IVS14+1G>A", "function": "No function"},
            "*13": {"rsid": "rs55886062", "change": "T>G", "function": "No function"},
            "D949V": {"rsid": "rs67376798", "change": "A>T", "function": "Decreased function"},
            "HapB3": {"rsid": "rs56038477", "change": "C>T", "function": "Decreased function"},
        },
        "chromosome": "1",
    },
    "TPMT": {
        "drugs": [
            {
                "name": "Azathioprine",
                "category": "Immunosuppressant",
                "interaction": "Thiopurine methylation",
                "poor_metabolizer": "Reduce dose 90% or use alternative; myelosuppression risk",
                "intermediate_metabolizer": "Reduce dose 30-50%",
                "normal_metabolizer": "Standard dosing",
                "rapid_metabolizer": "Standard dosing",
                "ultra_rapid_metabolizer": "May need higher dose; reduced efficacy possible",
                "guideline": "CPIC 2019",
            },
            {
                "name": "6-Mercaptopurine",
                "category": "Antimetabolite",
                "interaction": "Thiopurine methylation",
                "poor_metabolizer": "Reduce dose 90% or use alternative",
                "intermediate_metabolizer": "Reduce dose 30-50%",
                "normal_metabolizer": "Standard dosing",
                "rapid_metabolizer": "Standard dosing",
                "ultra_rapid_metabolizer": "May need higher dose",
                "guideline": "CPIC 2019",
            },
            {
                "name": "Thioguanine",
                "category": "Antimetabolite",
                "interaction": "Thiopurine methylation",
                "poor_metabolizer": "Reduce dose 90% or use alternative",
                "intermediate_metabolizer": "Reduce dose 30-50%",
                "normal_metabolizer": "Standard dosing",
                "rapid_metabolizer": "Standard dosing",
                "ultra_rapid_metabolizer": "Standard dosing",
                "guideline": "CPIC 2019",
            },
        ],
        "alleles": {
            "*1": {"rsid": None, "change": "Wild type", "function": "Normal function"},
            "*2": {"rsid": "rs1800462", "change": "G>C", "function": "No function"},
            "*3A": {"rsid": "rs1800460", "change": "A>G", "function": "No function"},
            "*3C": {"rsid": "rs1142345", "change": "A>G", "function": "No function"},
        },
        "chromosome": "6",
    },
    "HLA-B": {
        "drugs": [
            {
                "name": "Abacavir",
                "category": "Antiretroviral (NRTI)",
                "interaction": "Immune-mediated hypersensitivity",
                "poor_metabolizer": "N/A (HLA allele presence/absence)",
                "intermediate_metabolizer": "N/A",
                "normal_metabolizer": "Standard dosing if *57:01 negative",
                "rapid_metabolizer": "N/A",
                "ultra_rapid_metabolizer": "N/A",
                "guideline": "CPIC 2014",
            },
            {
                "name": "Carbamazepine",
                "category": "Anticonvulsant",
                "interaction": "Immune-mediated SJS/TEN risk",
                "poor_metabolizer": "N/A",
                "intermediate_metabolizer": "N/A",
                "normal_metabolizer": "Standard dosing if *15:02 negative",
                "rapid_metabolizer": "N/A",
                "ultra_rapid_metabolizer": "N/A",
                "guideline": "CPIC 2017",
            },
            {
                "name": "Allopurinol",
                "category": "Xanthine Oxidase Inhibitor",
                "interaction": "Immune-mediated SJS/TEN risk",
                "poor_metabolizer": "N/A",
                "intermediate_metabolizer": "N/A",
                "normal_metabolizer": "Standard dosing if *58:01 negative",
                "rapid_metabolizer": "N/A",
                "ultra_rapid_metabolizer": "N/A",
                "guideline": "CPIC 2015",
            },
        ],
        "alleles": {
            "*57:01": {
                "rsid": None,
                "change": "HLA allele",
                "function": "Abacavir hypersensitivity risk",
            },
            "*15:02": {
                "rsid": None,
                "change": "HLA allele",
                "function": "Carbamazepine SJS/TEN risk",
            },
            "*58:01": {
                "rsid": None,
                "change": "HLA allele",
                "function": "Allopurinol SJS/TEN risk",
            },
        },
        "chromosome": "6",
    },
    "SLCO1B1": {
        "drugs": [
            {
                "name": "Simvastatin",
                "category": "Statin (HMG-CoA reductase inhibitor)",
                "interaction": "Hepatic uptake transporter",
                "poor_metabolizer": "AVOID simvastatin — high myopathy risk; use alternative statin",
                "intermediate_metabolizer": "Use max 20mg/day; monitor for myalgia",
                "normal_metabolizer": "Standard dosing",
                "rapid_metabolizer": "Standard dosing",
                "ultra_rapid_metabolizer": "Standard dosing",
                "guideline": "CPIC 2022",
            },
            {
                "name": "Atorvastatin",
                "category": "Statin (HMG-CoA reductase inhibitor)",
                "interaction": "Hepatic uptake transporter",
                "poor_metabolizer": "Use lowest effective dose; monitor for myopathy",
                "intermediate_metabolizer": "Standard dosing; monitor for myalgia",
                "normal_metabolizer": "Standard dosing",
                "rapid_metabolizer": "Standard dosing",
                "ultra_rapid_metabolizer": "Standard dosing",
                "guideline": "CPIC 2022",
            },
            {
                "name": "Rosuvastatin",
                "category": "Statin (HMG-CoA reductase inhibitor)",
                "interaction": "Hepatic uptake transporter",
                "poor_metabolizer": "Use max 20mg/day; monitor for myopathy",
                "intermediate_metabolizer": "Standard dosing; monitor",
                "normal_metabolizer": "Standard dosing",
                "rapid_metabolizer": "Standard dosing",
                "ultra_rapid_metabolizer": "Standard dosing",
                "guideline": "CPIC 2022",
            },
        ],
        "alleles": {
            "*1a": {"rsid": None, "change": "Wild type", "function": "Normal function"},
            "*5": {
                "rsid": "rs4149056",
                "change": "T>C (Val174Ala)",
                "function": "Decreased function",
            },
            "*15": {
                "rsid": "rs4149056",
                "change": "T>C (haplotype)",
                "function": "Decreased function",
            },
        },
        "chromosome": "12",
    },
}

# Mapping of rsIDs to gene + allele for fast lookup during variant scanning
_RSID_LOOKUP: dict[str, list[dict[str, str]]] = {}

def _build_rsid_lookup() -> None:
    """Build reverse lookup from rsID -> gene/allele info."""
    for gene, data in DRUG_GENE_MAP.items():
        for allele_name, allele_info in data["alleles"].items():
            rsid = allele_info.get("rsid")
            if rsid:
                entry = {
                    "gene": gene,
                    "allele": allele_name,
                    "function": allele_info["function"],
                    "change": allele_info.get("change", ""),
                }
                _RSID_LOOKUP.setdefault(rsid, []).append(entry)

_build_rsid_lookup()

# Also build gene-symbol lookup set for matching by gene_symbol field
_PGX_GENES: set[str] = set(DRUG_GENE_MAP.keys())


# ──────────────────────────────────────────────────────────────
# Core PGx Functions
# ──────────────────────────────────────────────────────────────

def detect_pgx_variants(variants: list[Variant]) -> list[dict[str, Any]]:
    """
    Scan a list of Variant ORM objects and identify pharmacogenomically
    relevant variants by matching rs_id or gene_symbol.

    Returns a list of dicts, each representing one PGx-relevant variant.
    """
    pgx_hits: list[dict[str, Any]] = []

    for v in variants:
        # Match by rsID first (most precise)
        if v.rs_id and v.rs_id in _RSID_LOOKUP:
            for entry in _RSID_LOOKUP[v.rs_id]:
                pgx_hits.append({
                    "variant_id": str(v.id),
                    "chrom": v.chrom,
                    "pos": v.pos,
                    "ref": v.ref,
                    "alt": v.alt,
                    "rs_id": v.rs_id,
                    "gene": entry["gene"],
                    "allele": entry["allele"],
                    "function": entry["function"],
                    "change": entry["change"],
                    "gene_symbol": v.gene_symbol,
                    "consequence": v.consequence,
                })
        # Fallback: match by gene symbol
        elif v.gene_symbol and v.gene_symbol.upper() in _PGX_GENES:
            gene = v.gene_symbol.upper()
            pgx_hits.append({
                "variant_id": str(v.id),
                "chrom": v.chrom,
                "pos": v.pos,
                "ref": v.ref,
                "alt": v.alt,
                "rs_id": v.rs_id,
                "gene": gene,
                "allele": "Unknown",
                "function": "Variant in pharmacogene — review manually",
                "change": f"{v.ref}>{v.alt}",
                "gene_symbol": v.gene_symbol,
                "consequence": v.consequence,
            })

    return pgx_hits


def get_drug_interactions(gene: str, allele: str) -> list[dict[str, Any]]:
    """
    Given a gene and allele, return the list of affected drugs with
    clinical impact descriptions.
    """
    gene_upper = gene.upper()
    if gene_upper not in DRUG_GENE_MAP:
        return []

    gene_data = DRUG_GENE_MAP[gene_upper]
    allele_info = gene_data["alleles"].get(allele, {})
    allele_function = allele_info.get("function", "Unknown") if isinstance(allele_info, dict) else "Unknown"
    metabolizer = get_metabolizer_status(gene_upper, allele_function)
    metabolizer_key = metabolizer.lower().replace("-", "_").replace(" ", "_") + "_metabolizer"

    interactions: list[dict[str, Any]] = []
    for drug in gene_data["drugs"]:
        impact = drug.get(metabolizer_key, drug.get("normal_metabolizer", "No data"))
        interactions.append({
            "drug": drug["name"],
            "category": drug["category"],
            "interaction": drug["interaction"],
            "impact": impact,
            "metabolizer_status": metabolizer,
            "guideline": drug["guideline"],
        })

    return interactions


def get_metabolizer_status(gene: str, allele_function: str) -> str:
    """
    Determine metabolizer phenotype from allele function label.

    Returns one of:
        "Poor" | "Intermediate" | "Normal" | "Rapid" | "Ultra-rapid"
    """
    fn = allele_function.lower()

    if "no function" in fn:
        return "Poor"
    if "decreased" in fn:
        return "Intermediate"
    if "increased" in fn:
        return "Rapid"
    if "ultra" in fn:
        return "Ultra-rapid"
    if "sensitivity" in fn:
        # For genes like VKORC1 / HLA-B — not a metabolizer concept
        return "Sensitivity"
    if "risk" in fn:
        return "Sensitivity"

    return "Normal"


def generate_pgx_report(variants: list[Variant]) -> dict[str, Any]:
    """
    Generate a complete pharmacogenomics report from a set of variants.

    Returns:
        {
            pgx_variants: [...],
            drug_interactions: [...],
            gene_summaries: {gene: {metabolizer_status, alleles, drug_count}},
            summary: str
        }
    """
    pgx_variants = detect_pgx_variants(variants)

    # Collect unique gene -> alleles mapping
    gene_alleles: dict[str, list[dict[str, str]]] = {}
    for pv in pgx_variants:
        gene = pv["gene"]
        gene_alleles.setdefault(gene, []).append({
            "allele": pv["allele"],
            "function": pv["function"],
            "rs_id": pv.get("rs_id", ""),
        })

    # Build drug interactions for each detected gene/allele pair
    all_interactions: list[dict[str, Any]] = []
    gene_summaries: dict[str, dict[str, Any]] = {}

    for gene, alleles in gene_alleles.items():
        # Use the most impactful allele (worst function)
        worst_function = _worst_allele_function(alleles)
        metabolizer = get_metabolizer_status(gene, worst_function)

        interactions = get_drug_interactions(gene, alleles[0]["allele"])
        # Override metabolizer based on worst function
        for ix in interactions:
            metabolizer_key = metabolizer.lower().replace("-", "_").replace(" ", "_") + "_metabolizer"
            gene_data = DRUG_GENE_MAP.get(gene, {})
            for drug in gene_data.get("drugs", []):
                if drug["name"] == ix["drug"]:
                    ix["impact"] = drug.get(metabolizer_key, ix["impact"])
                    ix["metabolizer_status"] = metabolizer
                    break

        all_interactions.extend(interactions)

        gene_summaries[gene] = {
            "metabolizer_status": metabolizer,
            "alleles": alleles,
            "drug_count": len(interactions),
        }

    # Generate narrative summary
    summary = _generate_narrative_summary(gene_summaries, all_interactions)

    return {
        "pgx_variants": pgx_variants,
        "drug_interactions": all_interactions,
        "gene_summaries": gene_summaries,
        "summary": summary,
    }


async def get_pgx_data_for_all_variants(db: AsyncSession) -> dict[str, Any]:
    """
    Fetch all annotated variants from DB and generate PGx report.
    This is the main entry point called by the API endpoint.
    """
    query = select(Variant)
    result = await db.execute(query)
    variants = list(result.scalars().all())

    if not variants:
        return {
            "pgx_variants": [],
            "drug_interactions": [],
            "gene_summaries": {},
            "summary": "No variants available for pharmacogenomic analysis. Upload a VCF file to begin.",
        }

    return generate_pgx_report(variants)


# ──────────────────────────────────────────────────────────────
# Internal Helpers
# ──────────────────────────────────────────────────────────────

_FUNCTION_SEVERITY = {
    "no function": 0,
    "decreased function": 1,
    "decreased": 1,
    "increased warfarin sensitivity": 2,
    "increased sensitivity": 2,
    "increased function": 3,
    "normal function": 4,
}


def _worst_allele_function(alleles: list[dict[str, str]]) -> str:
    """Return the allele function string with the worst clinical impact."""
    if not alleles:
        return "Normal function"
    return min(alleles, key=lambda a: _FUNCTION_SEVERITY.get(a["function"].lower(), 4))["function"]


def _generate_narrative_summary(
    gene_summaries: dict[str, dict[str, Any]],
    interactions: list[dict[str, Any]],
) -> str:
    """Build a human-readable clinical summary of PGx findings."""
    if not gene_summaries:
        return "No pharmacogenomically relevant variants were detected in this dataset."

    lines: list[str] = []
    lines.append(
        f"Pharmacogenomic analysis identified variants in {len(gene_summaries)} "
        f"gene(s) affecting {len(interactions)} drug interaction(s)."
    )
    lines.append("")

    actionable_count = 0
    for gene, info in sorted(gene_summaries.items()):
        status = info["metabolizer_status"]
        allele_names = ", ".join(a["allele"] for a in info["alleles"])
        lines.append(f"- **{gene}**: {status} metabolizer (detected alleles: {allele_names})")

        if status in ("Poor", "Intermediate", "Sensitivity"):
            actionable_count += info["drug_count"]

    if actionable_count > 0:
        lines.append("")
        lines.append(
            f"**{actionable_count} drug(s)** may require dose adjustments or alternative therapy "
            "based on the detected genotype. Review individual drug recommendations below."
        )

    # Flag critical interactions
    critical = [
        ix for ix in interactions
        if any(
            kw in ix["impact"].upper()
            for kw in ["CONTRAINDICATED", "AVOID", "LIFE-THREATENING", "FATAL"]
        )
    ]
    if critical:
        lines.append("")
        lines.append("**CRITICAL ALERTS:**")
        for c in critical:
            lines.append(f"  - {c['drug']}: {c['impact']}")

    return "\n".join(lines)
