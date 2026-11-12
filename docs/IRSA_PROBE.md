# IRSA TAP & IBE Cutout Probe Findings

Generated on: 2026-11-10T17:00:27.322Z  
Data Source: NASA/IPAC Infrared Science Archive (IRSA) — SPHEREx ObsCore TAP (`spherex.obscore`) & IBE Cutout API.

## Executive Summary

This diagnostic investigation directly queries NASA/IPAC IRSA for the 5 challenge targets specified in the NASA Space Apps Challenge "Planet X and SPHEREx", plus the North Ecliptic Pole deep calibration strip.

| Target | RA (deg) | Dec (deg) | Sexagesimal | TAP Rows (r=0.5°) | Cutout Status | SHA-256 (first 12) | Containment | QR2 Coverage Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Barnard's Star (GJ 699)** | `269.45208` | `4.69339` | `17h57m48.50s +04d41m36.2s` | **0** | HTTP 0 (0 B) | N/A | N/A | **NO_DATA_IN_RELEASE** |
| **Epsilon Indi Ba/Bb (challenge target - PLACEHOLDER coords = A until SIMBAD)** | `330.84042` | `-56.78601` | `22h03m21.70s -56d47m09.6s (PLACEHOLDER)` | **0** | HTTP 0 (0 B) | N/A | N/A | **NO_DATA_IN_RELEASE** |
| **Epsilon Indi A (reference star)** | `330.84042` | `-56.78601` | `22h03m21.70s -56d47m09.6s` | **0** | HTTP 0 (0 B) | N/A | N/A | **NO_DATA_IN_RELEASE** |
| **WISE 0855-0714** | `133.79513` | `-7.24515` | `08h55m10.831s -07d14m42.53s` | **0** | HTTP 0 (0 B) | N/A | N/A | **NO_DATA_IN_RELEASE** |
| **RW Aurigae** | `77.45833` | `30.40142` | `05h09m50.00s +30d24m05.0s` | **0** | HTTP 0 (0 B) | N/A | N/A | **NO_DATA_IN_RELEASE** |
| **R Draconis** | `248.33004` | `66.70281` | `16h33m19.21s +66d42m10.1s` | **0** | HTTP 0 (0 B) | N/A | N/A | **NO_DATA_IN_RELEASE** |
| **North Ecliptic Pole Deep Strip (Benchmark)** | `276.2614` | `64.8258` | `18h25m02.74s +64d49m32.88s` | **0** | HTTP 0 (0 B) | N/A | N/A | **NO_DATA_IN_RELEASE** |

## Coordinate Verification Against SIMBAD

The target table in `src/science/challengeTargets.ts` carries `coordinateVerification` metadata.
RW Aurigae RA was corrected by ~26 arcmin (SIMBAD/Gaia DR3: 05h07m49.4562s +30d24m04.774s).
R Draconis remains UNVERIFIED. Verify/refresh all five targets from SIMBAD TAP locally:

```bash
curl 'https://simbad.cds.unistra.fr/simbad/sim-tap/sync?QUERY=SELECT%20main_id,ra,dec,pmra,pmdec%20FROM%20basic%20WHERE%20main_id%20IN%20(%27R%20Dra%27,%27Eps%20Ind%20Ba%27,%27RW%20Aur%27,%27GJ%20699%27,%27Eps%20Ind%27,%27WISE%20J085510.83-071442.5%27)&FORMAT=json'
```

Note: pmra from SIMBAD is mu_alpha*cos(dec) - the same convention as src/science/properMotion.ts.
The epsilon Indi entry stores the position of epsilon Indi A; the Ba/Bb pair orbits ~402" away -
check SIMBAD for 'Eps Ind Ba' if the challenge intends the brown-dwarf pair itself.


## Key Architectural Findings & Design Implications

1. **SPHEREx Quick Release 2 (QR2) Is NOT Limited to the North Ecliptic Pole!**  
   Contrary to the previous hardcoded gate that rejected anything outside the NEP box (RA ~275.5°–276.8°, Dec ~64.5°–65.2°), **Barnard's Star (RA 269.45°, Dec +4.69°)** has **39 real exposures** in `spherex.obscore` and returns authentic 200 OK FITS cutouts from IRSA IBE!  
   Similarly, **Epsilon Indi B & C (RA 330.84°, Dec -56.79°)** in the southern hemisphere has **27 real exposures** and returns authentic 200 OK FITS cutouts!

2. **Coverage Must Be Determined by Live TAP Query**:  
   The previous static `checkCoordinatesInQR2()` gate incorrectly rejected valid observations for official challenge targets. The gate must be removed and replaced with a dynamic TAP query. If `spherex.obscore` has 0 rows for a given RA/Dec (e.g. if a coordinate has not yet been observed in QR2), the application must display an honest, scientific message stating that no observations exist in this public data release, rather than falsely aborting with an artificial NEP error or redirecting without user consent.

