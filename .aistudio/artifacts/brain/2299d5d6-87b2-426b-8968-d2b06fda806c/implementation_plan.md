# Implementation Plan: Complete UI/UX Redesign — SPHEREx: The Changing Sky

This plan outlines the complete visual, architectural, and user experience redesign of **SPHEREx — The Changing Sky**. The redesign transforms the application from a dense technical dashboard into a world-class, accessible NASA Space Apps exploration platform: simple enough for anyone to understand in 10 seconds, deep enough for astrophysicists to inspect empirical evidence, and visually distinctive with SPEX the space-cat companion and the celestial Eye of Horus identity.

---

## 1. User Review & Architectural Alignment

Based on your design decisions:
- **Desktop Investigation Layout**: Two-column layout with a large, immersive astronomical canvas on the left and discovery findings & SPEX companion on the right.
- **SPEX Placement**: Dedicated, prominent companion panel with large, expressive reaction avatars ($160\text{px}\text{–}220\text{px}$ on desktop, interactive expandable drawer on mobile).
- **Default View Mode**: "What Changed" difference view with a prominent discovery banner upon loading any observation.
- **Strict Scientific Freeze**: All 8 scientific backend, WCS, FITS parsing, pipeline, catalog matching, server routes, and test files remain **strictly frozen**.

---

## 2. Proposed Architecture & Visual Design

### A. Branding & Visual Identity Foundation
- **Celestial Eye of Horus Logo (`SpherexLogo.tsx`)**:
  - Direct implementation of the official project logo provided by the team: outer celestial arcs, compass crosshair needles with top arrowhead and bottom anchor dot, upper sweeping eyelid in cosmic cyan-to-magenta gradient (`#00C0FF` $\to$ `#5E60FF` $\to$ `#FF2A8D`), lower eyelid in warm golden-orange-to-pink gradient (`#FFA000` $\to$ `#FF4565`), and central iris enclosing the radiant 5-pointed star (`#FFC700`).
  - Scalable vector component used across navigation, landing hero, and favicon.
- **Deep Obsidian Dark Theme (Default)**:
  - Background: Deep space obsidian (`#07090E` / `#0B0F19`), hairline borders (`border-white/10`), surface panels (`bg-white/[0.03]`), precision telemetry amber (`#F59E0B`), and deep sky cyan (`#06B6D4`).
- **Clinical Laboratory Light Theme (Supported Alternative)**:
  - Background: Lab slate (`#F8FAFC`), crisp dark slate typography (`#0F172A`), hairline borders (`border-slate-200`), and warm amber/indigo accents.
  - User theme choice persisted in `localStorage`.

### B. The Two-Layer Language System
- **Layer 1: Plain Human Language by Default**:
  - "Statistical significance" $\to$ **"How strong is the change?"**
  - "Artifact score" $\to$ **"Could this be an instrument effect?"**
  - "Cross-match" $\to$ **"Known sources nearby"**
  - "Proper motion" $\to$ **"How fast did it appear to move?"**
  - "Difference image" $\to$ **"What changed"**
  - "Aperture photometry" $\to$ **"Measured brightness change"**
  - "Significance map" $\to$ **"Signal strength"**
- **Layer 2: Interactive Scientific Translator (`<ScienceTerm />`)**:
  - Whenever a technical term ($\sigma$, variance, WCS, aperture photometry, flux, $\text{MJy/sr}$, proper motion, position angle, dipole, Gaia DR3, AllWISE, DQ flags, IRSA, FITS) appears, it features a subtle interactive dotted underline and help trigger.
  - Clicking/tapping opens a compact, non-intrusive micro-card formatted with:
    1. **Technical Term**: Plain name and scientific notation.
    2. **Simple Explanation**: 1–2 plain-language sentences.
    3. **Why It Matters**: Why this metric is critical for verifying a real celestial discovery.

### C. SPEX: The Interactive Scientific Guide
- **Visual Presence**:
  - Prominent, high-resolution rendering of SPEX using the 16 expressive reaction poses (`greeting`, `explaining`, `thinking`, `curious`, `investigator`, `eureka`, `sassy`, `sarcastic`, `joker`, `laughter`, `serious`, `surprised`, `happy`, `facepalm`, `normal`, `success`).
  - Character rendered with transparent backgrounds, crisp scaling, and no awkward cropping.
- **Conversational Engine & Streaming Delivery**:
  - Responses streamed progressively in short, readable conversational chunks with natural pauses (250–400ms) rather than wall-of-text blocks.
  - Conversational tone: Witty, sharp, curious, and scientifically honest (supports English and Egyptian Arabic).
  - Never claims confirmed discoveries prematurely ("This signal is consistent with motion; let's check the detector quality flags first").
- **Smart Prompt Chips**:
  - Quick interactive prompts: *"What's going on here?"*, *"Is this an asteroid?"*, *"Could this be detector noise?"*, *"Explain the numbers"*.

