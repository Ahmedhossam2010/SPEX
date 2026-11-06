# SPEX UI/UX Transformation & Design Implementation

## 1. Executive Summary & Design Vision
The visual redesign of **SPEX ("The Changing Sky")** transforms the application from an ad-hoc dashboard into an authoritative, immersive astronomical research console and discovery studio. Grounded in deep celestial aesthetics, the interface communicates immediate scientific legitimacy while guiding users through a crystal-clear discovery loop: **Two Looks $\rightarrow$ Subtract Sky $\rightarrow$ Verify Facts**.

### Visual Brand Pillars
1. **Midnight Celestial Atmosphere:**
   - Dark theme primary background: `#070a14` (Deep Space Midnight) with card surfaces at `#0b1021` / `#0c1220`.
   - Light theme primary background: `#f8fafc` (Slate 50) with clean bordered glass panels (`#ffffff`).
2. **Authoritative Brand Identity:**
   - Strict integration of the original astronomical emblem: `/public/assets/aistudio/eye_logo_no_text_centered_e772aeab.png`.
   - Never redrawn, deformed, or generated via AI approximation.
   - Rendered across the Header, Homepage hero, and modal provenance watermarks with crisp pixel fidelity.
3. **SPEX AI Companion Integration:**
   - Multi-mood celestial feline astrophysicist (`/public/assets/aistudio/*.png`).
   - Context-aware dialogue, reactive emotional states, and instant explanations of complex astronomical phenomena.
4. **Educational Gaming Bridge:**
   - Interactive *Cosmic Detective* game natively embedded into the top navigation bar and homepage primary actions.
   - Distinct Level 1 ("Become the Observer") and Level 2 ("Find What Changed") missions transitioning curious users into genuine scientific investigators.

---

## 2. Information Architecture & Navigation

The platform provides a streamlined 5-view architecture accessible via the unified responsive header:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [Emblem] SPEX  |  Explore  |  Cosmic Detective  |  Cases  |  About & Audit  | [AR/EN] │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Explore View (`/` or `?tab=explore`):**
   - Interactive 2-column astronomical workstation.
   - Left Pane: Interactive FITS viewport (Epoch 1, Epoch 2, Difference $D = I_2 - I_1$, Significance $\sigma$, Split-slider, Blink comparison, Multi-epoch sequence).
   - Real-time HUD readout with cursor coordinates $(x, y)$, RA/Dec in J2000, and calibrated surface brightness ($MJy/sr$).
   - Right Pane: Candidate findings panel, Gaia DR3/AllWISE cross-matches, aperture photometry, data quality flags, and live SPEX companion chat.
2. **Cosmic Detective Game (`?tab=game`):**
   - Gamified 8-mission astrophysics masterclass.
   - Missions 1–4: Infrared vs. visible astronomy, 102 spectral bands, detector arrays, difference pipeline.
   - Missions 5–8: Blink comparator, $D = I_2 - I_1$ subtraction, forensic evidence quiz, final verdict.
3. **Cases View (`?tab=cases`):**
   - Curated NASA/IPAC SPHEREx QR2 benchmark targets (NEP Deep Variable, Calibration Standard, Proper Motion, Footprint Edge).
4. **About & Scientific Audit (`?tab=about`):**
   - Complete technical audit against NASA QR2 data release standards, mathematical formulas, and provenance records.
5. **Home View (`?tab=home`):**
   - High-impact landing page addressing the 4 foundational questions: What is SPEX, What is SPHEREx, What can I do here, Where to start.

---

## 3. Design Tokens & Color Palette

| Token Name | Hex Code | Purpose |
|---|---|---|
| `bg-space-dark` | `#070a14` | Primary viewport & body background in dark mode |
| `surface-space-card` | `#0b1021` | Elevated container and panel surface |
| `border-space-glass` | `rgba(255, 255, 255, 0.08)` | Subtle luminous container boundary |
| `accent-amber` | `#f59e0b` | Significant celestial signals & positive detections |
| `accent-cyan` | `#06b6d4` | Real moving-object dipole pairs & cosmic detective UI |
| `accent-rose` | `#f43f5e` | Filtered detector glitches & negative residuals |
| `accent-indigo` | `#6366f1` | Gaia DR3 & AllWISE catalog cross-matches |
| `text-warm-white` | `#f1f5f9` | High-contrast readable typography |

---

## 4. Responsive Layout System

The interface is engineered with a mobile-first, grid-adaptive layout:
- **Mobile (320px – 639px):**
  - Canvas scales fluidly down to 320px with zero marker drift.
  - Controls condense into touch-friendly collapsible trays.
  - Floating HUD moves to bottom-center with high contrast glass backdrops.
- **Tablet (640px – 1023px):**
  - Medium viewport (480px canvas) with stacked or hybrid column arrangement.
- **Desktop (1024px – 1440px+):**
  - 12-column dual-pane workspace: 7-column deep-sky viewport and 5-column scientific inspector & SPEX companion.
