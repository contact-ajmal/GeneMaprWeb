import uuid
from pathlib import Path
import pysam
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert

from app.models.variant import Variant
from app.utils.normalization import normalize_variant, parse_info_field


async def parse_and_store_vcf(
    vcf_path: Path,
    db: AsyncSession,
    upload_id: str = None
) -> tuple[int, str]:
    """
    Parse VCF file and store variants in database.

    Args:
        vcf_path: Path to VCF file
        db: Database session
        upload_id: Optional upload identifier

    Returns:
        Tuple of (variant_count, upload_id)
    """
    if upload_id is None:
        upload_id = str(uuid.uuid4())

    variant_count = 0
    variants_to_insert = []

    # Open and parse VCF file using pysam
    try:
        vcf = pysam.VariantFile(str(vcf_path))
    except Exception as e:
        raise ValueError(f"Invalid VCF file: {str(e)}")

    try:
        for record in vcf:
            # Extract basic fields
            chrom = record.contig
            pos = record.pos
            ref = record.ref
            qual = record.qual
            filter_status = ";".join(record.filter.keys()) if record.filter else "PASS"
            rs_id = record.id if record.id else None

            # Handle multiple alternate alleles
            for alt in record.alts:
                # Parse INFO fields
                depth = record.info.get("DP", None)
                allele_freq_list = record.info.get("AF", None)

                # Handle AF (can be a list for multiple alleles)
                allele_freq = None
                if allele_freq_list is not None:
                    if isinstance(allele_freq_list, (list, tuple)):
                        allele_freq = float(allele_freq_list[0]) if allele_freq_list else None
                    else:
                        allele_freq = float(allele_freq_list)

                # Normalize variant
                normalized = normalize_variant(chrom, pos, ref, alt)

                # Create variant data
                variant_data = {
                    "id": uuid.uuid4(),
                    "chrom": chrom,
                    "pos": pos,
                    "ref": ref,
                    "alt": alt,
                    "qual": qual,
                    "filter_status": filter_status,
                    "rs_id": rs_id,
                    "depth": depth,
                    "allele_freq": allele_freq,
                    "normalized_variant": normalized,
                    "upload_id": upload_id,
                }

                variants_to_insert.append(variant_data)
                variant_count += 1

        # Bulk insert variants using PostgreSQL INSERT ... ON CONFLICT DO NOTHING
        # This prevents duplicate variants based on unique normalized_variant
        if variants_to_insert:
            stmt = insert(Variant).values(variants_to_insert)
            stmt = stmt.on_conflict_do_nothing(index_elements=["normalized_variant"])
            await db.execute(stmt)
            await db.commit()

    finally:
        vcf.close()

    return variant_count, upload_id
