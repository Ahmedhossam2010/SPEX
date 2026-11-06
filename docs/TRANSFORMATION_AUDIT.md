# SPEX — Repository Forensic Transformation Audit

**Date:** November 6, 2026  
**Branch:** `spex-redesign-and-education`  
**Auditor:** Senior Multidisciplinary Engineering & Product Team  
**Scope:** Full architectural audit of SPEX (The Changing Sky), NASA SPHEREx temporal exploration platform.

---

## 1. Executive Summary

SPEX is a full-stack astronomical investigation platform built around NASA's SPHEREx mission (Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer). The application enables astronomers and citizen scientists to explore infrared observations, perform difference imaging ($D = I_2 - I_1$), propagate variance and data-quality flags, detect candidates with circular aperture photometry, cross-match against Gaia DR3 and AllWISE via CDS VizieR, and consult SPEX (a witty Egyptian feline astrophysics guide powered server-side by Gemini with grounded algorithmic fallbacks).

This audit identifies what currently works, what is broken or scientifically compromised, what must be preserved, and the roadmap for the complete visual redesign and interactive educational game (*SPHEREx: The Cosmic Detective*).

---

## 2. Technical Stack & Environment

| Layer | Technology | Details |
|---|---|---|
| **Runtime** | Node.js 22 (x86_64 linux) | Dev server on port 3000 (`0.0.0.0`) |
| **Backend** | Express 4 + TypeScript (`tsx`) | Mounts Vite dev middleware in dev mode; bundled via esbuild for production |
| **Frontend** | React 19 + TypeScript | SPA built with Vite 8 |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/vite`) | Dark theme (`#070a14`), light theme (`#f8fafc`), Cairo/Outfit fonts |
| **Animation & Icons** | Motion (v12) + Lucide React | Smooth interactive controls |
| **AI Integration** | `@google/genai` (v2.4.0) | Server-side only via `/api/spex/chat`, strict 1-2 sentence grounded prompt |
| **Science Engine** | Custom pure TypeScript | WCS (TAN-SIP), FITS-MEF parser, Van Oosterom & Strackee spherical polygon solid angles, bilinear subpixel reprojection, aperture photometry, MAD noise estimation |
| **Test Runner** | Node built-in `node:test` | Executed via `tsx --test` (50 tests passing) |

---

## 3. Architecture Map

```
/
├── server.ts                    # Full-stack entry point: IRSA queries, FITS cutouts, differencing, SPEX chat
├── index.html                   # HTML entry point, typography imports (Cairo, Outfit, JetBrains Mono)
├── metadata.json                # AI Studio manifest: name, description, capabilities
├── src/
│   ├── main.tsx                 # React DOM root
│   ├── App.tsx                  # Root state: tabs, language (en/ar), theme (dark/light), loadCase
│   ├── index.css                # Global styles, Tailwind imports, custom font families
│   ├── components/
│   │   ├── Header.tsx           # Global navigation, language toggle, theme toggle, case stats
│   │   ├── HomeView.tsx         # Landing hero, feature highlights, quick-start case selector
│   │   ├── ExploreView.tsx      # Main scientific instrument workspace: image canvas, zoom/pan, stretch
│   │   ├── CasesView.tsx        # Curated archival benchmark cases catalogue
│   │   ├── AboutView.tsx        # Mission overview, SPHEREx specs, scientific methodology
│   │   ├── SpherexLogo.tsx      # Brand logo component (to be updated to exact supplied asset)
│   │   ├── FindingCard.tsx      # Candidate inspection card with photometry, flags, and cross-matches
│   │   ├── SpexCompanion.tsx    # Interactive SPEX guide assistant modal & chat
│   │   ├── SpexPopup.tsx        # Compact floating SPEX mascot reaction popup
│   │   ├── DiscoveryReportModal.tsx # Formal astrophysical candidate discovery report exporter
│   │   ├── CandidateComparisonModal.tsx # Side-by-side epoch 1 vs epoch 2 cutout inspector
│   │   ├── SkyCoverageModal.tsx # SPHEREx QR2 footprint & official challenge targets explorer
│   │   ├── SpectralExplorerModal.tsx # 102 spectral channels & 6 detector arrays inspector
│   │   ├── ProvenanceModal.tsx  # Cryptographic & algorithmic provenance inspector (SHA-256)
│   │   └── ScienceTerm.tsx      # Interactive scientific translator tooltip
│   ├── science/
│   │   ├── types.ts             # Core data contracts: FITSData, Observation, CandidateDetection
│   │   ├── fitsReader.ts        # IEEE-754 Big-Endian 7-HDU FITS parser (IMAGE, VAR, FLAGS)
│   │   ├── wcs.ts               # Generalized TAN-SIP forward/inverse astrometric projection
│   │   ├── pipeline.ts          # Difference imaging engine ($D = I_2 - I_1$), candidate extraction
│   │   ├── catalogMatcher.ts    # CDS VizieR TAP multi-catalog cross-matcher (Gaia DR3, AllWISE)
│   │   ├── spectralBands.ts     # 102 channels across 6 detector arrays (0.75 - 5.00 µm)
│   │   ├── challengeTargets.ts  # Official challenge target catalogue and NEP survey footprint
│   │   ├── dataReleaseAdapter.ts # Dataset release validation and forensic deduplication
│   │   └── releaseValidator.ts  # CLI release validator for official data drops
│   ├── utils/
│   │   ├── astronomyRender.ts   # Canvas pixel renderer: Linear, Sqrt, Log, Asinh stretches & colormaps
│   │   ├── scientificGlossary.ts# Two-layer terminology dictionary (Simple & Rigorous definitions)
│   │   └── translations.ts      # Complete English and Egyptian Arabic translation keys
│   └── spex/
│       └── spexAssets.ts        # 16 approved mascot poses & facial expression assets
```

