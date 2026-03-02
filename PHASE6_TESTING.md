# Phase 6 Testing Guide

## Prerequisites
- Backend running: `docker-compose up -d`
- Frontend running: `cd frontend && npm run dev`
- Sample VCF data uploaded with annotations completed

## Test Scenarios

### 1. Backend API Test

#### Test Stats Endpoint
```bash
curl http://localhost:8000/variants/stats | jq
```

**Expected Response:**
```json
{
  "total_variants": 25,
  "pathogenic_count": 0,
  "likely_pathogenic_count": 0,
  "vus_count": 0,
  "benign_count": 0,
  "high_risk_count": 0,
  "mean_risk_score": 2.92,
  "mean_allele_frequency": 0.0,
  "unique_genes": 10,
  "top_genes": [...],
  "consequence_distribution": [...],
  "clinvar_distribution": [...],
  "risk_score_distribution": [...],
  "af_distribution": [...]
}
```

#### Test with Empty Database
```bash
# Should return zeros and empty arrays, not crash
curl http://localhost:8000/variants/stats
```

### 2. Frontend UI Test

#### Access Dashboard
1. Navigate to: `http://localhost:5173` (or your frontend port)
2. Click on "Dashboard" in navigation
3. Analytics section should appear at the top

#### KPI Cards Test
**Expected behavior:**
- 5 cards in a row (Total Variants, Pathogenic, Likely Pathogenic, VUS, High Risk)
- Numbers should animate from 0 to final value on page load
- Each card has appropriate icon and color:
  - Blue for Total (DNA icon)
  - Red for Pathogenic (Alert icon)
  - Orange for Likely Pathogenic (Alert icon)
  - Yellow for VUS (Help icon)
  - Dark red for High Risk (Flame icon)
- Cards should have subtle hover effect

#### Charts Test
**Expected behavior:**
1. **ClinVar Pie Chart** (top-left)
   - Shows distribution of significance classifications
   - Multi-colored slices
   - Labels show percentage
   - Tooltip on hover

2. **Top Genes Bar Chart** (top-right)
   - Horizontal bars
   - Gene names on Y-axis
   - Bars colored by risk (red = high, blue = low)
   - Tooltip shows exact count

3. **Risk Score Distribution** (bottom-left)
   - Vertical bars
   - X-axis shows ranges (0-2, 3-5, 6-8, 9+)
   - Blue bars
   - Tooltip shows exact count

4. **Consequence Distribution** (bottom-right)
   - Vertical bars
   - Purple bars
   - Angled labels for readability
   - Shows top 10 consequence types

#### Quick Insights Test
**Expected behavior:**
- 3 insight cards in a row
- Shows:
  1. Percentage of pathogenic/likely pathogenic variants
  2. Top affected gene with variant count
  3. Ultra-rare variant count (AF < 0.001)
- Cards have gradient background
- Shield icon in header

#### Loading State Test
1. Open DevTools Network tab
2. Throttle network to "Slow 3G"
3. Refresh page
4. Should see skeleton loaders:
   - 5 card skeletons (gray rectangles)
   - 4 chart skeletons (gray rectangles)
   - 1 insights skeleton (gray rectangle)
   - Pulse animation while loading

### 3. Dark Mode Test

#### Toggle Dark Mode
1. Click the dark mode toggle in header
2. **Expected changes:**
   - KPI cards: Dark background with light text
   - Charts: Dark tooltips with light text
   - Chart grids: Darker color
   - Insights: Dark gradient background
   - All text remains readable

3. Toggle back to light mode
4. Everything should revert properly

### 4. Responsive Design Test

#### Desktop (XL - 1280px+)
- KPI cards: 5 columns
- Charts: 2x2 grid
- Insights: 3 columns

#### Tablet (MD - 768px-1279px)
- KPI cards: 3 columns
- Charts: 2 columns (stacked 2x2)
- Insights: 3 columns

#### Mobile (SM - <768px)
- KPI cards: 1 column (stacked)
- Charts: 1 column (stacked 4 total)
- Insights: 1 column (stacked)

**Test:**
1. Open DevTools
2. Toggle device toolbar
3. Test various screen sizes
4. Verify layout adapts correctly

### 5. Data Accuracy Test

#### Verify Statistics Calculation
1. Note the total variant count from the API
2. Add up individual counts (pathogenic + likely_pathogenic + vus + benign)
3. Verify top gene counts match the database
4. Check that risk score distribution adds up to total

#### Cross-check with Variant Table
1. Apply filter: Risk Score Min = 8
2. Count rows in table
3. Compare with "High Risk (≥8)" KPI card
4. Numbers should match

### 6. React Query Test

#### Verify Caching (30s stale time)
1. Open DevTools Network tab
2. Load dashboard
3. Note the `/variants/stats` API call
4. Wait 20 seconds
5. Scroll down and back up
6. Should NOT see another API call (cached)
7. Wait another 15 seconds (total 35s)
8. Scroll down and back up
9. Should see a new API call (cache expired)

### 7. Error Handling Test

#### Simulate Backend Error
1. Stop backend: `docker-compose stop backend`
2. Refresh dashboard
3. Should see loading state, then error boundary
4. Restart backend: `docker-compose start backend`
5. Refresh dashboard
6. Analytics should load successfully

### 8. Performance Test

#### Measure Load Time
1. Open DevTools Performance tab
2. Record page load
3. Stop recording after analytics renders
4. Check:
   - Initial render < 1 second
   - Count animations smooth (60fps)
   - No layout shifts
   - Charts render without jank

### 9. Accessibility Test

#### Keyboard Navigation
1. Tab through the page
2. Focus states should be visible
3. All interactive elements accessible

#### Screen Reader Test (optional)
1. Enable screen reader (VoiceOver on Mac, NVDA on Windows)
2. Navigate through analytics section
3. Card titles and values should be announced
4. Chart data should be accessible

### 10. Integration Test

#### Full Flow Test
1. Upload a new VCF file
2. Wait for annotation to complete
3. Navigate to dashboard
4. Analytics should update automatically (within 30s)
5. New variants should be reflected in:
   - Total variant count
   - Distribution charts
   - Top genes list
   - Quick insights

## Expected Results Summary

✅ **Backend:**
- `/variants/stats` endpoint returns valid JSON
- Returns empty stats (not error) when no variants
- All counts and distributions are accurate

✅ **Frontend:**
- Analytics section renders above variant table
- All 5 KPI cards display with animations
- All 4 charts render correctly with data
- 3 quick insights display
- Loading skeletons appear during load
- Dark mode works correctly
- Responsive design adapts to all screen sizes
- React Query caches for 30 seconds
- No TypeScript or console errors

## Troubleshooting

### Issue: Charts Not Rendering
**Solution:** Verify Recharts installed: `npm list recharts`

### Issue: Icons Not Showing
**Solution:** Verify lucide-react installed: `npm list lucide-react`

### Issue: API Returns 404
**Solution:** Restart backend: `docker-compose restart backend`

### Issue: Animations Not Working
**Solution:** Clear browser cache, hard refresh (Cmd+Shift+R)

### Issue: Dark Mode Not Working
**Solution:** Check ThemeContext is properly configured

## Performance Benchmarks

- **API Response Time:** < 100ms (with 25 variants)
- **Initial Render:** < 1s
- **Animation Duration:** 1s (count-up)
- **Chart Render:** < 500ms per chart
- **Cache Hit:** < 10ms (from React Query)

## Next Phase Preparation

Phase 6 is complete and ready for Phase 7. The analytics dashboard provides a solid foundation for:
- Adding more detailed analytics
- Implementing PDF export
- Adding date range filtering
- Building comparison views
