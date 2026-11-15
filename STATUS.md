# SPEX — Release & Verification Status

This file consolidates the project release, build, test, and verification status (superseding earlier logs in `CHANGES.md`).

---

## 1. Build, Typecheck & Test Metrics (Verified)

| Check | Command | Result | Notes |
| :--- | :--- | :--- | :--- |
| **TypeScript Lint** | `npm run lint` (`tsc --noEmit`) | **PASS (0 errors)** | Verified across client, server, science, academy, game, and community modules. |
| **Production Build** | `npm run build` (`vite build` + `esbuild server.ts`) | **PASS** | Vite client bundle with `React.lazy` splitting (`Spex3DGame` w/ `three` isolated in its own chunk, `ExploreView`, `SpexAdventureGame`, `AcademyView`, `CommunityView`) + `esbuild` `server.js`. |
| **Combined Check** | `npm run check` | **PASS** | Runs `npm run lint && npm run build`. |
| **Offline Unit Suite** | `SPHEREX_OFFLINE=1 npm test` (`tsx --test`) | **113 / 122 passing across 12 suites** | 12 suites, 122 tests total. All UI, game, translation, progress, provenance, and production-hardening tests pass; 9 failures = **5 pre-existing FITS fixture assertions** in `src/science/science.test.ts` (see §2) + 4 live IRSA network assertions expected under `SPHEREX_OFFLINE=1`. |

### Key Suites (`SPHEREX_OFFLINE=1 npm test`)
- `src/progress/progressStore.test.ts`: **6 / 6 PASS** (rank thresholds, 3-source XP breakdown, bad-data reports, legacy localStorage migration, corrupted/throwing storage resilience)
- `src/utils/translations.test.ts`: **4 / 4 PASS** (100% EN/AR key parity, non-empty strings, valid Arabic script coverage)
- `src/game/minigames/slidingPuzzleLogic.test.ts`: **2 / 2 PASS** (guaranteed-solvable 3×3 / 4×4 board shuffling & orthogonal tile sliding rules)
- `src/community/communityValidation.test.ts`: **5 / 5 PASS** (nickname regex & HTML/link filtering, profanity blocking, flag validation, sliding-window rate limiter)
- `src/science/surveyPasses.test.ts`: **2 / 2 PASS** (real MJD pass grouping across `> 45d` gaps without synthetic uniform spacing)
- `src/game/game.test.ts`: **8 / 8 PASS** (cosmic detective 5-mission math, 102-channel spectral dips, `D = I2 - I1`, 3D station & avatar)
- `src/science/acceptanceAudit.test.ts`, `src/science/archiveAdapter.test.ts`, `src/utils/astronomyRender.test.ts`, `src/utils/productionHardening.test.ts`, `src/utils/provenanceIntegrity.test.ts`: All non-network assertions pass.

---

## 2. Known Pre-Existing Test & Science Caveats (Left Untouched)

1. **5 pre-existing `src/science/science.test.ts` subtest failures** (`1138`, `1376`, `2202`, `2445`, `2851`): On-disk FITS test fixtures in `data/spherex_cache/` are newer `~8.22 MB` 3-HDU cutouts rather than the earlier `5,117,760`-byte / 7-HDU (`WCS-WAVE` `-TAB`) fixtures expected by those legacy assertions. Left untouched per astrometry/pipeline freeze.
2. **Spectra Fallback (`FramePlayer.tsx`, `SpectralExplorerModal.tsx`):** Because some cached cutouts lack a `WCS-WAVE` HDU, the spectrum UI filters for finite points and renders an explicit localized notice (`"Spectrum unavailable for this frame"` / AR) rather than an empty panel or synthetic fallback curve.

---

## 3. Final Pass Fixes (Phases 1–4)

- **Phase 1 — Explore Reliability & Startup Snapshot Fallback (`FramePlayer.tsx`, `App.tsx`, `server.ts`, `translations.ts`):** Fixed conditional React Hook calls in `FramePlayer` that caused runtime crashes when a frame was missing, wrapped Explore in a dedicated `ErrorBoundary` with Retry + `"Use offline demo data"` snapshot fallback, aligned `wise-0855` `band=D5` snapshot matching, and added `20s` client progress/hard-timeout fallback plus resilient `/api/spherex/process` handling for all 5 targets (`wise-0855`, `barnards-star`, `epsilon-indi`, `rw-aurigae`, `r-draconis`) and `?embed=1`.
- **Phase 2 — Academy Session & Storage Stability (`AcademyView.tsx`, `progressStore.ts`, `SpexPortrait.tsx`, `App.tsx`):** Persisted active Academy lesson/exam progress in `sessionStorage` so `"Try it in Explore"` provides a clean `"Back to Academy"` return without losing state; fixed `Next Level` step reset (`lessonStep = 0`); memoized/coalesced `progressStore` storage reads & event notifications; wrapped `AcademyView` in an `ErrorBoundary`.
- **Phase 3 — Interactive Games Overhaul (`SpexAdventureGame.tsx`, `ConstellationDotsGame.tsx`, `SpectrumMatchGame.tsx`, `SpotDifferenceBlinkGame.tsx`, `SlidingSkyPuzzleGame.tsx`, `slidingPuzzleLogic.ts`):**
  - Reworked all 4 mini-games with real multi-constellation challenges, on-demand hints & timed mode, 6 progressive infrared molecular rounds with streak + physics cards, real cached SPHEREx sky cutouts with 3-heart fail/retry state in Spot-the-Difference, and 3×3 / 4×4 progressive sliding puzzle tiles rendered with high-DPR cutouts.
  - Fixed `SpexAdventureGame.tsx` `handleAttemptWrong` life decrement loop so 0 lives triggers a real Game Over / Retry modal, tied every chapter to Mr. SPEX's faint-signal rescue storyline, and removed orphaned dead modules (`SpexTaskStationGame.tsx`, `src/game/scenes/Chapter1–3Scene.tsx`).
- **Phase 4 — Repository Hygiene & Environment Pinning:** Replaced `bun.lock` with a single `package-lock.json` matching `Dockerfile`'s `npm ci`, aligned `esbuild` with `vite@8`, removed unused npm packages (`motion`, `autoprefixer`) and dead legacy components (`ScientistExplore.tsx` and its unused children), added `.nvmrc` (`22`), `"engines": { "node": ">=22" }`, and `"npm run check"`, and verified clean fresh-clone install + build + Playwright boot.
