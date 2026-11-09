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

## 4. Completed Transformations: 3D Adventure Game & NASA Mission Control

### A. 3D Third-Person Adventure Game ("SPEX: THE LAST SIGNAL")
- **Three.js Engine Architecture (`src/game/3d/GameEngine3D.ts`)**: Full third-person chase camera with spherical damping, collision sliding physics against station bounding boxes, and ground detection.
- **Composite Procedural Player Avatar (`src/game/3d/PlayerAvatar.ts`)**: 3-12 part hierarchical model (torso, armor plate, helmet with glowing visor, cat ear telemetry sensors, dual-nozzle thruster pack, articulated limbs).
- **Interactive Station Facility (`src/game/3d/StationBuilder.ts`)**: Central sky dome, holographic celestial sphere, observation consoles with light beacons, and panoramic space viewing decks.
- **5 Story Missions & Puzzles (`src/game/3d/PuzzleModal.tsx`)**:
  1. *Subsystem Initialization*: Power routing to cryo-cooler (80K), LVF detector arrays, and variance diff engine.
  2. *102-Band Spectral Lab*: Wavelength sweep across dust-penetrating IR, identifying 3.05µm H₂O ice and 4.27µm CO₂ ice absorption dips.
  3. *Temporal Alignment*: WCS sub-pixel registration, fast 2Hz blink, and variance subtraction $D = I_2 - I_1$.
  4. *False Signal Diagnostic*: Discriminating authentic PSF profiles from cosmic ray Dirac spikes and pointing jitter.
  5. *Deep Space Forensic Case*: Young stellar object (YSO) FU Orionis accretion diagnosis, culminating in an official SPEX Investigation Certificate.
- **Mobile Touch Controls (`src/game/3d/MobileControls.tsx`)**: Virtual analog joystick with radius clamping, sprint toggle, jump jetpack, and touch interact buttons.
- **Strict Data Isolation**: Game displays explicit `EDUCATIONAL SIMULATION — NOT REAL SPHEREx DATA` banner to guarantee academic and scientific honesty.

### B. NASA Mission Control Room Redesign (`src/components/HomeView.tsx`)
- **Visual Aesthetic**: Deep midnight-blue backgrounds (`#070a12`, `#0b1120`), dark graphite surfaces, controlled cyan/amber illumination, orbital graphics.
- **Core Headline**: *"Every observation tells a story. Every change deserves an investigation."*
- **Supporting Copy**: *"Explore the infrared universe through SPHEREx observations. Compare the sky across time and investigate the signals that deserve a closer look."*
- **Live Mission Telemetry Terminal**: Directly connected to `/api/status` displaying operational data availability, NASA IPAC IRSA Level-2B source, WCS/variance engine status, AI status, and last processing timestamp.
- **3 Visual Stages**: 01 Explore, 02 Compare, 03 Investigate.
- **CTAs**: Primary `ENTER MISSION CONTROL` and secondary `PLAY 3D ADVENTURE`.

### C. Visual Science Laboratory (`src/components/VisualScienceExplainer.tsx`)
- Interactive modules for:
  - What is infrared light? (Visible vs IR dust penetration slider)
  - What are spectral bands? (102 channels across 6 detector arrays)
  - What is an observation? (Telescope -> Detector -> Calibrated FITS -> Analysis pipeline)
  - What is a difference image? (Interactive $D(x,y) = I_2(x,y) - I_1(x,y)$ simulator)
  - What is uncertainty & SNR? ($> 5.0\sigma$ discovery threshold visualizer)
  - Celestial sphere coordinate selector for NEP deep survey field.
- Integrated into `ExploreView.tsx` with progressive disclosure.

### D. Quality & Verification
- **Unit & Integration Tests**: 60/60 tests passing (`npm test`).
- **Type Checking**: 0 errors (`tsc --noEmit`).
- **Production Build**: Verified (`npm run build`).
- **Linter & Compiler**: 0 warnings, 0 errors (`lint_applet` & `compile_applet`).

---

## 5. Completed: Final Human Experience Overhaul & Scientific Completeness

### A. Two-Level Explanation Architecture
- **Simple Explanation by Default**: Uses intuitive everyday words (buttons: 1–4 words, titles: 2–6 words, tooltips: 1 sentence, explanations: 1–3 short sentences).
- **Deep Science on Demand**: Technical metrics ($\sigma$, WCS, variance propagation, IRSA Level-2B) preserved cleanly in expandable `<ScienceTerm />` micro-cards and drawer.
- **Natural Egyptian Arabic & Clean English**: Warm, colloquial Egyptian Arabic ("بص يا بطل", "ولا تشيل هم خالص، هبسطهالك!") paired with friendly, non-academic English.

