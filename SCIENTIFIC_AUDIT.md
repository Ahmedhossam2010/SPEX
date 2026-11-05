# SPHEREx — THE CHANGING SKY: SCIENTIFIC & FORENSIC AUDIT REPORT

**Date:** November 2026  
**Target:** NASA Space Apps Challenge — SPHEREx Data Pipeline & Scientific Engine  
**Dataset:** NASA/IPAC Infrared Science Archive (IRSA) — SPHEREx Public Data Release QR2 (Level-2B Calibrated Science Frames)  
**Engine Version:** `2.7.0-forensic-verified`

---

## 1. Executive Summary

This forensic audit inspects, challenges, and verifies every layer of the astronomical processing pipeline in **SPHEREx — THE CHANGING SKY** across both code and physical FITS binary artifacts:

1. **Resolution of the Historical ~207.64σ Candidate Anomaly:** Corrected parent-frame vs cutout-center WCS projection registration, propagated subpixel variance, and decoded SPHEREx Level-2 bitmasks (`0x200000` is catalog `SOURCE`, whereas `0x01 TRANSIENT`, `0x02 OVERFLOW`, `0x04 SUR_ERROR`, and `0x80000 OUTLIER` flag instrumental/statistical anomalies).
2. **Separation of Temporal Quantities:** Separated integration duration (`DATE-END - DATE-OBS` ≈ `115.117–115.118 s`), start-to-start cadence (`next DATE-OBS - prev DATE-OBS` ≈ `128.930–128.931 s` / `257.861 s`), and inter-exposure endpoint gap (`next DATE-OBS - prev DATE-END` ≈ `13.812–13.814 s`) across CLI, API, and frontend views.
3. **Rigorous Visit Grouping (`OBSID` Hierarchy):** Grouped exposures by `visitKey = <week>_<pass>_<slew>` (`2025W18_1B_0001`). Because all three QR2 benchmark exposures share a single `visitKey`, independent-visit distinction across the bundle is classified `NOT_VERIFIED` (`3` total temporal pairs, `3` intra-visit pairs, `0` independent-visit pairs, `0` survey-epoch pairs).
4. **Exact Spherical Footprint Geometry:** Replaced planar approximations with Van Oosterom & Strackee spherical polygon solid angles and Sutherland–Hodgman great-circle clipping on $S^2$ for both pixel-center (`0..63`) and full-pixel (`-0.5..63.5`) footprints.

---

## 2. FITS Historical & Physical Inventory

### 2.1 Currently Present Files on Disk (`/tmp/spherex_cache/`)

| File Name | Size (Bytes) | FITS Blocks (`2,880` B) | `OBSID` | `EXPIDN` | `DETECTOR` | `DATE-OBS` | `DATE-END` | Integration (`s`) | SHA-256 | MD5 |
|---|---:|---:|---|---:|---:|---|---|---:|---|---|
| `b6a1e605728059ea6b7def1e9683adb2.fits` | `5,117,760` | `1,777` | `2025W18_1B_0001_1` | `202518102000111` | `1` | `2025-04-28T13:00:15.755` | `2025-04-28T13:02:10.872` | `115.117` | `b66f276a2b3fe6e9318229b574f058be9dba1cda45fd46678014b7837b5187e9` | `43941ed0d26c80687229d836c9ec95c8` |
| `569dafa911ec60ff30abb1807d719fef.fits` | `5,117,760` | `1,777` | `2025W18_1B_0001_2` | `202518102000121` | `1` | `2025-04-28T13:02:24.686` | `2025-04-28T13:04:19.804` | `115.118` | `f39c8687dae94b80ec39e0cf537425f4dcf6e24ed26268b57c59b379b406a182` | `1bbb6266f8f64e45a6aa112104608855` |
| `75b2c2369c175060576bec8d2e5333c0.fits` | `5,117,760` | `1,777` | `2025W18_1B_0001_3` | `202518102000131` | `1` | `2025-04-28T13:04:33.616` | `2025-04-28T13:06:28.734` | `115.118` | `8e1d894ae95abca0dc3936a9fc45eb9ccfc2636b79496fefc64a57557dfd1a8d` | `348153055c9ccd8fb604d446b3cbd41e` |

### 2.2 Historical Existence vs Unverified Prior File Reports

- **Files confirmed to have existed historically:** Authentic 7-HDU NASA/IPAC IRSA SPHEREx QR2 Level-2B `64×64` cutouts retrieved via IBE API for `2025W18_1B_0001_1`, `2025W18_1B_0001_2`, and `2025W18_1B_0001_3`, currently present at `5,117,760` bytes (`1,777 × 2,880` FITS blocks).
- **Files reported previously whose physical existence cannot now be verified:** Three `5,256,000`-byte (`1,825 × 2,880` FITS blocks; `+138,240` bytes / `+48` blocks) files cited in an earlier ephemeral container session prior to `/tmp` storage reset. Because neither file bytes nor cryptographic SHA-256 digests from that earlier container were persisted, their physical existence is marked `NOT_VERIFIED` without claiming fabrication.

---

## 3. Temporal & Visit Classification Summary

- **Integration Duration (`DATE-END - DATE-OBS`):** `115.117 s` (`_1`), `115.118 s` (`_2`), `115.118 s` (`_3`). Headers also include effective ramp duration `XPOSURE = 113.5826 s` and frame elapsed `TELAPSE = 118.1873 s`.
- **Start-to-Start Cadence (`next DATE-OBS - prev DATE-OBS`):**
  - `_1 -> _2`: `128.931 s` (`2.14885 min`, `0.001492257 d`)
  - `_2 -> _3`: `128.930 s` (`2.14883 min`, `0.001492246 d`)
  - `_1 -> _3`: `257.861 s` (`4.29768 min`, `0.002984503 d`)
- **Inter-Exposure Endpoint Gap (`next DATE-OBS - prev DATE-END`):**
  - `_1 -> _2`: `13.814 s`
  - `_2 -> _3`: `13.812 s`
  - `_1 -> _3` endpoint span (`DATE-OBS_3 - DATE-END_1`): `142.744 s` (includes readout/slew gap `13.814 s` + Exposure 2 integration `115.118 s` + readout/slew gap `13.812 s`; sum of consecutive gaps = `27.626 s`).
- **Visit Grouping:** All three files parse to `Week = 2025W18`, `Pass = 1B`, `Slew = 0001` (`visitKey = 2025W18_1B_0001`). Total possible temporal pairs = `3`; intra-visit pairs = `3`; independent-visit pairs = `0`; independently verified survey-epoch pairs = `0`; independent-visit distinction = `NOT_VERIFIED`.