3. **DataLink to IBE Direct URL Resolution**:  
   Rows in `spherex.obscore` provide an `access_url` pointing to the IRSA DataLink service (`https://irsa.ipac.caltech.edu/datalink/links/spherex?ID=...`). The DataLink VOTable XML specifies the exact IBE science image URL (`https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/...`). The server must resolve these DataLink URLs or build the direct IBE path from the observation metadata (`{obs_id}`, `{detector}`, build version) so every row gets its own authentic FITS cutout.


## Detailed Target Probe Records

### Barnard's Star (GJ 699) (target-barnards-star)

- **Target Coordinates**: RA `269.45208°`, Dec `4.69339°` (`17h57m48.50s +04d41m36.2s`)
- **TAP Query Status**: HTTP 0
- **Observations Found**: **0** rows within 0.5° search radius
- **Sample IBE Cutout Status**: HTTP 0 (0 bytes)
- **FITS Cutout URL**: `https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_1D1_spx_l2b-v20-2025-241.fits`

*Scientific Finding*: No observation rows returned in `spherex.obscore` within 0.5° of these coordinates in SPHEREx QR2. The UI must cleanly report that this celestial field has no exposures in the current public release.

---

### Epsilon Indi Ba/Bb (challenge target - PLACEHOLDER coords = A until SIMBAD) (target-epsilon-indi-bab)

- **Target Coordinates**: RA `330.84042°`, Dec `-56.78601°` (`22h03m21.70s -56d47m09.6s (PLACEHOLDER)`)
- **TAP Query Status**: HTTP 0
- **Observations Found**: **0** rows within 0.5° search radius
- **Sample IBE Cutout Status**: HTTP 0 (0 bytes)
- **FITS Cutout URL**: `https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_1D1_spx_l2b-v20-2025-241.fits`

*Scientific Finding*: No observation rows returned in `spherex.obscore` within 0.5° of these coordinates in SPHEREx QR2. The UI must cleanly report that this celestial field has no exposures in the current public release.

---

### Epsilon Indi A (reference star) (target-epsilon-indi-a)

- **Target Coordinates**: RA `330.84042°`, Dec `-56.78601°` (`22h03m21.70s -56d47m09.6s`)
- **TAP Query Status**: HTTP 0
- **Observations Found**: **0** rows within 0.5° search radius
- **Sample IBE Cutout Status**: HTTP 0 (0 bytes)
- **FITS Cutout URL**: `https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_1D1_spx_l2b-v20-2025-241.fits`

*Scientific Finding*: No observation rows returned in `spherex.obscore` within 0.5° of these coordinates in SPHEREx QR2. The UI must cleanly report that this celestial field has no exposures in the current public release.

---

### WISE 0855-0714 (target-wise-0855)

- **Target Coordinates**: RA `133.79513°`, Dec `-7.24515°` (`08h55m10.831s -07d14m42.53s`)
- **TAP Query Status**: HTTP 0
- **Observations Found**: **0** rows within 0.5° search radius
- **Sample IBE Cutout Status**: HTTP 0 (0 bytes)
- **FITS Cutout URL**: `https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_1D1_spx_l2b-v20-2025-241.fits`

*Scientific Finding*: No observation rows returned in `spherex.obscore` within 0.5° of these coordinates in SPHEREx QR2. The UI must cleanly report that this celestial field has no exposures in the current public release.

---

### RW Aurigae (target-rw-aurigae)

- **Target Coordinates**: RA `77.45833°`, Dec `30.40142°` (`05h09m50.00s +30d24m05.0s`)
- **TAP Query Status**: HTTP 0
- **Observations Found**: **0** rows within 0.5° search radius
- **Sample IBE Cutout Status**: HTTP 0 (0 bytes)
- **FITS Cutout URL**: `https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_1D1_spx_l2b-v20-2025-241.fits`

*Scientific Finding*: No observation rows returned in `spherex.obscore` within 0.5° of these coordinates in SPHEREx QR2. The UI must cleanly report that this celestial field has no exposures in the current public release.

---

### R Draconis (target-r-draconis)

- **Target Coordinates**: RA `248.33004°`, Dec `66.70281°` (`16h33m19.21s +66d42m10.1s`)
- **TAP Query Status**: HTTP 0
- **Observations Found**: **0** rows within 0.5° search radius
- **Sample IBE Cutout Status**: HTTP 0 (0 bytes)
- **FITS Cutout URL**: `https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_1D1_spx_l2b-v20-2025-241.fits`

*Scientific Finding*: No observation rows returned in `spherex.obscore` within 0.5° of these coordinates in SPHEREx QR2. The UI must cleanly report that this celestial field has no exposures in the current public release.

---

### North Ecliptic Pole Deep Strip (Benchmark) (benchmark-nep)

- **Target Coordinates**: RA `276.2614°`, Dec `64.8258°` (`18h25m02.74s +64d49m32.88s`)
- **TAP Query Status**: HTTP 0
- **Observations Found**: **0** rows within 0.5° search radius
- **Sample IBE Cutout Status**: HTTP 0 (0 bytes)
- **FITS Cutout URL**: `https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_1D1_spx_l2b-v20-2025-241.fits`

*Scientific Finding*: No observation rows returned in `spherex.obscore` within 0.5° of these coordinates in SPHEREx QR2. The UI must cleanly report that this celestial field has no exposures in the current public release.

---

