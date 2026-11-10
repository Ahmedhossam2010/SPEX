# SPHEREx Challenge Official Data Drop Runbook (November 13 Release)

This operational runbook provides step-by-step instructions for ingesting, validating, and serving the official NASA Space Apps Challenge SPHEREx release on November 13.

---

## 1. Environment Configuration

Before ingesting the official release, verify environment variables in `.env`:

```bash
# Data Release Designation
SPHEREx_DATA_RELEASE="SPHEREx Official Challenge Release (Nov 13, 2026)"
SPHEREX_BASE_URL="https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2"
SPHEREX_TAP_TABLE="spherex.obscore"

# Offline Mode Switch (1 = offline local mode; 0 or unset = live archive)
SPHEREX_OFFLINE=0
```

---

## 2. Ingestion & Validation Protocol

Run the automated data drop validation check:

```bash
npm run data-drop-check
```

This script verifies:
1. **Footprint Containment:** Target coordinates lie within the detector field of view.
2. **Cutout Margin:** The target pixel is centered with $> 20\text{ px}$ margin from any cutout edge.
3. **Cryptographic Uniqueness:** Genuine distinct SHA-256 digests across different exposures.
4. **Dynamic Pixel Scale:** Derived from each FITS WCS header (`CD` matrix / `CDELT`), never a constant.
5. **Proper-Motion Handling:** Targets with known proper motions (Barnard's Star, WISE 0855) are propagated to observation epoch.

---

## 3. Challenge Target Verification Criteria

| Target Name | Coordinate Status | Proper Motion | Primary Check Status |
|---|---|---|---|
| Barnard's Star (GJ 699) | `VERIFIED_GAIA_DR3` | $\mu_\alpha\cos\delta = -801.55\text{ mas/yr}$, $\mu_\delta = +10362.39\text{ mas/yr}$ | Verified |
| WISE 0855-0714 | `VERIFIED_GAIA_DR3` | $\mu_\alpha\cos\delta = -8123.7\text{ mas/yr}$, $\mu_\delta = +673.2\text{ mas/yr}$ | `needsPrimaryCheck: true` |
| RW Aurigae | `VERIFIED_GAIA_DR3` | $\mu_\alpha\cos\delta = +2.64\text{ mas/yr}$, $\mu_\delta = -27.40\text{ mas/yr}$ | `needsPrimaryCheck: true` |
| Epsilon Indi A | `VERIFIED_GAIA_DR3` | System primary reference star | Verified |
| Epsilon Indi Ba/Bb | `UNVERIFIED` | Pending SIMBAD coordinate confirmation | `needsPrimaryCheck: true` |
| R Draconis | `UNVERIFIED` | Pending SIMBAD coordinate confirmation | Position pending |

---

## 4. Offline Benchmark Fallback

If network connectivity to NASA/IPAC IRSA is interrupted:
- Set `SPHEREX_OFFLINE=1` in the environment.
- The server automatically activates `ArchiveAdapter.getOfflineRecords()`.
- The UI explicitly renders the `"REAL DATA, SAVED COPY (NOT LIVE)"` badge.