### B. Smart, Context-Aware SPEX Assistant with Progressive Simplification
- **Multi-Turn Simplification Memory**: Tracks explanation depth (Level 0: simple, Level 1: TV remote infrared analogy, Level 2: animal hearing / invisible colors analogy).
- **Proactive Simplification**: Instant conversational response when users ask "مش فاهم" / "اشرح أبسط" / "مثال؟" / "I don't understand".
- **3-Tier Explanation Pills**: Direct toggle between Simple, Normal, and Advanced Scientific explanation levels in the assistant header.

### C. Explore Page: Exact 6-Section Visual Hierarchy in Linear Order
1. **Section 01 — Explore the Sky**:
   - Coordinate search (RA, Dec, FoV), preset starter regions (Interesting Variable Star, Calm Reference Region, Fast-Moving Star, Deep Calm Field).
   - Visual Celestial Coordinates Explanation Card: Right Ascension (RA) = Sky Longitude ($0^\circ \to 360^\circ$); Declination (Dec) = Sky Latitude ($-90^\circ \to +90^\circ$).
   - 5 Official NASA Challenge Targets bar (`<ChallengeTargetsBar />`).
2. **Section 02 — Your Observations**:
   - Visual timeline of ALL valid observations ($N \ge 1$) with Visit cards.
   - Baseline interval suggestion pills (Short Interval ~128.9s, Medium Interval, Longest Interval full baseline).
   - Earlier (Visit 1) and Later (Visit 2) observation pickers with timestamps.
   - Sequential playback controls: Play/Pause, Prev/Next, Cadence Speed (0.5x, 1x, 2x), and Step Indicator (`Visit X of N`).
   - Plain-language explanation of why the time difference matters (minutes vs months).
3. **Section 03 — See the Image**:
   - Clear 1–2 sentence label: *"This is an infrared image of the selected region taken by SPHEREx. Brighter areas indicate higher infrared energy from stars, gas, and cosmic dust."*
   - Large astronomical sky viewport with pan, zoom, reset, crosshair reticle markers toggle, and smooth presentation vs raw detector pixels toggle.
   - Live cursor readout: Sky position (RA, Dec) & Measured Brightness (MJy/sr or $\sigma$).
   - Physical Brightness Colorbar with min, median / 0, max.
4. **Section 04 — Compare Observations**:
   - Earlier Snapshot ($I_1$), Later Snapshot ($I_2$), What Changed ($D = I_2 - I_1$), Signal Strength ($\sigma$), Split Slider, and Fast Blink.
   - Display adjustments: stretch modes (`asinh`, `sqrt`, `linear`), colormaps (`diff_diverging`, `grayscale`, `viridis`, `magma`).
5. **Section 05 — What Did We Find?**:
   - Prominent 3-status discovery banner: `NO CLEAR CHANGE DETECTED`, `POSSIBLE CHANGE DETECTED`, or `INSUFFICIENT DATA`.
   - Action buttons: Sky Coverage, 102 Bands, Compare Table, Data Ingestion.
6. **Section 06 — Understand the Result**:
   - Candidate Finding Cards answering the 4 questions (What happened?, How strong is the evidence? [visual meter Weak->Strong], Is it reliable?, What should I know?).
   - Expandable Raw Science & FITS Metadata drawer.
   - SPEX Companion panel with large expressive reaction avatar.

### D. Game Redesign: 6 Beginner-Friendly Missions & Fixed 3D Controls
- **6 Playable Missions in `PuzzleModal.tsx`**:
  1. *Welcome to SPEX Station*: Powering subsystems (cryo-cooler 80K, LVF array, diff engine).
  2. *The SPHEREx Journey*: Arranging 4 chronological milestones (2019 MIDEX, 2024 JPL testing, 2025 launch, 2025+ all-sky survey).
  3. *See the Invisible*: Infrared lab, toggling visible vs IR to reveal hidden protostar behind dust.
  4. *Find What Moved*: WCS spatial alignment to zero offset, blink comparison to catch proper motion.
  5. *Match the Light*: 102-band spectral light matching for 3.05µm Water Ice, 4.27µm CO₂ Ice, and 2.30µm CO Gas.
  6. *The Final Space Investigator*: Rejecting 1-pixel cosmic ray, verifying dipole, certifying FU Orionis flare with official certificate.
- **Fixed 3D Camera & Movement (`GameEngine3D.ts` & `Spex3DGame.tsx`)**:
  - Horizontal mouse drag turns camera yaw naturally.
  - Invert Mouse X and Invert Mouse Y toggles added to Pause Menu.
  - Directional movement strictly oriented to horizontal camera yaw with normalized diagonal speed.

### E. Verification Summary
- **Tests**: 60/60 passing (`npm test`).
- **Type Checking**: 0 errors (`npx tsc --noEmit`).
- **Compilation & Linting**: Co-executed and verified successful (`compile_applet` & `lint_applet`).
- **HTTP Dev Server**: Verified HTTP 200 on port 3000.
