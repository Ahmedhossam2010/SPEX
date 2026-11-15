# SPEX — Release, Verification & Consolidation Status

This file consolidates all release, verification, bug-fix, and known-limitation records for SPEX (superseding `CHANGES.md` and earlier progress logs).

---

## 1. Build, Typecheck & Test Metrics (Verified)

| Check | Command | Result | Notes |
| :--- | :--- | :--- | :--- |
| **TypeScript Lint** | `npm run lint` (`tsc --noEmit`) | **PASS (0 errors)** | Clean across client, server, science, academy, game, and community modules. |
| **Production Build** | `npm run build` (`vite build` + `esbuild server.ts`) | **PASS** | Vite client bundle + `esbuild` `server.js` bundle (`dist/` and `server.js` are gitignored build outputs). |
| **Combined Check** | `npm run check` | **PASS** | Runs `npm run lint && npm run build`. |
| **Full Test Suite** | `npm test` (`tsx --test`) | **117 / 122 PASS (5 FAIL)** | 12 suites, 122 tests total. All 11 non-legacy-FITS suites pass (translations, progressStore, surveyPasses, communityValidation, acceptanceAudit, archiveAdapter, astronomyRender, productionHardening, provenanceIntegrity, game, slidingPuzzleLogic); all 5 failures are pre-existing legacy FITS fixture assertions in `src/science/science.test.ts` (see §2). |

---

## 2. Exact Failing Tests (`npm test`: 117 PASS, 5 FAIL)

All 5 failures occur in `src/science/science.test.ts` because the tracked `data/spherex_cache/*.fits` fixtures are newer `8,219,936`-byte 3-HDU cutouts rather than the earlier `5,117,760`-byte 7-HDU (`WCS-WAVE` `-TAB`) cutouts:
1. `src/science/science.test.ts:1138` — `Significance Calculation & Pixel Verification: verifies mathematical formula and pixel integrity` (`CAND-36` assertion mismatch on updated fixture).
2. `src/science/science.test.ts:1376` — `Real FITS Regression Traceability` (expects `5117760` bytes; actual `8219936`).
3. `src/science/science.test.ts:2202` — `Real FITS Integration Test J` (expects `5117760` bytes; actual `8219936`).
4. `src/science/science.test.ts:2445` — `FITSReader: parses and indexes all 6 MEF extensions` (expects 7 HDUs; actual 3 HDUs).
5. `src/science/science.test.ts:2851` — `Phase B (B4/B5/B6): WCS-WAVE -TAB evaluation` (`WCS-WAVE` extension absent in 3-HDU fixture).

---

## 3. Verified Fixes & Architecture Summary

- **Explore Survey-Pass Default (`FramePlayer.tsx`, `surveyPasses.ts`, `translations.ts`):**
  - Survey-pass mode (`groupFramesBySurveyPass`) is ON by default (including deep links without `?pass=`), displaying one representative median-combined frame per pass with real observation dates and real month gaps (`Pass N · Mon YYYY · +X.X months`). No time resampling or synthetic spacing is ever performed.
  - Added localized note (`"Frames come from different SPHEREx survey passes, about six months apart, so real motion has time to add up."`), explicit `< 2` pass fallback notice, and `"Show all visits"` toggle inside **Advanced**.
  - Verified all 5 saved snapshots (`data/snapshots/*.json`):
    - **WISE 0855** (5 frames -> 3 passes): `2025-05-06`, `2025-11-08` (`+6.1 months`), `2026-05-14` (`+6.0 months`)
    - **RW Aurigae** (5 frames -> 3 passes): `2025-09-03`, `2026-03-08` (`+6.1 months`), `2026-09-09` (`+6.0 months`)
    - **R Draconis** (5 frames -> 3 passes): `2025-06-25`, `2025-12-12` (`+5.7 months`), `2026-06-23` (`+6.5 months`)
    - **Barnard's Star** (5 frames -> 3 passes): `2025-08-29`, `2026-03-21` (`+6.8 months`), `2026-09-22` (`+5.6 months`)
    - **Epsilon Indi** (5 frames -> 4 passes): `2025-04-29`, `2025-09-28` (`+5.0 months`), `2026-04-29` (`+7.0 months`), `2026-09-28` (`+4.9 months`) *(passes vary between 4.9 and 7.0 months rather than exactly 6.0 months).*
