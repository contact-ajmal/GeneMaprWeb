# Dashboard Page Redesign - Implementation Plan

## Current Progress

✅ **Upload Page** - Fully transformed with new design system
🚧 **Dashboard Page** - Ready for transformation
⏳ **Analytics Page** - Queued
⏳ **Variant Detail Modal** - Queued

## Dashboard Page Transformation Requirements

### 1. Stats Bar (Top KPI Cards)
- Glass cards with animated numbers (count-up from 0)
- Subtle background icons (low opacity)
- Colored left borders matching severity
- Hover lift effect
- Staggered reveal animation (100ms delay between cards)
- Cards: Total | Pathogenic | Likely Path | VUS | High Risk

### 2. Filter Panel
- Glass sidebar or collapsible top panel
- Custom input styling:
  - Transparent background with bottom border
  - Cyan glow on focus
  - Glass dropdowns with cyan highlights
  - Gradient range sliders (cyan to magenta)
  - Ghost-style reset button
- Active filters as removable pills with glow

### 3. Variant Table (NO Traditional Table)
- Glass container
- Custom styled rows:
  - Hover: cyan glow on left edge + background lightens
  - Alternating rows: subtle opacity difference
  - Whole row clickable
- Risk score: GlowBadge component
- ClinVar: colored text (not badges)
- Gene: JetBrains Mono, cyan color
- AF: scientific notation, gray text
- Pagination: glass pills with glow on active

### 4. CSV Export Button
- Glass button with download icon in toolbar
- Subtle glow on hover

## Next Steps

The dashboard transformation requires updating multiple components:
1. Create custom KPI card component
2. Create custom filter inputs
3. Redesign variant table rows
4. Update pagination
5. Apply throughout

Given the scope, would you like me to:
A) Complete the full Dashboard transformation now
B) Update Analytics Page first
C) Create reusable component library first

Let me know and I'll continue!