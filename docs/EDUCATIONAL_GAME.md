# SPHEREx: The Cosmic Detective — Educational Game Architecture

## 1. Pedagogical Vision & Learning Objectives
**SPHEREx: The Cosmic Detective** is an interactive educational module embedded directly into SPEX. It bridges the gap between public curiosity and professional infrared time-domain astrophysics by guiding learners through an 8-mission forensic journey.

### Learning Goals
1. **Infrared Astronomical Vision:** Understand why infrared astronomy (0.75–5.0 µm) penetrates interstellar dust and reveals cold, moving, and red-shifted cosmic phenomena invisible to optical eyes.
2. **Linear Variable Filter (LVF) Spectroscopy:** Comprehend how SPHEREx splits light into 102 distinct spectral channels across 6 detector arrays without a moving diffraction grating.
3. **Temporal Difference Imaging:** Master the mathematical principle $D = I_2 - I_1$, learning how subtracting two sky epochs cancels unvarying background light and isolates temporal anomalies.
4. **Forensic Evidence Evaluation:** Distinguish genuine astrophysical signals (asteroids, variable stars, supernovae) from instrumental artifacts (detector saturation, cosmic rays, and PSF pointing jitter dipoles).

---

## 2. Strict Synthetic Data Isolation

To safeguard scientific credibility, educational game data is strictly isolated from the real NASA/IPAC FITS pipeline:
- **Module Isolation:** All game data resides exclusively in `/src/game/educationalData.ts`.
- **Constant Namespace:** Variables are prefixed with `EDUCATIONAL_*` (e.g., `EDUCATIONAL_DISCLAIMER`, `EDUCATIONAL_SPECTRUM_BANDS`, `EDUCATIONAL_SCENARIOS`).
- **Prominent UI Disclaimer:** Every game screen displays a visible badge:
  ```
  [EDUCATIONAL SIMULATION · SYNTHETIC DEMONSTRATION DATA]
  Real scientific exploration uses calibrated NASA/IPAC QR2 FITS data.
  ```
- **No Pipeline Contamination:** Game states and mock candidates never enter `/api/spherex/process` or the real candidate detection pipeline.

---

## 3. Mission Architecture

### Level 1: Become the Observer
*Focus: Understanding the Instrument, Wavelengths, and Survey Cadence.*

| Mission | Title | Interactive Task & Concept |
|---|---|---|
| **Mission 1** | *Beyond Visible Light* | Toggle between Optical (0.55 µm) and Infrared (2.4 µm) views of a dusty star-forming nebula to discover hidden protostars. |
| **Mission 2** | *102 Spectral Bands* | Explore the 6 SPHEREx detector arrays (0.75 µm to 5.0 µm) and examine diagnostic spectral features (Water Ice at 3.05 µm, CO₂ Ice at 4.27 µm, PAH emission at 3.3 µm). |
| **Mission 3** | *The All-Sky Survey* | Rotate the orbital scanning path around the Sun-synchronous terminator orbit, demonstrating how the NEP (North Ecliptic Pole) is visited hundreds of times. |
| **Mission 4** | *The Pipeline* | Step through the 4-phase data reduction pipeline: Raw Readouts $\rightarrow$ Calibrated Surface Brightness $\rightarrow$ TAN-SIP WCS $\rightarrow$ Quality Flag Masking. |

*Reward upon completion:* **"Mission Observer" Achievement Badge**.

---

### Level 2: Find What Changed
*Focus: Temporal Analysis, Differencing Math, and Forensic Evidence.*

| Mission | Title | Interactive Task & Concept |
|---|---|---|
| **Mission 5** | *Compare Epochs* | Use the interactive Blink Comparator and Split-Slider to spot subtle flux changes between Epoch 1 and Epoch 2. |
| **Mission 6** | *The Difference Image* | Compute pixel-by-pixel subtraction $D = I_2 - I_1$ and calculate significance $\sigma = D / \sqrt{\sigma_1^2 + \sigma_2^2}$. |
| **Mission 7** | *The Evidence Quiz* | Forensic analysis of 5 mystery scenarios: <br>1. Moving Asteroid (Dipole signature, $<4000''$/day) <br>2. Saturated Bright Star (0x02 bleed column) <br>3. Flare Star (Stationary $+8.4\sigma$, Gaia counterpart) <br>4. Pointing Jitter Dipole (Telescope wobble artifact) <br>5. Faint Background Noise ($1.2\sigma$, insignificant). |
| **Mission 8** | *Final Forensic Verdict* | Issue the final scientific verdict on a challenging real-world multi-band candidate and compile a formal Discovery Report. |

*Reward upon completion:* **"Cosmic Detective" Master Badge** + **"Launch Real Investigation"** CTA seamlessly transitioning the user into the real NEP Benchmark exploration.
