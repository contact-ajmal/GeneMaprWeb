def normalize_variant(chrom: str, pos: int, ref: str, alt: str) -> str:
    """
    Normalize variant representation for deduplication.

    Creates a canonical string representation: "chrom:pos:ref:alt"
    with chromosome normalized (remove 'chr' prefix if present).

    Args:
        chrom: Chromosome name
        pos: Position
        ref: Reference allele
        alt: Alternate allele

    Returns:
        Normalized variant string
    """
    # Normalize chromosome (remove 'chr' prefix for consistency)
    normalized_chrom = chrom.lower().replace("chr", "")

    # Create canonical representation
    normalized = f"{normalized_chrom}:{pos}:{ref.upper()}:{alt.upper()}"

    return normalized


def parse_info_field(info_str: str) -> dict:
    """
    Parse VCF INFO field into a dictionary.

    Args:
        info_str: INFO field string (e.g., "DP=50;AF=0.25")

    Returns:
        Dictionary of INFO field key-value pairs
    """
    if not info_str or info_str == ".":
        return {}

    info_dict = {}
    for item in info_str.split(";"):
        if "=" in item:
            key, value = item.split("=", 1)
            info_dict[key] = value
        else:
            # Flag fields (no value)
            info_dict[item] = True

    return info_dict