---

## 4. Current State Assessment

### 4.1 What Currently Works
- **FITS-MEF Parser:** Decodes real multi-extension FITS from NASA/IPAC IRSA, extracting primary image (HDU 1), variance (HDU 2), and quality bitmask (HDU 3).
- **Astrometric TAN-SIP:** Handles forward sky-to-pixel and inverse pixel-to-sky transformations, preserving SIP polynomial distortion coefficients ($A, B, AP, BP$).
- **Variance Propagation:** Correctly resamples variance with squared bilinear weights ($\sigma_{\text{resamp}}^2 = \sum w_i^2 \sigma_i^2$) and computes significance $S = D / \sqrt{\sigma_1^2 + \sigma_2^2}$.
- **Quality Bitmask Filtering:** Inspects SPHEREx Level-2 flags (`TRANSIENT`, `OVERFLOW`, `OUTLIER`, etc.) to filter false candidate spikes.
- **Bilingual Two-Layer UI:** Full English and Arabic translations with RTL support and scientific glossary tooltips.
- **Persistent Cache & Durability:** Mirrored real NASA cutouts in `data/spherex_cache` with auto-seeding to `/tmp/spherex_cache`.

### 4.2 What Is Broken or Incomplete (Audited Scientific & UI Defects)
1. **False Moving-Object Candidates (`pipeline.ts` lines 1009–1064):**
   - The candidate pipeline paired weak stationary PSF residuals with unrelated negative residuals separated by up to 30 pixels (up to 184.5"), classifying them as `Moving object candidate`.
   - It erroneously wiped out `REGISTRATION_OR_PSF_DIPOLE` flags and forced a moving object classification even without verifying that a source was absent at epoch 1 and present at epoch 2.
2. **Subpixel Candidate Centroiding Quantization (`pipeline.ts` line 946):**
   - Candidate sky coordinates were calculated by feeding integer pixel peak coordinates (`x, y`) directly into `WCS.pixToSky`.
   - Lacks subpixel centroid fitting (center-of-mass / parabolic / Gaussian moment estimation) and does not store centroid uncertainty.
3. **Cursor WCS Inaccuracy (`ExploreView.tsx` line 261):**
   - The interactive cursor readout in `ExploreView` unconditionally referenced `currentResult.epoch1.wcs`, returning epoch 1 coordinates even when inspecting epoch 2, difference, significance, split view, or sequence frames.
4. **Candidate Overlay Positioning Desynchronization (`ExploreView.tsx` lines 760–765):**
   - Candidate marker coordinates assumed a hardcoded `canvasSize = 480`.
   - On mobile viewports (where the canvas displays at 320px) or non-standard container sizes, marker highlights were severely offset from the underlying celestial objects.
5. **Footprint Geometry Boundary Consistency:**
   - Mixed conventions between pixel-center extrema (`0` to `w-1`) and physical pixel outer boundaries (`-0.5` to `w-0.5`).
6. **Brand Logo Asset Discrepancy (`SpherexLogo.tsx`):**
   - An SVG approximation was used instead of the authoritative brand asset: `/public/assets/aistudio/eye_logo_no_text_centered_e772aeab.png`.
7. **Educational Experience:**
   - Currently lacks the dedicated interactive two-level educational game (*SPHEREx: The Cosmic Detective*) mandated by the product vision.

---

## 5. Scope of Transformation

1. **Phase 1: Scientific Integrity Repair**
   - Overhaul candidate classification to strictly separate `POSSIBLE_MOVING_OBJECT`, `STATIONARY_SOURCE_RESIDUAL`, `REGISTRATION_OR_PSF_ARTIFACT`, `INSUFFICIENT_EVIDENCE`, and `SIGNIFICANT_FLUX_CHANGE`.
   - Implement subpixel centroiding with documented fallback and uncertainty preservation.
   - Dynamic cursor WCS referencing the active rendered pane/epoch.
   - Responsive candidate overlay positioning using actual element bounding rects and pixel-center conventions.
   - Solid angle and footprint boundary clarity.
2. **Phase 2: Complete Visual Redesign**
   - New deep-space design tokens (midnight navy, cyan/ice-blue accents, warm amber, violet spectral cues).
   - Authoritative SPEX Celestial Eye logo integration.
   - Hero redesign answering the 4 core questions in 10–15 seconds.
   - Modernized Explore workspace with progressive disclosure and prominent viewport presence.
3. **Phase 3: Interactive Educational Game — *SPHEREx: The Cosmic Detective***
   - Level 1: "Become the Observer" (4 interactive missions: EM Spectrum, 102 Spectral Bands, All-Sky Survey, Observation-to-Image pipeline).
   - Level 2: "Find What Changed" (4 interactive missions: Multi-Epoch Comparison, Difference Imaging, Evidence Investigation, Final Forensic Case).
   - Strict synthetic data isolation (`EDUCATIONAL_SYNTHETIC_DATA`).
4. **Phase 4: Onboarding & Product Bridge**
   - Direct pathway from Cosmic Detective completion into live scientific exploration.
5. **Phase 5 & 6: Data Release Readiness, Accessibility & Responsive Refinement**
   - Complete verification across desktop, tablet, and mobile viewports.
