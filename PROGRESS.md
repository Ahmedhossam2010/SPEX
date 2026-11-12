# SPEX — Work Progress & Scientific Audit Status

**Workspace State:** Restored from previous diagnostic audit (`scripts/diagnose_irsa.ts`).  
**Data Source Status:** NASA/IPAC Infrared Science Archive (IRSA) `spherex.obscore` holds ~1.6M exposures; all 5 official challenge targets have between 256 and 2,499 live exposures in the archive.

---

## Root Causes of Previous 404/503 Failures
1. **False Gating:** False gating via `checkCoordinatesInQR2` / a 3-file NEP footprint check in `challengeTargets.ts` and `server.ts` that rejected coordinates outside the NEP box.
2. **URL Construction:** Hand-built IBE URLs instead of resolving authentic DataLink access URLs.
3. **Download Timeout:** 3.5s timeout on ~5 MB FITS downloads causing premature network aborts.

---

## Audit Checklist & Status

### 1. Coordinates, Astrometry & Footprint Gating
- [x] **1.1** Verified celestial coordinates for 5 challenge targets (DONE)
- [x] **1.2** Proper motion propagation model ($J2000 \rightarrow \text{observation epoch}$) (DONE)
- [ ] **1.3** Eliminate false gating via `checkCoordinatesInQR2` / 3-file NEP footprint check in `challengeTargets.ts` (PARTIAL)
- [ ] **1.4** Dynamic IRSA TAP `s_region` detector polygon coverage checking instead of hardcoded coordinates (PARTIAL)
- [ ] **1.5** Offline benchmark and fallback dataset mode (PARTIAL)
- [x] **1.6** Famous astronomical objects catalog coordinates & honest release status (DONE)

### 2. TAP Queries, DataLink Resolution & Archive Ingestion
- [ ] **2.1** TAP query building and execution against `spherex.obscore` (PARTIAL)
- [ ] **2.2** DataLink resolution to genuine Level-2B science FITS cutouts (PARTIAL)
- [ ] **2.3** Robust download retry, timeout handling (>25s for 5MB FITS), and concurrency throttle (NOT DONE)
- [ ] **2.4** Canonical `DataSourceAdapter` translation between TAP rows and app models (PARTIAL)

### 3. Time Series, Differencing & Spectral Processing
- [ ] **3.1** Multi-epoch observation pairing and intra-visit vs independent visit grouping (NOT DONE)
- [ ] **3.2** Difference imaging $D = I_2 - I_1$ with variance propagation and candidate extraction (PARTIAL)
- [x] **3.3** Image stretches (Linear, Sqrt, Log, Asinh) and colormaps (DONE)
- [ ] **3.4** Per-detector stacking and co-addition (NOT DONE)
- [ ] **3.5** Aperture photometry and SED spectrum extraction (PARTIAL)
- [ ] **3.6** Level-2 DQ flag filtering (saturation, cosmic rays, outliers) (PARTIAL)
- [ ] **3.7** Interactive Time Series Frame Player with playback, scrub bar, and reference frame toggle (NOT DONE)

### 4. AI & Mascot Integration
- [ ] **4.1** Server-side Gemini AI SPEX companion with grounded astronomical rule fallbacks (NOT DONE)

### 5. User Interface, Exploration & States
- [ ] **5.1** ExploreView multi-epoch inspection and dynamic WCS cursor readout (PARTIAL)
- [ ] **5.2** Responsive candidate overlay positioning across all viewports (PARTIAL)
- [ ] **5.3** User-facing archive states (loading, unreachable/retry, zero rows, success) (NOT DONE)
- [ ] **5.4** Bilingual EN/AR support and scientific glossary tooltips (PARTIAL)

### 6. Quality Assurance, Verification & Testing
- [ ] **6.1** End-to-end integration test with live IRSA TAP / DataLink pipeline (NOT DONE)
- [ ] **6.2** Regression testing on all 5 challenge targets with live exposure counts (NOT DONE)
- [ ] **6.3** Multi-device responsive viewport validation (desktop, tablet, mobile 320px) (NOT DONE)
- [ ] **6.4** Official data release drop runbook verification (NOT DONE)
- [ ] **6.5** Automated unit test suite execution (PARTIAL)

---

## Diagnostic Reference
- Diagnostic script: `scripts/diagnose_irsa.ts` (verified and in place).
