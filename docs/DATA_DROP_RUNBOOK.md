# SPHEREx Archive Data Drop Runbook (B12)

This operational runbook provides step-by-step instructions for switching, validating, and verifying new NASA/IPAC IRSA SPHEREx public data releases (DR1, QR3, QR2, or future drops) with zero code changes.

---

## 1. Environment Configuration (Zero-Code Release Updates)

Configure or override the active IRSA TAP archive tables and release priority in `.env`:

```bash
# IRSA TAP & Archive Configuration
SPHEREX_IRSA_HOST="https://irsa.ipac.caltech.edu"
SPHEREX_ARTIFACT_TABLE="spherex.artifact"
SPHEREX_PLANE_TABLE="spherex.plane"
SPHEREX_RELEASE_PREFERENCE="dr1,qr3,qr2"
SPHEREX_RELEASE_NAME="SPHEREx Public Archive (DR1 / QR3 / QR2 Level 2B)"

# Offline Mode Switch (1 = offline local mode; 0 or unset = live archive)
SPHEREX_OFFLINE=0
```

When a new public data release is ingested by IRSA, update `SPHEREX_RELEASE_PREFERENCE` (putting the newest release tag first), clear or refresh stale entries if needed, and run `GET /api/health` to inspect `availableReleases` and the latest observation MJD (`MAX(p.time_bounds_upper)`).

---

## 2. Ingestion & Validation Protocol

Run the automated data drop readiness check:

```bash
npm run data-drop-check
```

This script verifies:
1. **Footprint Containment:** Target coordinates lie within live `spherex.plane.s_region` polygons and local FITS WCS footprints.
2. **Cutout Margin:** The target pixel is centered with $> 20\text{ px}$ margin from cutout edges (verified for 64×64+ cutouts).
3. **Cryptographic Uniqueness:** Genuine distinct SHA-256 digests across cached cutouts (keyed by `sha256(cutoutUrl)`).
4. **Dynamic Pixel Scale:** Derived from each FITS WCS header (`CD` matrix / `CDELT`), never hardcoded.
5. **Proper-Motion Handling:** High-PM targets (Barnard's Star, WISE 0855, Epsilon Indi) are propagated from SIMBAD J2000 to the observation epoch (`~2025.6`).

---

## 3. Challenge Target Benchmark Table (SIMBAD J2000)

| Target Name | Coordinate Status | J2000 RA / Dec (deg) | Proper Motion | Reference Notes |
|---|---|---|---|---|
| Barnard's Star (GJ 699) | `VERIFIED` | `269.452077, +4.693365` | `(-801.55, +10362.39) mas/yr` | Live IRSA exposures |
| WISE 0855-0714 | `VERIFIED` | `133.818908, -7.247048` | `(-8123.7, +673.2) mas/yr` | Spitzer/HST astrometry; faint/absent in Gaia |
| Epsilon Indi Ba/Bb | `VERIFIED` | `331.044147, -56.782844` | `(+3961.4, -2536.2) mas/yr` | Binary T1/T6 brown dwarf pair |
| RW Aurigae | `VERIFIED` | `76.956526, +30.401438` | `(+2.64, -27.40) mas/yr` | Classical T Tauri variable |
| R Draconis | `VERIFIED` | `248.167611, +66.754979` | `(-14.6, +32.8) mas/yr` | NEP-adjacent Mira variable |

---

## 4. Offline Benchmark Fallback

If network connectivity to NASA/IPAC IRSA is interrupted or `SPHEREX_OFFLINE=1` is set:
- The server activates cached FITS files when present (`"REAL SPHEREx DATA - cached <date/time>"`) or local bundled benchmarks (`"REAL DATA, SAVED COPY (NOT LIVE)"` / `"DEMO COPY (DIFFERENT FIELD)"` when coordinates differ).
