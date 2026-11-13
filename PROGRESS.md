# SPEX — Work Progress & Scientific Audit Status

**Workspace State:** Real NASA/IPAC IRSA TAP (`spherex.obscore`) + DataLink `#cutout` integration active across all 5 official benchmark targets plus arbitrary sky coordinates.
**Data Source Status:** NASA/IPAC Infrared Science Archive (IRSA) `spherex.obscore` verified live across all 5 challenge targets (Barnard's Star, WISE 0855, Epsilon Indi, RW Aurigae, R Draconis).

---

## Root Causes Resolved
1. **False Gating Removed:** Deleted `checkCoordinatesInQR2` / 3-file NEP footprint checks in `challengeTargets.ts` and `server.ts`. Availability is determined exclusively by live IRSA TAP `s_region` containment.
2. **DataLink Resolution Fixed:** Every `access_url` from `spherex.obscore` resolves through IRSA DataLink XML (`#cutout` / `ibe-cutout`) using `center` and `size` in degrees. Zero hand-built IBE paths remain in runtime.
3. **Timeouts & Concurrency Fixed:** TAP timeout raised to 75s with in-flight promise deduplication (`tapInflightCache`), 30-min TAP cache TTL, 25s cutout timeout, 3 retries with exponential backoff, and max 4 concurrent FITS cutout downloads.
4. **Double Proper-Motion Bug Fixed:** Canonical J2000 catalog coordinates propagate strictly once per epoch (`propagatePosition`) without double-shifting when querying TAP or `/api/spherex/timeseries`.

---

## Audit Checklist & Status

### 1. Coordinates, Astrometry & Footprint Gating
- [x] **1.1** Verified celestial coordinates for 5 challenge targets (`OFFICIAL_CHALLENGE_TARGETS`)
- [x] **1.2** Proper motion propagation model ($J2000 \rightarrow \text{observation epoch}$) (`properMotion.ts`)
- [x] **1.3** Eliminated false gating via `checkCoordinatesInQR2` / 3-file NEP footprint check
- [x] **1.4** Dynamic IRSA TAP `s_region` detector polygon coverage checking (`CONTAINS(POINT('ICRS',ra,dec),s_region)=1`)
- [x] **1.5** Offline/demo fallback strictly labeled (`REAL DATA, SAVED COPY` / `DEMO COPY (DIFFERENT FIELD)` showing `trueCenter`)
- [x] **1.6** Famous astronomical objects catalog coordinates & honest release status

### 2. TAP Queries, DataLink Resolution & Archive Ingestion
- [x] **2.1** TAP query building, 75s timeout, XML-error guard, and in-flight dedupe (`server.ts`, `archiveAdapter.ts`)
- [x] **2.2** DataLink resolution to genuine Level-2B science FITS cutouts (`timeSeriesPipeline.ts`)
- [x] **2.3** Retry w/ exponential backoff + `Semaphore(4)` concurrency throttle
- [x] **2.4** Canonical `DataSourceAdapter` translation between TAP rows and app models

### 3. Time Series, Differencing & Spectral Processing
- [x] **3.1** Multi-epoch sampling across survey months (`sampleAcrossEpochs`) and intra-visit vs survey-epoch cadence classification
- [x] **3.2** Per-band global `p02–p98` scaling, `Diff vs Ep 1`, `Diff vs Median`, and WCS reprojection (`ScientificPipeline.reprojectPixelByPixel`)
- [x] **3.3** Image stretches (Linear, Sqrt, Log, Asinh) and colormaps (including diverging diff colormap)
- [x] **3.4** Per-detector inverse-variance stacking & co-addition masking SPHEREx DQ bitmask flags
- [x] **3.5** Aperture photometry and center SED extraction (`generateCandidateSED` with zero synthetic fallbacks)
- [x] **3.6** Level-2 DQ bitmask pixel overlay in `FramePlayer` and `AstronomicalSkyViewport`
- [x] **3.7** Interactive `FramePlayer` with D1–D6 selector, Blink `1↔Last`, PM trail, Epoch-1 crosshair, pixel-grid toggle, zoom (`1x–8x`), and Measured Subpixel Centroid vs Time SVG plot

### 4. Catalog Overlays, Sky Context & AI Integration
- [x] **4.1** Live CDS VizieR TAP cross-matching (`Gaia DR3` propagated to observation epoch + `AllWISE`), offline fallback only in offline/test or failure
- [x] **4.2** Pinned `AladinLitePanel` synced with `(ra, dec, fovArcmin)` and cyan SPHEREx cutout footprint box
- [x] **4.3** Server-side Gemini AI SPEX companion collapsed behind on-demand toggle so sky canvas stays clean

### 5. User Interface, Entry Experience & Verification
- [x] **5.1** Science Explorer preloaded directly with WISE 0855, 5 preset target buttons, RA/Dec search bar, FOV selector, URL query sync, and 60s guided demo
- [x] **5.2** Non-endorsement NASA attribution footer and bilingual EN/AR parity
- [x] **5.3** User-facing archive states (loading skeleton, honest error w/ retry, zero-rows empty state, live/cached provenance badges)
- [x] **5.4** `GET /api/health` endpoint, `.gitignore`, repo hygiene, `README.md` runbook, and live IRSA integration test (`irsaIntegration.test.ts`)

---

## Final Stabilization Pass
- [x] **Phase A (A1–A4)**: Home default + 5 one-click presets & deep links; SPEX mascot restored & updated (EN/AR); A3 progressive disclosure + collapsed `Advanced` drawer; A4 WiseView control bar, keyboard shortcuts, ARIA, and 4 reserved slots.
- [x] **Phase B (B1–B13)**: `spherex.artifact` JOIN `spherex.plane` TAP queries, release ordering (`dr1`/`qr3`/`qr2`), MEF `EXTNAME` + `WCS-WAVE` `-TAB` spectral WCS, verified SIMBAD astrometry, `VARIANCE`-gated centroids + co-add stacks, progressive loading, startup warm-up, real `/api/health`.
- [x] **Phase C (C1–C4)**: Live 5-preset proof (`P0-1`), `<3 MB` demo snapshot fallback (`P0-2`), DR1/QR3/QR2 copy & release/VERSION honesty in `FramePlayer` (`P1-1`/`P1-2`), live per-target `data-drop-check` (`P1-3`), Playwright smoke test (`P1-4`), `.gitattributes`/`.gitignore`/benchmark FITS hygiene (`P1-5`, 92/92 unit tests), `CHANGES.md`/`PROGRESS.md`/`README.md` (`P1-6`).
- [x] **Astrometry Validity Pass (Tasks 1–5)**: Differential Gaia DR3 frame astrometry (`|pm| < 20 mas/yr`, 3-px isolation, <3 star low-confidence flag), stationary-control empirical error floor (`0.437"` from `RW Aur`, `3×` significance gate, `0x02`/`0x10` DQ masking & neighbor rejection), full cross-release (`dr1`+`qr3`) astrometric baselines (`517d` Epsilon Indi, `373d` WISE 0855 `D5`, `370d` Barnard's Star) with strict same-release/VERSION Diff & Stack grouping, recommended per-target detectors, and verified live/snapshot outputs.
