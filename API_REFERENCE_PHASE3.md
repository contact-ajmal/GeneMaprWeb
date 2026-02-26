# Phase 3 API Reference

Quick reference guide for the new filtering and export features.

---

## Endpoints

### GET /variants

List variants with optional filtering.

**Base URL:** `http://localhost:8000/variants`

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `page` | integer | No | Page number (default: 1) | `?page=2` |
| `page_size` | integer | No | Items per page (default: 20, max: 100) | `?page_size=50` |
| `gene` | string | No | Filter by gene symbol (exact match) | `?gene=BRCA1` |
| `significance` | string | No | Filter by ClinVar significance (partial match) | `?significance=pathogenic` |
| `af_max` | float | No | Maximum allele frequency (0-1) | `?af_max=0.01` |
| `consequence` | string | No | Filter by consequence (partial match) | `?consequence=missense` |
| `min_score` | integer | No | Minimum risk score | `?min_score=5` |
| `max_score` | integer | No | Maximum risk score | `?max_score=10` |

#### Examples

**Get all variants:**
```bash
curl 'http://localhost:8000/variants'
```

**Get pathogenic variants:**
```bash
curl 'http://localhost:8000/variants?significance=pathogenic'
```

**Get rare variants (AF < 1%):**
```bash
curl 'http://localhost:8000/variants?af_max=0.01'
```

**Get high-risk variants:**
```bash
curl 'http://localhost:8000/variants?min_score=8'
```

**Get missense variants in BRCA1:**
```bash
curl 'http://localhost:8000/variants?gene=BRCA1&consequence=missense'
```

**Complex filter - pathogenic, rare, high-risk:**
```bash
curl 'http://localhost:8000/variants?significance=pathogenic&af_max=0.01&min_score=5'
```

#### Response

```json
{
  "variants": [
    {
      "id": "uuid",
      "chrom": "chr17",
      "pos": 43094692,
      "ref": "G",
      "alt": "A",
      "rs_id": "rs80357713",
      "gene_symbol": "BRCA1",
      "consequence": "missense_variant",
      "protein_change": "p.Ala1708Glu",
      "clinvar_significance": "Pathogenic",
      "gnomad_af": 0.00001,
      "risk_score": 12,
      "ai_summary": "**Variant:** chr17:43094692 G>A...",
      "annotation_status": "completed",
      ...
    }
  ],
  "total": 25,
  "page": 1,
  "page_size": 20
}
```

---

### GET /variants/export/csv

Export variants as CSV with optional filtering.

**Base URL:** `http://localhost:8000/variants/export/csv`

#### Query Parameters

Same as GET /variants (except pagination parameters are ignored).

#### Examples

**Export all variants:**
```bash
curl 'http://localhost:8000/variants/export/csv' > all_variants.csv
```

**Export pathogenic variants:**
```bash
curl 'http://localhost:8000/variants/export/csv?significance=pathogenic' > pathogenic.csv
```

**Export rare, high-risk variants:**
```bash
curl 'http://localhost:8000/variants/export/csv?af_max=0.01&min_score=8' > high_priority.csv
```

**Export variants in specific gene:**
```bash
curl 'http://localhost:8000/variants/export/csv?gene=BRCA1' > brca1_variants.csv
```

#### Response Headers

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename=variants_export.csv
```

#### CSV Columns

```
ID, Chromosome, Position, Reference, Alternate, rsID, Gene, Transcript,
Consequence, Protein Change, ClinVar Significance, ClinVar Review Status,
ClinVar Condition, gnomAD AF, gnomAD AC, gnomAD AN, Risk Score, Quality,
Filter Status, Depth, Allele Frequency, Upload ID, Annotation Status, Created At
```

---

## Risk Scoring Reference

### Scoring Rules

| Criterion | Points |
|-----------|--------|
| ClinVar: Pathogenic | +5 |
| ClinVar: Likely pathogenic | +4 |
| Rare variant (gnomAD AF < 0.01) | +3 |
| Loss-of-function consequence | +4 |
| Missense variant | +2 |
| Synonymous variant | 0 |

### Score Interpretation

| Score Range | Priority Level |
|-------------|----------------|
| 0-3 | Low |
| 4-7 | Moderate |
| 8+ | High |

**Maximum Possible Score:** 16 (Pathogenic + Rare + LOF + High quality)

### Loss-of-Function Consequences

- stop_gained
- frameshift_variant
- splice_acceptor_variant
- splice_donor_variant
- start_lost
- stop_lost
- transcript_ablation

### Missense Consequences

- missense_variant
- inframe_deletion
- inframe_insertion
- protein_altering_variant

---

## Use Cases & Workflows

### Workflow 1: Find High-Priority Variants for Review

**Goal:** Identify variants that need immediate clinical attention.

```bash
# Step 1: Get high-risk pathogenic variants
curl 'http://localhost:8000/variants?significance=pathogenic&min_score=8' \
  | jq '.variants[] | {gene: .gene_symbol, pos: .pos, score: .risk_score}'

# Step 2: Export for detailed review
curl 'http://localhost:8000/variants/export/csv?significance=pathogenic&min_score=8' \
  > high_priority_review.csv
