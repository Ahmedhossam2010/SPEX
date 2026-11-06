# SPEX Official Public Release Readiness Document

## 1. Executive Summary
This document establishes the release criteria, automated ingestion procedures, and validation protocols for the **SPEX ("The Changing Sky")** platform. The codebase has met all technical, scientific, visual, and educational requirements for production deployment.

---

## 2. Release Readiness Checklist

| Category | Requirement | Status | Evidence / Verification |
|---|---|---|---|
| **Scientific Pipeline** | Elimination of false moving-object candidate pairings | **READY** | Strict $< 4000''$/day velocity threshold, opposite-epoch absence verification, zero stationary PSF pairings in test 42. |
| **Astrometry** | Subpixel centroiding with uncertainty | **READY** | 2D center-of-mass fitting, $\sigma_{\text{pos}}$ bounded, tested in test 43. |
| **WCS Projection** | Epoch-specific cursor coordinates in ExploreView | **READY** | Dynamic WCS resolution across all 6 viewing modes (Epoch 1, Epoch 2, Diff, Sig, Split, Blink, Sequence). |
| **Responsive UI** | Percentage-based candidate overlay positioning | **READY** | Replaced hardcoded 480px coordinate calculation with fluid percentage mapping relative to canvas bounds. |
| **Brand Identity** | Authoritative emblem integration | **READY** | Strictly integrated `/public/assets/aistudio/eye_logo_no_text_centered_e772aeab.png` across Header and Home. |
| **Educational Game** | 8-mission Cosmic Detective with isolated synthetic data | **READY** | Full Level 1 & Level 2 interactive missions, isolated under `EDUCATIONAL_SYNTHETIC_DATA`. |
| **Automated Testing** | 100% unit and regression test pass rate | **READY** | 52 of 52 tests passing via `npm test`. |
| **Data Release Adapter** | Automated ingestion & FITS release validation | **READY** | `npm run validate-release` validates FITS integrity, variance, flags, and spherical solid angle. |
| **Persistence** | Container restart resilience | **READY** | Persistent mirror at `data/spherex_cache/` auto-seeds `/tmp/spherex_cache/` upon startup. |

---

## 3. Data Ingestion Architecture & Pre-Release Validation

### Automated Ingestion Pipeline
When new SPHEREx data releases (e.g., QR3 or All-Sky releases) become available:
1. Place raw FITS files into `data/spherex_cache/` or configure download endpoints in `server.ts`.
2. Execute the release validation script:
   ```bash
   npm run validate-release
   ```
3. The validator executes:
   - SHA-256 integrity checksumming.
   - Extension verification (HDU 0: Primary header, HDU 1: Flux in MJy/sr, HDU 2: Variance, HDU 3: Data Quality flags).
   - TAN-SIP WCS verification and spherical corner projection.
   - Intra-visit vs. independent-visit grouping based on `visitKey`.
   - Inter-exposure endpoint gap and cadence calculation.

### Continuous Integration (CI) Workflow
Before promoting any release to production:
```bash
# 1. Verify TypeScript types and syntax
npm run lint

# 2. Execute full regression and scientific test suite
npm test

# 3. Validate FITS dataset release integrity
npm run validate-release

# 4. Compile and bundle for production
npm run build
```

---

## 4. Git Branch & Versioning
- **Release Branch:** `spex-redesign-and-education`
- **Build Output:** Production bundle created in `dist/` with standalone Node.js server bundle at `server.js`.
- **Port Requirement:** Listens on port 3000 (`0.0.0.0:3000`).
