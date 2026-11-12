# SPEX — Project Progress & Verification Tracker

## Step 0 Audit Status Table

| Item | Description | Status | Evidence / Verification |
|------|-------------|--------|-------------------------|
| **PHASE 1** | **Real data for all 5 challenge targets** | | |
| **1.1** | `scripts/diagnose_irsa.ts` exists & RUN; show raw ADQL, HTTP status, raw body, parsed row count, cutout URL per target | **DONE** | Script executed via `npx tsx scripts/diagnose_irsa.ts`. Output verified: Barnard's Star (359 exposures, Cutout HTTP 200, 5.1MB), WISE 0855 (256 exposures, Cutout HTTP 200, 5.1MB), Epsilon Indi (445 exposures, Cutout HTTP 200, 5.1MB), RW Aur (333 exposures, Cutout HTTP 200, 5.1MB), R Dra (2499 exposures, Cutout HTTP 200, 5.1MB). |
| **1.2** | TAP response parsing verified against IRSA real format; column names verified via `TAP_SCHEMA` | **DONE** | Column names queried live via `SELECT column_name FROM TAP_SCHEMA.columns WHERE table_name='spherex.obscore'`: `obs_id, s_ra, s_dec, access_url, t_min, t_max, em_min, em_max, instrument_name, s_region`. Handled in `src/science/archiveAdapter.ts:128-179`. |
| **1.3** | Image URLs from obscore `access_url` / DataLink or official cutout service, not hand-built IBE paths | **PARTIAL** | `src/science/timeSeriesPipeline.ts:195-245` parses DataLink XML. But `server.ts:564` appended query parameters to `fitsUrl` without universal DataLink resolution for all targets, and had fallback builder. |
| **1.4** | Target-inside-footprint check using WCS or `s_region`, not cone radius | **PARTIAL** | `src/science/challengeTargets.ts:300-380` erroneously gated targets on 3 NEP benchmark files, falsely rejecting valid targets across the sky. Real archive footprint uses `CONTAINS(POINT('ICRS', ra, dec), s_region)=1`. |
| **1.5** | Retry/backoff, cutout timeout 20–30s, max 4 parallel requests | **PARTIAL** | `server.ts:572` had an aggressive 3.5s timeout (`setTimeout(..., 3500)`) and `MAX_RETRIES = 1`, causing spurious download abortions on large FITS frames. Needs 25s timeout with backoff and concurrency limit. |
| **1.6** | Per-target result table: live exposures found, bands, date range | **DONE** | Verified live via IRSA TAP query: all 5 targets have hundreds of calibrated science frames covering Bands 1–6 from MJD 60789 to 60920 (April–September 2025). |
| **PHASE 2** | **Remove misleading data paths** | | |
| **2.1** | `serveOfflineFallback` no longer attaches user's RA/Dec to a different field | **PARTIAL** | `server.ts:553-561` read cached file 0 in offline mode; need explicit provenance indicating exact original pointing. |
| **2.2** | No synthetic SEDs (blackbody/dust); spectra only from measured pixels | **PARTIAL** | `src/science/spectralBands.ts:186-195, 229-247` injected synthetic `isModel: true` points for missing Gaia/WISE. Must only use authentic aperture extractions from measured pixels. |
| **2.3** | Simulated band-mismatch case hidden from public UI | **NOT DONE** | `case-band-mismatch-04` was still present in `CURATED_CASES` in `server.ts:384` and displayed in `src/components/CasesView.tsx:14`. |
| **2.4** | "REAL" badges only for verified live or exact-field cached data; provenance shown on every image | **PARTIAL** | Provenance modal exists (`src/components/ProvenanceModal.tsx`), but viewport HUD overlays need full per-frame metadata (obs_id, true center, MJD, detector, wavelength). |
| **PHASE 3** | **Core player** | | |
| **3.1** | One fixed global intensity scale across sequence (no per-frame percentile flicker) | **NOT DONE** | `src/components/TimeLens/FramePlayer.tsx:142-146` calculated p02/p98 independently on every frame inside the render loop, causing flicker. |
| **3.2** | Only same-band frames played as epochs; band/detector selector; wavelength in HUD | **PARTIAL** | Mixed bands can currently be loaded in sequence. Needs dedicated band filter selector and wavelength display in player HUD. |
| **3.3** | Common-WCS reprojection with sub-pixel interpolation; SIP handled or documented | **DONE** | `src/science/wcs.ts:1-652` and `src/science/pipeline.ts:1-120` provide TAN-SIP inversion, bilinear interpolation, and reprojection grids. |
| **3.4** | Motion visibility: predicted proper-motion marker, accumulating trail, epoch blink, zoom + pixel grid, measured centroid vs time | **NOT DONE** | `FramePlayer.tsx` lacks proper-motion marker overlay, trail, epoch blink crosshair, and centroid plot. |
| **3.5** | Difference modes: minus reference, minus median, stack; DQ masking | **PARTIAL** | Math exists in `timeSeriesPipeline.ts:315-405`, but `FramePlayer.tsx` lacks UI toggles for minus reference, minus median, and DQ masking. |
| **3.6** | DQ flag overlay + per-frame metadata | **PARTIAL** | Supported in `AstronomicalSkyViewport.tsx`, not exposed in `FramePlayer.tsx`. |
| **3.7** | Keyboard controls, loop, export GIF/MP4/PNG sequence | **NOT DONE** | `FramePlayer.tsx` lacks keyboard event handlers (Space, Arrow keys) and export capabilities. |
| **PHASE 4** | **Aladin Lite & Catalog Overlays** | | |
| **4.1** | Aladin Lite panel (pinned CDN) synced to coords/FOV; Gaia + AllWISE overlays | **NOT DONE** | Aladin Lite is not imported or mounted anywhere in `src/` or `index.html`. |
| **PHASE 5** | **First-run experience** | | |
| **5.1** | First screen is Explore tool, presets for 5 targets with deep links (?target=wise0855&band=3) | **PARTIAL** | `src/App.tsx:21` defaults to `'home'` tab (marketing hero). Needs default landing on `'explore'` with quick-launch target selector. |
| **5.2** | Game/mascot moved to secondary navigation | **PARTIAL** | Mascot and Game tab currently occupy primary navigation bar. |
| **5.3** | "Why this matters" panel + 60-second guided demo mode (WISE 0855) | **NOT DONE** | No dedicated 60-second guided demo mode for WISE 0855 proper motion. |
| **5.4** | Mobile-usable at 360px; accessibility (aria labels, focus states, contrast, reduced motion) | **PARTIAL** | General responsiveness exists, but sub-400px viewports and complete aria attributes need systematic audit. |
| **PHASE 6** | **Engineering and submission readiness** | | |
| **6.1** | `server.ts` split into modules (routes/, services/irsa, fits, cache, llm) | **NOT DONE** | `server.ts` is currently a single 2,336-line monolithic file. |
| **6.2** | `chrome-headless-shell`, `test_b3.fits`, `server.js` removed and added to `.gitignore` | **NOT DONE** | `chrome-headless-shell` (26MB), `test_b3.fits`, and `server.js` still reside in git tracking area; `.gitignore` missing entries. |
| **6.3** | Network integration tests for 5 targets; `/api/health` with live IRSA probe | **NOT DONE** | `/api/health` missing; no live TAP reachability test suite. |
| **6.4** | `README.md` with screenshot, 5 deep links, architecture, update guide, credits, license | **NOT DONE** | `README.md` does not exist in root directory. |
| **6.5** | Resolve 2 open PRs | **PARTIAL** | Local environment lacks `.git` repository metadata; resolution recommendations will be documented. |

