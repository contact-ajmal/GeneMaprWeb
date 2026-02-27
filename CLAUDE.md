# CLAUDE.md

## Project: GeneMapr
Genomic variant interpretation platform.

## UI/UX Design System — GeneMapr v2.0

### Design Philosophy
GeneMapr is NOT a generic dashboard. It is a premium scientific instrument.
Think: Bloomberg Terminal meets CRISPR lab meets sci-fi command center.
The UI should feel like looking through a microscope into the genome itself.

### Visual Identity
- Primary dark theme (dark-first design, light mode secondary)
- Color palette:
  * Background: #0a0e1a (deep space navy), #0f1628 (panels)
  * Surface: #141b2d (cards), #1a2332 (elevated)
  * DNA Cyan accent: #00d4ff (primary interactive)
  * DNA Magenta accent: #ff3366 (alerts/pathogenic)
  * Helix Green: #00ff88 (benign/success)
  * Amber Warning: #ffaa00 (VUS/caution)
  * Text Primary: #e2e8f0, Secondary: #94a3b8
  * Subtle glow: rgba(0, 212, 255, 0.1) for hover states

### Typography
- Headlines: "Outfit" (Google Fonts) — geometric, modern, scientific
- Body/Data: "JetBrains Mono" for variant data, "Plus Jakarta Sans" for UI text
- NEVER use Inter, Roboto, Arial, or system fonts

### Signature Elements
- DNA double helix animated background (CSS/Three.js)
- Floating particle system on backgrounds
- Glassmorphism panels (backdrop-blur + translucent backgrounds)
- Neon glow effects on interactive elements
- Smooth spring animations on all transitions
- Data appears to "decode" — typewriter/matrix effect on variant loading
- Gradient mesh backgrounds on hero sections

### Animation Library
- Use framer-motion for React animations (install it)
- All page transitions: fade + slide (200ms ease-out)
- Cards: staggered reveal on mount (50ms delay between cards)
- Numbers: count-up animation on KPI cards
- Tables: row fade-in with stagger
- Modals: scale from 0.95 + fade
- Hover states: subtle glow pulse on interactive elements

### Component Design Rules
- Border radius: 12px for cards, 8px for inputs, 20px for pills
- All cards: glass effect (bg-opacity-80 + backdrop-blur-xl + subtle border)
- Shadows: colored shadows matching accent (not gray)
- No hard borders — use gradient borders or subtle opacity borders
- Buttons: gradient backgrounds with glow on hover
- Inputs: transparent background with bottom border, glow on focus
- Tables: NO traditional table borders — use row hover glow + subtle separators

## Conventions
- Python: use ruff for linting, black for formatting
- All backend code uses async/await patterns
- Pydantic v2 model_validator syntax (not v1)
- SQLAlchemy 2.0 async style
- React: functional components only, no class components
- Use TypeScript strict mode
- All API calls through a centralized api client

## Key Decisions
- pysam for VCF parsing
- httpx for async HTTP
- Redis caching with 24hr TTL for external APIs
- PostgreSQL with UUID primary keys

## Testing
- pytest + pytest-asyncio for backend
- Vitest for frontend

## Development Phases

**Break it into phases.** One massive prompt often leads to incomplete files or shallow implementations. Instead:

- ✅ Phase 1: Set up the project structure, Docker config, database models, and backend skeleton with working /upload endpoint
- ✅ Phase 2: Implement the annotation pipeline services (Ensembl, ClinVar, gnomAD) with Redis caching
- ✅ Phase 3: Build the scoring engine and AI summary service
- ✅ Phase 4: Build the complete React frontend
- ✅ Phase 5: Polish and refinements
- ✅ Phase 6: Dashboard Analytics with summary statistics and visualizations

## Explicit Constraints

- Do NOT use placeholder/stub implementations — write real working code
- Do NOT skip files — create every file listed in the structure
- Use pysam.VariantFile for VCF parsing (not manual regex)
- Ensure docker-compose services have health checks
- All Pydantic models must use Pydantic v2 syntax (model_config, not Config class)
- Use SQLAlchemy 2.0 mapped_column syntax, not Column()

## Dependency Versions

```
fastapi>=0.115.0
pydantic>=2.6.0
sqlalchemy>=2.0.30
pysam>=0.22.0
httpx>=0.27.0
redis>=5.0.0
reportlab>=4.0.0
```

## Phase 6-14 Rules

- All new pages must work with existing dark mode toggle
- All new endpoints must have proper error handling and Pydantic response models
- All new frontend pages must use React Query for data fetching
- All charts use Recharts library (already available)
- D3.js can be added for genome visualization
- reportlab for PDF generation (pip install reportlab)
- Maintain existing upload → annotate → score pipeline
- New features are additive, never break existing functionality
- Use Lucide React for all icons (install if not present)
- Every new page needs a loading skeleton and empty state