### D. Desktop Two-Column Investigation Layout
- **Left Stage (62%–65% width)**:
  - Header with observation target name, coordinates, and observation dates.
  - Prominent primary canvas with full pan/zoom, interactive crosshair HUD, and live celestial coordinate inspector (`[x,y]`, `ICRS RA/Dec`, `MJy/sr`).
  - Streamlined segmented control dock:
    - *What Changed* (Difference, default)
    - *Signal Strength* (Significance)
    - *First Look* (Epoch 1)
    - *Second Look* (Epoch 2)
    - *Blink* (Cadence toggle with speed slider)
    - *Split* (Curtain wipe slider)
  - Display options tray: Scientific Native ($6.15''/\text{px}$) vs. Smooth Presentation, Astronomical Stretch (`asinh`, `sqrt`, `linear`), and Colormaps.
- **Right Stage (35%–38% width)**:
  - **Top**: Prominent Discovery Banner summarizing the finding in one plain-language sentence.
  - **Middle**: Candidate Finding Cards:
    - Large typography: Change strength (e.g., $7.2\sigma$), velocity ($0.42''/\text{day}$), or artifact alert.
    - Multi-catalog badges (Gaia DR3 optical + AllWISE mid-IR).
    - Progressive disclosure: "Why do we think that?" $\to$ "Show me the measurements" $\to$ Raw FITS metadata.
  - **Bottom / Integrated**: SPEX Scientific Guide panel with large active character reaction, streaming chat, and contextual insights.

### E. Mobile-First Investigation Layout (320px–430px)
- Natural vertical hierarchy with no horizontal clipping:
  1. Header with Logo, Case Selector, Theme & Language Toggle.
  2. Investigation Title & 1-sentence finding summary.
  3. Responsive Square Sky Viewport with touch pan/zoom and center reticle.
  4. Single-line swipeable mode strip (*What Changed*, *Blink*, *Split*, *First Look*, *Second Look*).
  5. Candidate Finding Cards with clear discovery indicators.
  6. Floating / Bottom-Docked SPEX trigger opening an expandable conversational drawer.
  7. Collapsible "Scientific Measurements & FITS Metadata" drawer at the bottom.

### F. Landing & Case Selection Experience
- **Hero Section**:
  - Official Celestial Eye Logo + Title: **SPHEREx — The Changing Sky**.
  - Headline: **Find what changed in the infrared sky.**
  - Direct 2-button entry:
    - `[ Explore NEP Deep Field ]` (Instant launch into genuine variable candidate)
    - `[ Search Any Coordinates ]` (Open coordinates search)
- **Interactive Case Cards**:
  - Curated Archival Cases presented with human titles:
    - *North Ecliptic Pole Deep Field* (Genuine Variable Candidate)
    - *Photometric Stability Standard* (Quiet Sky / Instrument Calibration)
    - *Detector Quality Filter* (Saturated Pixel & Cosmic Ray Rejection)
    - *Spectral Channel Guard* (Why Different Wavelengths Cannot Be Subtracted)

---

## 3. Step-by-Step Implementation Sequence

```
1. Brand & Logo Component (SpherexLogo.tsx)
   └─ Build SVG vector logo matching eye_logo_no_text_centered.png
2. Theme & Design Tokens
   └─ Configure Tailwind light/dark variables, typography, and hairline borders
3. Scientific Translator & Dictionary (ScienceTerm.tsx & scientificGlossary.ts)
   └─ Build contextual term explainer with plain-language definitions
4. SPEX Companion Overhaul (SpexCompanion.tsx)
   └─ Large expressive avatars, progressive chunk streaming, smart prompt chips
5. Candidate Discovery Cards (FindingCard.tsx)
   └─ Plain-language findings with progressive disclosure to measurements
6. Canvas & Viewport Redesign (SkyViewport.tsx)
   └─ Clean 2-column desktop stage, responsive mobile viewport, touch controls
7. Main Shell & Navigation (App.tsx & Header.tsx)
   └─ Seamless screen transitions, case selection, search modal, and theme toggle
8. Verification & Test Execution
   └─ Verify 21/21 tests pass and compilation succeeds with zero errors
```

---

## 4. Verification & Safety Safeguards

1. **Frozen Files Assurance**:
   - `src/science/fitsReader.ts` — NOT modified
   - `src/science/wcs.ts` — NOT modified
   - `src/science/pipeline.ts` — NOT modified
   - `src/science/catalogMatcher.ts` — NOT modified
   - `src/science/types.ts` — NOT modified
   - `src/science/science.test.ts` — NOT modified
   - `server.ts` — NOT modified
   - `data/*` — NOT modified
2. **Automated Verification**:
   - `npm test` must output 21/21 passing tests.
   - `npx tsc --noEmit` must output 0 errors.
   - `npm run build` must produce clean client and server bundles.