---

## Next Steps (Execution Plan in Phase Order)
1. **Phase 1: Real Data Pipeline for All 5 Challenge Targets**
   - Fix `checkCoordinatesInQR2` and `server.ts` footprint gating so all real targets query IRSA TAP directly using `CONTAINS(POINT('ICRS', ra, dec), s_region)=1`.
   - Update `getFITSCutout` with 25s timeout, 3 retries, exponential backoff, and max 4 concurrent requests.
   - Wire DataLink resolution directly into time-series cutout retrieval for all 5 targets.
2. **Phase 2: Remove Misleading Paths & Pure Scientific Integrity**
   - Remove synthetic model injection from `generateCandidateSED`.
   - Hide simulated band-mismatch case from UI `CURATED_CASES` (keep for internal unit tests only).
   - Enforce provenance stamps and strict REAL / SAVED badges.
3. **Phase 3: Core Player Upgrades**
   - Global fixed percentile scale across time sequence (prevent frame flicker).
   - Same-band filtering with band selector + wavelength indicator.
   - Motion tools: predicted proper-motion marker, trail, epoch blink crosshair, pixel grid, and centroid plot.
   - Difference modes: minus reference, minus median, stack, DQ masking.
   - Keyboard navigation (Space, Arrows) + PNG/GIF sequence exporter.
4. **Phase 4: Aladin Lite Integration**
   - Add pinned Aladin Lite v3 CDN to `index.html`.
   - Create AladinLitePanel component synced to coordinates/FOV with Gaia DR3 + AllWISE catalog overlays.
5. **Phase 5: First-Run Experience & Demo Mode**
   - Set default route to Explore tool with 5 one-click target presets and deep links.
   - Move Game/SPEX mascot to secondary navigation.
   - Add "Why This Matters" briefing card + 60s guided demo mode for WISE 0855.
   - Accessibility & 360px mobile optimization.
6. **Phase 6: Engineering Cleanup & Submission Readiness**
   - Split `server.ts` into clean modular structure (`server/` or `src/server/`).
   - Clean up `chrome-headless-shell`, `test_b3.fits`, `server.js` and update `.gitignore`.
   - Add `/api/health` route with live IRSA connectivity probe and integration tests.
   - Write comprehensive `README.md`.
