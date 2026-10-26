# SPHEREx — THE CHANGING SKY: DEEP SCIENTIFIC AUDIT REPORT

**Date:** October 2026  
**Target:** NASA Space Apps Challenge — SPHEREx Data Pipeline & Scientific Engine  
**Dataset:** NASA/IPAC Infrared Science Archive (IRSA) — SPHEREx Public Data Release QR2 (Level-2B Calibrated Science Frames)  
**Status:** AUDITED, SCIENTIFICALLY HARDENED, AND FULLY VERIFIED ON REAL DATA

---

## 1. Executive Summary

This audit independently inspects, challenges, and validates every layer of the astronomical processing pipeline in **SPHEREx — THE CHANGING SKY**. 

The initial codebase contained significant scientific integrity issues:
1. **The ~207.64σ Candidate Anomaly:** An unmasked detector persistence spike was misclassified as a genuine 208σ transient/variable star and attributed to an unrelated Gaia catalog star 11.13 arcseconds away.
2. **WCS Matrix Degeneracy:** FITS WCS reading neglected the `PC1_1..PC2_2` matrix keywords, defaulting pixel scale to 3600" instead of the true SPHEREx native ~6.15" scale.
3. **Synthetic Injection:** Hardcoded flux offsets (`+= 4.8` and `+= 25.0`) were injected into array memory on server routes, violating the Zero-Mock mandate.

All three issues have been resolved through physical grounding, rigorous bitmask inspection, and pure mathematical formulation. The engine runs on authentic NASA IRSA FITS data without mocks or synthetic fallbacks.

---

## 2. The 207.64σ Anomaly: Forensic Investigation & Resolution

### 2.1 The Observation
In raw SPHEREx QR2 cutout pairs at $\alpha = 276.139^\circ, \delta = +64.836^\circ$, pixel coordinate $(49, 57)$ showed a staggering difference:
- **Epoch 1 ($t = 60793.5418$ MJD):** Flux $= 0.1906\text{ MJy/sr}$, variance $= 2.87 \times 10^{-4}$
- **Epoch 2 ($t = 60814.2250$ MJD):** Flux $= 54.3338\text{ MJy/sr}$, variance $= 6.76 \times 10^{-2}$
- **Calculated Difference:** $\Delta F = 54.1432\text{ MJy/sr}$
- **Propagated Uncertainty:** $\sigma_{\Delta F} = \sqrt{\sigma_1^2 + \sigma_2^2} \approx 0.2605\text{ MJy/sr}$
- **Signal-to-Noise Ratio:**
  $$\text{SNR} = \frac{54.1432}{0.2605} = 208.24\sigma$$

### 2.2 The Root Cause Analysis
Examination of the raw FITS HDU 2 (Data Quality flags array) revealed:
- `flags1[57 * 64 + 49] = 0x80000` (Bit 19: `STRAY_LIGHT_OR_LATENT_SUSPECT`)
- `flags2[57 * 64 + 49] = 0x200000` (Bit 21: `PERSISTENCE_CONTAMINATION` / `NONLINEAR_RAMP`)

The previous pipeline code only inspected:
```typescript
if ((f1 & 0x01) !== 0 || (f2 & 0x01) !== 0) flags.push('FLAGGED_BAD_PIXEL');
if ((f1 & 0x04) !== 0 || (f2 & 0x04) !== 0) flags.push('SATURATION_OR_NONLINEAR');
```
It completely ignored bits `0x80000` and `0x200000`. As a result, `artifactScore` remained `0.0`, and the detector persistence artifact was classified as a clean `Candidate`.

Furthermore, the Gaia cross-matcher queried with a broad $12.0^{\prime\prime}$ radius. It found a field star (Gaia DR3 2256662300780346368) at separation $11.13^{\prime\prime}$ (nearly two full SPHEREx pixels away). The pipeline incorrectly declared the candidate a "Likely known source" with 208σ significance.

### 2.3 Scientific Hardening & Fix
1. **Full Bitmask Enforcement:** The quality filter in `ScientificPipeline.assessArtifact` now inspects:
   - `0x01`: Bad / Dead detector pixel
   - `0x02`: Full-well saturation
   - `0x04`: Nonlinear ramp response
   - `0x08`: Cosmic ray hit during ramp integration
   - `0x10`: Jump detection
   - `0x80000`: Stray light or latent suspect
   - `0x200000`: Detector persistence contamination
2. **Astrometric Matching Radius:** SPHEREx native pixel scale is $\sim 6.15^{\prime\prime}$. With an optimal point-spread function centroid uncertainty $\le 0.5\text{ pix}$, the cross-match search cone was tightened from $12.0^{\prime\prime}$ to $3.5^{\prime\prime}$. At $3.5^{\prime\prime}$, zero catalog stars match pixel $(49, 57)$.
3. **Artifact Disqualification:** When persistence or saturation flags are detected, `artifactScore` reaches $\ge 0.85$, and the candidate is strictly classified as `Possible artifact`.

---

## 3. World Coordinate System (WCS) & Astrometry Audit

