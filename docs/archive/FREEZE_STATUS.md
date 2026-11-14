# SPEX — Feature Freeze & Codebase Status Audit

**Date:** November 10, 2026  
**Auditor:** Automated Engineering System (AI Studio Build)  
**Test Suite Status:** 80 tests passing, 0 failures (`npm test`)  
**TypeScript Lint:** 0 errors (`npm run lint` / `tsc --noEmit`)  
**Data Release Target:** SPHEREx QR2 / Nov 13 Challenge Data Drop  

---

## 1. Feature Status Matrix

| Component / Subsystem | Feature | Status | Evidence / File Path | Test Reference |
| :--- | :--- | :--- | :--- | :--- |
| **Astrometry & WCS** | TAN-SIP Non-Linear Distortion | `WORKING` | `src/science/wcs.ts` | `science.test.ts` (Synthetic Tests D, E, F) |
| **Astrometry & WCS** | Subpixel Centroiding (Flux-Weighted Center) | `WORKING` | `src/science/pipeline.ts` | `science.test.ts` (Regression 51) |
| **Astrometry & WCS** | Proper Motion Propagation ($J2000 \rightarrow \text{MJD}$) | `WORKING` | `src/science/properMotion.ts` | `science.test.ts` (Phase 1, Task 6) |
| **Astrometry & WCS** | Sexagesimal $\leftrightarrow$ Decimal Converter | `WORKING` | `src/science/coordinates.ts` | `science.test.ts` (Task 1) |
| **FITS Ingestion** | Multi-Extension FITS (MEF) Parser (6 HDUs) | `WORKING` | `src/science/fitsReader.ts` | `science.test.ts` (Test 52) |
| **FITS Ingestion** | Data Quality (DQ) Bitmask Decoding & Masked Fraction | `WORKING` | `src/science/timeSeriesPipeline.ts` | `science.test.ts` (Task 8) |
| **Data Architecture** | Canonical Data-Source Adapter (TAP $\rightarrow$ internal shape) | `WORKING` | `src/science/dataSourceAdapter.ts` | `dataSourceAdapter.test.ts` (6 tests) |
| **Data Architecture** | Zero Rows vs Network Failure Separation | `WORKING` | `src/science/dataSourceAdapter.ts` | `dataSourceAdapter.test.ts` |
| **Data Architecture** | Offline Fixtures Mode (`SPHEREX_OFFLINE=1`) | `WORKING` | `src/science/dataSourceAdapter.ts`, `data/spherex_cache/` | `dataSourceAdapter.test.ts` |
| **Data Architecture** | Demo-Safe Cutout Cache & Manifest | `WORKING` | `scripts/prefetch_targets.ts`, `data/demo_cache/` | `prefetch_targets.ts` (Verification) |
| **Data Architecture** | Data Drop Acceptance Check Script | `WORKING` | `scripts/data_drop_check.ts` | `npm run data-drop-check` |
| **Challenge Targets** | 5 Official Targets + Gaia DR3 Astrometry | `WORKING` | `src/science/challengeTargets.ts` | `science.test.ts` (Task 1, Phase 1) |
| **Challenge Targets** | WISE 0855 Spitzer Astrometry & Needs Check Flag | `WORKING` | `src/science/challengeTargets.ts` | `science.test.ts` (Task 1) |
| **Challenge Targets** | RW Aurigae Proper Motion Correction | `WORKING` | `src/science/challengeTargets.ts` | `science.test.ts` (Phase 1) |
| **Challenge Targets** | Unverified Targets Coverage Suppression | `WORKING` | `src/science/challengeTargets.ts` | `science.test.ts` (Task 1) |
| **Time-Series Engine** | Intra-Visit vs Independent Visit Classification | `WORKING` | `src/science/timeSeriesPipeline.ts` | `science.test.ts` (Task 3) |
| **Time-Series Engine** | Deterministic Fallback URL Generation | `WORKING` | `src/science/timeSeriesPipeline.ts` | `science.test.ts` (Task 2, Phase 1) |
| **Time-Series Engine** | Per-Detector Inverse-Variance Co-Addition (Stacking) | `WORKING` | `src/science/timeSeriesPipeline.ts` | `science.test.ts` (Task 5) |
| **Time-Series Engine** | On-the-Fly Aperture Photometry Spectrum Extraction | `WORKING` | `src/science/timeSeriesPipeline.ts` | `science.test.ts` (Task 5) |
| **Visualization** | Stretches (Linear, Log, Asinh, Sqrt) & Colormaps | `WORKING` | `src/science/astronomyRenderer.ts` | `astronomyRender.test.ts` (5 tests) |
| **User Experience** | English & Arabic Localization (100% key parity) | `WORKING` | `src/utils/translations.ts` | `translations.test.ts` (4 tests) |
| **User Experience** | User-Facing Archive States (Loading, Zero, Error, Cached) | `PARTIAL` | `src/components/ExploreView.tsx` | Needs full UI wiring to adapter |
| **User Experience** | Time Series Frame Player UI | `PARTIAL` | `src/components/ExploreView.tsx` | Needs dedicated player controls & frame toggle |
| **Game & Simulation** | 3D Space Game & SPEX Guide Character | `WORKING` | `src/game/`, `src/spex/` | `game.test.ts` (3 tests) |

---

## 2. Frozen Core Subsystems
The following core subsystems are **FROZEN** against destructive redesign or regressive architectural changes:
1. `src/science/wcs.ts`: Verified mathematically against TAN-SIP distortions.
2. `src/science/fitsReader.ts`: Verified MEF parser with IEEE 754 float conversion and bitpix decoding.
3. `src/science/challengeTargets.ts`: Canonical target definitions, unverified flag protections, and proper motions.
4. `src/science/dataSourceAdapter.ts`: Canonical schema translation and error classification.

---

## 3. Active Next Actions
1. **Server Route Wiring:** Wire `server.ts` routes (`/api/spherex/query`, `/api/spherex/process`, `/api/spherex/timeseries`) to `dataSourceAdapter.ts`, respecting `SPHEREX_OFFLINE=1` and demo cache fallback.
2. **Frontend State Integration:** Connect Explore page to the 5 user-facing states (loading, unreachable + retry / cached copy, zero rows, position pending, success).
3. **Dedicated Frame Player:** Integrate interactive playback, step, scrub bar, speed selector, and sky-vs-target reference frame toggle into the timeseries view.