- **Explore Guided Tour & Responsive Polish (`SpexGuidedTour.tsx`, `ExploreView.tsx`, `FramePlayer.tsx`, `SpexCompanion.tsx`):**
  - Fixed guided tour blocking pointer events (`pointer-events-none` backdrop, `aria-modal="false"`), added `data-testid="tour-close-btn"` to X close, added `Escape` dismissal, kept `Skip` and `localStorage` persistence inside `try/catch`, and fixed `ExploreView` 450ms timer cancellation on metadata updates.
  - Adjusted `390x844` floating panel clearances (`top-32` rails, `SpexCompanion` raised to `bottom-[17rem]`) — verified zero horizontal overflow (`390px`) and zero panel overlap at both `1280x800` and `390x844`.
  - Automatic 12-second live-archive timeout switches benchmark targets cleanly to `"Showing saved snapshot"`; `ErrorBoundary` provides both **Retry** and **Use offline demo data** (`preferSnapshot`).
- **Academy Freeze Root Cause & Fix (`progressStore.ts`, `useModalBehavior.ts`, `AcademyView.tsx`):**
  - **Root cause:** `useProgress()` returned fresh object and callback identities on every render (and `migrateLegacyStorage` stamped fresh `updatedAt` timestamps on unmigrated/failed writes), while `useModalBehavior` listed `onClose` in its `useEffect` dependency array—re-running scroll-lock/key listeners across renders.
  - **Fix:** Memoized callbacks and derived return objects in `useProgress()`, stabilized `useModalBehavior` with `onCloseRef`, and wrapped `AcademyView` in `<ErrorBoundary>` with a `"Back to course map"` action. Verified via Playwright: Level 0 lesson sections -> exam -> results -> Back to Course Map completes with zero freeze and zero page errors.
- **Game Canvases High-DPR (`CosmicDetectiveGame.tsx`, `minigames/*.tsx`, `smoothCanvas.ts`):**
  - Sized every game canvas (`CosmicDetectiveGame` `m1–m5`, `ConstellationDotsGame`, `SpotDifferenceBlinkGame`, `SlidingSkyPuzzleGame`) by `devicePixelRatio` using `getCanvasDpr()` + `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` (fixed missing DPR scaling in `CosmicDetectiveGame` Mission 4).
- **API & Configuration Robustness (`.env.example`, `server.ts`, `catalogMatcher.ts`):**
  - Documented all 23 server env vars in `.env.example` with comments, defaults, and dependent features; app runs with zero keys.
  - Upgraded `GET /api/health` with fast `8s` timeout + 1 retry, optional service booleans (`services.gemini`, `irsaTap`, etc., never key strings), FITS `cache` stats, and `dataSourceMode` (`live` vs `snapshot`).
  - Added retry/backoff to `fetchEsaGaia` / `fetchCfaWise` and graceful memory fallback on `/api/community/*` if disk persistence is unavailable.
- **Repository Hygiene:**
  - Single `package-lock.json` matching `Dockerfile` (`npm ci`), `.nvmrc` pinned to `22`, `engines.node >= 22`, `npm run check`, and gitignored `dist/` & `server.js`.

---

## 4. Honest Known Limitations

1. **Snapshot Fallback:** When live NASA/IPAC IRSA TAP or cutouts respond slowly (`>12s`) or return `5xx`, benchmark targets automatically fall back to saved archive snapshots (`Showing saved snapshot`) instead of live archive frames.
2. **Ephemeral Community Storage:** `/api/community/*` persists to `data/community_store.json` locally, so posts, comments, and flags reset across stateless container restarts unless backed by a persistent volume.
3. **5 Failing Legacy Science Tests:** `117/122` pass in `npm test`; 5 pre-existing assertions in `src/science/science.test.ts` fail against the newer 3-HDU cached FITS fixtures.
4. **Monolithic `server.ts`:** Backend routes and archive orchestration remain inside a single `~5,100`-line `server.ts` file rather than split route modules.