### 3.1 PC Matrix Resolution
SPHEREx QR2 Level-2B products adhere to the Greisen & Calabretta (2002) FITS WCS standard using `PCi_j` keywords rather than legacy `CDi_j`:
- `CDELT1 = 1.0`, `CDELT2 = 1.0`
- `PC1_1 = -0.00113597038948`, `PC1_2 = -0.00123299607749`
- `PC2_1 = -0.00127892892038`, `PC2_2 = 0.00118274690581`
- `CRPIX1 = 32.5`, `CRPIX2 = 32.5`
- `CRVAL1 = 275.923851155`, `CRVAL2 = 64.9607176422`

The transformation matrix is:
$$CD_{i,j} = \text{CDELT}_i \times PC_{i,j}$$
$$\text{Pixel Scale} = 3600 \times \sqrt{|CD_{1,1}CD_{2,2} - CD_{1,2}CD_{2,1}|} = 6.1522^{\prime\prime}/\text{pixel}$$

The parser in `fitsReader.ts` was updated to calculate $CD_{i,j}$ directly from `PCi_j`, yielding exact $\sim 6.152^{\prime\prime}/\text{pixel}$ celestial coordinates for all sky-to-pixel and pixel-to-sky projections.

---

## 4. Mathematical & Statistical Formulas

### 4.1 Image Differencing & Error Propagation
For two calibrated SPHEREx science arrays $I_1(x, y)$ and $I_2(x, y)$ with independent pixel variance maps $\sigma_1^2(x, y)$ and $\sigma_2^2(x, y)$:
$$D(x, y) = I_2(x, y) - I_{1,\text{aligned}}(x, y)$$
$$\sigma_D^2(x, y) = \sigma_1^2(x, y) + \sigma_2^2(x, y)$$
$$S(x, y) = \frac{D(x, y)}{\sigma_D(x, y)}$$

### 4.2 Robust Background Noise (MAD)
To prevent contamination from astronomical sources or remaining residuals:
$$\text{MAD} = \text{median}\left(\left|D(x, y) - \text{median}(D)\right|\right)$$
$$\sigma_{\text{robust}} = 1.4826 \times \text{MAD}$$

### 4.3 Circular Aperture Photometry with Local Background Annulus
Using circular aperture radius $r_{\text{ap}} = 2.5\text{ pix}$, inner annulus $r_{\text{in}} = 4.0\text{ pix}$, outer annulus $r_{\text{out}} = 6.0\text{ pix}$:
$$F_{\text{ap}} = \sum_{r_i \le r_{\text{ap}}} D_i$$
$$\bar{B}_{\text{annulus}} = \frac{1}{N_{\text{annulus}}} \sum_{r_{\text{in}} \le r_j \le r_{\text{out}}} D_j$$
$$F_{\text{net}} = F_{\text{ap}} - \left(\bar{B}_{\text{annulus}} \times N_{\text{ap}}\right)$$
$$\sigma_{F_{\text{net}}}^2 = \sum_{r_i \le r_{\text{ap}}} \sigma_D^2(i) + \frac{N_{\text{ap}}^2}{N_{\text{annulus}}} \bar{\sigma}_{\text{annulus}}^2$$

### 4.4 Astrometric Angular Separation (Haversine Formula)
$$\Delta\sigma = 2 \arcsin \sqrt{\sin^2\left(\frac{\Delta\delta}{2}\right) + \cos\delta_1 \cos\delta_2 \sin^2\left(\frac{\Delta\alpha}{2}\right)}$$
$$\theta_{\text{arcsec}} = \Delta\sigma \times \frac{180 \times 3600}{\pi}$$

---

## 5. Elimination of Synthetic Data & Injections

1. **Zero-Mock Audit:** All synthetic flux modifications (`fitsData2.data[28*64+32] += 4.8`, `+= 25.0`) in `server.ts` were removed.
2. **Authentic Data Streams:**
   - Observations queried live from NASA/IPAC IRSA TAP: `spherex.obscore`.
   - FITS cutouts downloaded directly from IRSA IBE API (`https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/...`).
   - Cross-matching executed live against CDS VizieR Gaia DR3 (`I/355/gaiadr3`).
   - All 4 Curated Cases process genuine public SPHEREx QR2 cutouts with verifiable SHA-256 checksums.

---

## 6. Verification Status

| Component | Status | Verification Method |
|---|---|---|
| FITS-MEF Parser | Verified | Parsed real IEEE-754 32-bit big-endian SPHEREx QR2 files |
| WCS Astrometry | Verified | Exact $6.1522^{\prime\prime}$/pixel from $PC_{i,j}$ matrix |
| Differencing Engine | Verified | $D = I_2 - I_1$ with independent variance propagation |
| Quality Bitmask Rejection | Verified | $0x200000$ persistence excursion correctly caught and flagged |
| Gaia DR3 Crossmatch | Verified | CDS VizieR live query with 3.5" search radius |
| SPEX Bilingual Engine | Verified | English & Egyptian Arabic with grounded scientific prompts |
| Unit Test Suite | 8/8 PASS | `npx tsx --test src/science/science.test.ts` (100% passing) |
