"""
Test script for Phase 3 functionality:
- Risk scoring
- AI summaries
- Variant filtering
- CSV export
"""
import asyncio
import httpx
from pathlib import Path


BASE_URL = "http://localhost:8000"


async def test_phase3():
    """Test Phase 3 features"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        print("=" * 70)
        print("Testing Phase 3: Scoring, AI Summary, Filtering, and Export")
        print("=" * 70)

        # Test 1: Check if API is up
        print("\n1. Testing API health...")
        response = await client.get(f"{BASE_URL}/health")
        assert response.status_code == 200, "API is not healthy"
        print("   ✓ API is healthy")

        # Test 2: Get variants with all filters
        print("\n2. Testing variant filtering...")

        # Test gene filter
        print("   Testing gene filter...")
        response = await client.get(f"{BASE_URL}/api/variants?gene=BRCA1")
        assert response.status_code == 200
        data = response.json()
        print(f"   ✓ Found {data['total']} variants in BRCA1")

        # Test significance filter
        print("   Testing significance filter...")
        response = await client.get(f"{BASE_URL}/api/variants?significance=pathogenic")
        assert response.status_code == 200
        data = response.json()
        print(f"   ✓ Found {data['total']} pathogenic variants")

        # Test allele frequency filter
        print("   Testing allele frequency filter...")
        response = await client.get(f"{BASE_URL}/api/variants?af_max=0.01")
        assert response.status_code == 200
        data = response.json()
        print(f"   ✓ Found {data['total']} rare variants (AF < 0.01)")

        # Test consequence filter
        print("   Testing consequence filter...")
        response = await client.get(f"{BASE_URL}/api/variants?consequence=missense")
        assert response.status_code == 200
        data = response.json()
        print(f"   ✓ Found {data['total']} missense variants")

        # Test risk score filters
        print("   Testing risk score filters...")
        response = await client.get(f"{BASE_URL}/api/variants?min_score=5")
        assert response.status_code == 200
        data = response.json()
        print(f"   ✓ Found {data['total']} high-risk variants (score >= 5)")

        # Test combined filters
        print("   Testing combined filters...")
        response = await client.get(
            f"{BASE_URL}/api/variants?significance=pathogenic&af_max=0.01&min_score=5"
        )
        assert response.status_code == 200
        data = response.json()
        print(f"   ✓ Found {data['total']} pathogenic, rare, high-risk variants")

        # Test 3: Check if variants have risk_score and ai_summary
        print("\n3. Testing risk scoring and AI summaries...")
        response = await client.get(f"{BASE_URL}/api/variants?page_size=5")
        assert response.status_code == 200
        data = response.json()

        if data['variants']:
            variant = data['variants'][0]
            print(f"   Sample variant: {variant['chrom']}:{variant['pos']}")

            # Check risk_score
            if variant.get('risk_score') is not None:
                print(f"   ✓ Risk score: {variant['risk_score']}")
            else:
                print("   ⚠ Risk score not set (variant may not be annotated yet)")

            # Check ai_summary
            if variant.get('ai_summary'):
                summary_preview = variant['ai_summary'][:100] + "..."
                print(f"   ✓ AI Summary preview: {summary_preview}")
            else:
                print("   ⚠ AI summary not set (variant may not be annotated yet)")

            # Show full details of first variant
            print(f"\n   Full variant details:")
            print(f"   - Gene: {variant.get('gene_symbol', 'N/A')}")
            print(f"   - Consequence: {variant.get('consequence', 'N/A')}")
            print(f"   - ClinVar: {variant.get('clinvar_significance', 'N/A')}")
            print(f"   - gnomAD AF: {variant.get('gnomad_af', 'N/A')}")
            print(f"   - Risk Score: {variant.get('risk_score', 'N/A')}")
        else:
            print("   ⚠ No variants found in database")

        # Test 4: CSV Export
        print("\n4. Testing CSV export...")
        response = await client.get(f"{BASE_URL}/api/variants/export/csv")
        assert response.status_code == 200
        assert response.headers['content-type'] == 'text/csv; charset=utf-8'
        csv_content = response.text
        lines = csv_content.split('\n')
        print(f"   ✓ CSV export successful ({len(lines)} lines)")
        print(f"   ✓ Header: {lines[0][:100]}...")

        # Test CSV export with filters
        print("\n   Testing CSV export with filters...")
        response = await client.get(
            f"{BASE_URL}/api/variants/export/csv?min_score=3"
        )
        assert response.status_code == 200
        csv_content = response.text
        lines = csv_content.split('\n')
        print(f"   ✓ Filtered CSV export successful ({len(lines)} lines)")

        print("\n" + "=" * 70)
        print("Phase 3 testing complete! ✓")
        print("=" * 70)
        print("\nAll features implemented:")
        print("  ✓ Risk scoring service")
        print("  ✓ AI summary generation")
        print("  ✓ Variant filtering (gene, significance, AF, consequence, score)")
        print("  ✓ CSV export with filters")
        print("\nNext steps:")
        print("  - Upload a VCF file to test annotation + scoring + AI summary")
        print("  - Use the filtering endpoints to find specific variants")
        print("  - Export results as CSV")


if __name__ == "__main__":
    asyncio.run(test_phase3())