```

### Workflow 2: Gene-Specific Analysis

**Goal:** Analyze all variants in a specific gene.

```bash
# Step 1: Count variants by consequence
curl 'http://localhost:8000/variants?gene=BRCA1' \
  | jq '.variants | group_by(.consequence) | map({consequence: .[0].consequence, count: length})'

# Step 2: Export all BRCA1 variants
curl 'http://localhost:8000/variants/export/csv?gene=BRCA1' \
  > brca1_analysis.csv
```

### Workflow 3: Rare Variant Discovery

**Goal:** Find ultra-rare variants for research.

```bash
# Step 1: Find variants with AF < 0.1%
curl 'http://localhost:8000/variants?af_max=0.001' \
  | jq '.total'

# Step 2: Filter to loss-of-function only
curl 'http://localhost:8000/variants?af_max=0.001&consequence=frameshift' \
  | jq '.variants[] | {gene: .gene_symbol, consequence: .consequence, af: .gnomad_af}'

# Step 3: Export for validation
curl 'http://localhost:8000/variants/export/csv?af_max=0.001&consequence=frameshift' \
  > rare_lof_variants.csv
```

### Workflow 4: Quality Control

**Goal:** Review variants with uncertain significance.

```bash
# Find VUS (variants of uncertain significance)
curl 'http://localhost:8000/variants?significance=uncertain' \
  | jq '.variants[] | {gene: .gene_symbol, consequence: .consequence, score: .risk_score}'

# Export for re-analysis
curl 'http://localhost:8000/variants/export/csv?significance=uncertain' \
  > vus_review.csv
```

---

## Python Integration Examples

### Using httpx

```python
import httpx
import pandas as pd
from io import StringIO

async def get_high_risk_variants():
    async with httpx.AsyncClient() as client:
        # Fetch high-risk variants
        response = await client.get(
            "http://localhost:8000/variants",
            params={"min_score": 8, "page_size": 100}
        )
        data = response.json()

        for variant in data['variants']:
            print(f"{variant['gene_symbol']}: {variant['risk_score']}/16")
            print(variant['ai_summary'])
            print("-" * 80)

async def export_to_dataframe():
    async with httpx.AsyncClient() as client:
        # Export CSV
        response = await client.get(
            "http://localhost:8000/variants/export/csv",
            params={"significance": "pathogenic"}
        )

        # Load into pandas
        df = pd.read_csv(StringIO(response.text))

        # Analyze
        print(df.groupby('Gene')['Risk Score'].mean())

        return df
```

### Using requests

```python
import requests
import pandas as pd

# Get filtered variants
response = requests.get(
    "http://localhost:8000/variants",
    params={
        "gene": "BRCA1",
        "significance": "pathogenic",
        "min_score": 5
    }
)
variants = response.json()['variants']

# Export to CSV
response = requests.get(
    "http://localhost:8000/variants/export/csv",
    params={"gene": "BRCA1", "min_score": 5}
)

# Save to file
with open('brca1_high_risk.csv', 'w') as f:
    f.write(response.text)

# Or load directly into pandas
df = pd.read_csv(StringIO(response.text))
print(df.describe())
```

---

## Testing Checklist

- [ ] Test basic variant listing
- [ ] Test each filter parameter individually
- [ ] Test combined filters
- [ ] Test CSV export without filters
- [ ] Test CSV export with each filter type
- [ ] Verify risk scores are calculated correctly
- [ ] Verify AI summaries are generated
- [ ] Test pagination with filters
- [ ] Test edge cases (empty results, invalid parameters)
- [ ] Verify CSV file formatting and encoding

---

## Common Issues & Solutions

### Issue: No variants returned

**Possible causes:**
1. Filters too restrictive
2. Variants not yet annotated
3. Incorrect filter values

**Solution:**
```bash
# Check total variants
curl 'http://localhost:8000/variants' | jq '.total'

# Check annotation status
curl 'http://localhost:8000/variants?page_size=5' | jq '.variants[] | .annotation_status'
```

### Issue: Risk scores are null

**Cause:** Variants haven't been scored yet (uploaded before Phase 3).

**Solution:**
```bash
# Re-annotate all variants
docker exec -w /app genemapr_backend python -m app.scripts.reannotate_all
```

### Issue: CSV export is slow

**Cause:** Exporting large number of variants.

**Solution:**
- Add filters to reduce result set
- Consider pagination for very large exports
- Implement background job for large exports (future enhancement)

---

## Performance Tips

1. **Use specific filters** to reduce result set size
2. **Paginate large results** rather than fetching all at once
3. **Export only necessary columns** (future enhancement)
4. **Cache frequent queries** on the client side
5. **Use gene + score filters** for targeted analysis

---

## Future Enhancements

- [ ] GraphQL API for flexible field selection
- [ ] Batch export jobs for large datasets
- [ ] Custom column selection for CSV
- [ ] Additional export formats (JSON, Excel, VCF)
- [ ] Real-time filtering with WebSocket
- [ ] Saved filter presets
- [ ] Variant annotations comparison
