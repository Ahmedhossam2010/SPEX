# SPEX — SPHEREx: The Changing Sky

**NASA Space Apps Challenge 2026** — An interactive multi-epoch infrared sky viewer, Mr. SPEX Learning Academy, and 2D/3D cosmic detective experience powered by live **NASA/IPAC IRSA SPHEREx** cutouts, Gaia DR3 differential astrometry, and `WCS-WAVE` `-TAB` spectroscopy (English & Arabic RTL).

---

## 60-Second Judge Demo Script

1. **0:00–0:10 · Home & Quick Demo:** Open `http://localhost:3000`. Note the 4-item header (`Home`, `Explore`, `Academy`, `Play`), live `Rank + XP` badge, and 3 primary Hero cards (`Start Academy`, `Explore the Sky`, `Play`). Click **Quick Demo: WISE 0855**.
2. **0:10–0:25 · Full-Bleed Explore Viewer & Blink Motion:** Explore opens **WISE 0855-0714** (`D5`) in a full-bleed high-DPR sky viewport with smooth Catmull-Rom bicubic interpolation and auto-playing blink animation. Use the floating **Time** panel to toggle **Survey-pass** mode (`≤ 45d` clustering; discloses `< 2` passes honestly) and notice the **dashed "expected" track** (`motion not significant` below `3σ`).
3. **0:25–0:40 · Cross-Telescopes, DQ Flags & Share:** Switch targets via preset or deep link (`/?target=barnards-star&band=D5&fov=6.6&pass=1`) to see a solid measured proper-motion trail. Open **Other telescopes** (`Gaia DR3`, `AllWISE`, `Aladin Lite` with marker legend), inspect red **DQ** artifact highlights (`Why is this marked?` / `Report bad data`), and click **Share** for deep links, Web Share API, or `?embed=1` iframe snippets.
4. **0:40–0:55 · Mr. SPEX Academy & 6-Chapter Game:** Open **Academy** (`6` Khan-style levels with course map, SVG diagrams, inline practice checks, and Level 0–5 exams earning Learning XP). Open **Play** to enter the Main Menu (`Play Story`, `Level Select Map` with 0–3 ★ stars, `Sliding Sky Puzzle`, HUD, Pause, Tutorial, plus lazy-loaded 3D station).
5. **0:55–1:00 · Community & 3-Source XP:** Open the **Community** icon in the header or Home to inspect **Learning / Solving / Game XP**, post a discovery note, reply/report, and view citizen bad-data flags.

---

## How to Run (1-Command Setup)

Requires **Node.js 22+** (`.nvmrc` included). No API key is required for core Explore, Academy, Game, or offline snapshot mode — copy `.env.example` to `.env` only if enabling optional Gemini explanations (`GEMINI_API_KEY`).

```bash
npm install                        # Installs dependencies using package-lock.json
npm run dev                        # Starts Express + Vite dev server on http://localhost:3000
```

Useful scripts:

```bash
npm run check                      # Runs TypeScript type-check + full production build
npm run lint                       # Runs tsc --noEmit
SPHEREX_OFFLINE=1 npm test         # Runs unit & API validation suites offline (113/122; 5 legacy fixture + 4 live IRSA checks)
npm run build                      # Builds Vite frontend + esbuild server.js
npm start                          # Runs production server (node server.js, respects $PORT)
```

---

## Working Deep-Link Examples (All 5 Test Targets + Embed Mode)

- **WISE 0855-0714 (Default Quick Demo):** `/?target=wise-0855&band=D5&fov=6.6&pass=1`
- **Barnard's Star (Fast Proper-Motion Red Dwarf):** `/?target=barnards-star&band=D5&fov=6.6&pass=1`
- **Epsilon Indi B (Clean Unsaturated Motion Detection):** `/?target=epsilon-indi&band=D3&fov=6.6&pass=1`
- **RW Aurigae (Stationary Control):** `/?target=rw-aurigae&band=D1&fov=6.6&pass=1`
- **R Draconis (Bright Mira Control):** `/?target=r-draconis&band=D2&fov=6.6&pass=1`
- **Arbitrary Sky Coordinates:** `/?ra=269.452&dec=4.693&band=D5&fov=6.6`
- **Minimal-Chrome Embed Mode:** `/?target=wise-0855&band=D5&embed=1`

---

## Challenge Checklist Mapped to Features

| Challenge Requirement | SPEX Implementation |
| :--- | :--- |
| **Clear entry in <60s & simple UX** | 4-item header, 3-card Home Hero, `Quick Demo: WISE 0855`, Scientist/Raw-pixel controls tucked behind explicit toggle |
| **Image quality & high-DPR optics** | `bicubicUpsampleRgba()` (Catmull-Rom) + `devicePixelRatio`-scaled canvases + smooth PSF star glows across Explore, Home, Postcards, Academy & Mini-Games |
| **Multi-epoch blink, trails & cadence** | Full-bleed `FramePlayer` w/ collapsible panels, fading ghost trails (`solid` vs `dashed + "expected"`), honest `groupFramesBySurveyPass`, `< 2` pass fallback disclosure |
| **DQ artifact transparency & catalogs** | Highlighted DQ cutouts + `"Why is this marked?"` legend + timeline warning badges + `"Report bad data"` + `Other telescopes` menu (`Gaia DR3`, `AllWISE`, `Aladin Lite`) |
| **Khan-style Academy (6 levels)** | Course map, preview toggle, SVG diagrams, inline practice + hint, key takeaways, exam, results screen, and 3-source XP (`Learning / Solving / Game`) |
| **Story Game + 4 Mini-Games + 3D** | Main Menu, 6-chapter Level Select Map (`0–3 ★`), Gameplay HUD, 3-step Tutorial, Pause/Complete modals, `SlidingSkyPuzzleGame`, lazy-loaded 3D SPEX Station |
| **Community & Embed Sharing** | Validated & rate-limited REST API (`/api/community/posts`, `/comments`, `/report`, `/flags`) backed by `data/community_store.json`, `?embed=1`, and survey credits footer |

### Deployment Note (Cloud Run / Container Ephemeral Storage)
- Community posts, comments, reports, and citizen bad-data flags are stored in `data/community_store.json` on the server filesystem (seeded safely on first boot). Because container filesystems on Cloud Run are ephemeral, community data lasts for the container instance's lifetime and resets across container restarts unless backed by an external store/volume. If storage is read-only or offline, the UI gracefully falls back to local/offline state.

---

## Verified 5-Target Astrometric Results (`maxFrames=16`, Live IRSA DR1/QR3/QR2)

| Target | Detector | Valid / Total (Unsat / Wing) | Baseline (d) | Gaia Ref Stars | Expected $(\Delta\text{RA}\cos\delta, \Delta\text{Dec})$ | Measured $\pm 1\sigma$ Error | $\sigma$ | Verdict | $|\text{Meas}-\text{Exp}|$ | Method |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Barnard's Star** | `D5` | `16/16 (0/16)` | `396.65` | `11` | `(-0.87″, +11.25″)` | `(-2.26″, +11.38″)` [`11.60″ ± 2.90″`] | `4.00σ` | `significant motion detected` | `0.48σ` | `b` (`includes wing-fit frames, low confidence`) |
| **Epsilon Indi B** | `D3` | `16/16 (16/0)` | `517.27` | `10` | `(+5.64″, -3.49″)` | `(+5.21″, -3.80″)` [`6.45″ ± 1.98″`] | `3.26σ` | `significant motion detected` | `0.27σ` | `a` (`unsaturated frames only`) |
| **WISE 0855-0714** | `D5` | `9/16 (9/0)` | `373.18` | `5` | `(-8.30″, +0.69″)` | `(-5.99″, +1.22″)` [`6.11″ ± 4.41″`] | `1.39σ` | `motion not significant` | `0.54σ` | `a` (`unsaturated frames only`) |
| **RW Aurigae** *(control)* | `D1` | `16/16 (6/10)` | `371.86` | `23` | `(+0.01″, -0.02″)` | `(+0.20″, -0.24″)` [`0.32″ ± 0.67″`] | `0.47σ` | `motion not significant` | `0.44σ` | `a` (`unsaturated frames only`) |
| **R Draconis** *(control)* | `D2` | `14/16 (0/14)` | `379.67` | `6` | `(-0.02″, +0.01″)` | `(+1.32″, -1.24″)` [`1.81″ ± 4.73″`] | `0.38σ` | `motion not significant` | `0.39σ` | `b` (`includes wing-fit frames, low confidence`) |

---

## Updating for Future IRSA SPHEREx Data Releases (Zero Code Changes)

When NASA/IPAC IRSA publishes new data drops or all-sky releases:

1. Configure environment variables (see `.env.example` and `docs/DATA_DROP_RUNBOOK.md`):
   - `SPHEREX_IRSA_HOST` (default: `https://irsa.ipac.caltech.edu`)
   - `SPHEREX_ARTIFACT_TABLE` (default: `spherex.artifact`)
   - `SPHEREX_PLANE_TABLE` (default: `spherex.plane`)
   - `SPHEREX_RELEASE_PREFERENCE` (default: `dr1,qr3,qr2` — newest release listed first for automatic deduplication)
2. Verify live TAP connectivity, `availableReleases`, and the newest observation MJD (`MAX(p.time_bounds_upper)`) via:
   ```bash
   curl http://localhost:3000/api/health
   ```

---

## Scientific Notes, Method & Known Limitations

- **Differential Astrometry & Error Budget Method:** At SPHEREx's `6.2″/pixel` plate scale, SPEX calibrates each cutout against isolated Gaia DR3 field stars (`|pm| < 20 mas/yr`, ≥ 3 px separation, sigma-clipped translation or constrained affine when ≥ 6 stars exist; `< 3` stars flagged `low confidence`), rejects DQ saturation/overflow (`0x02`) and non-functional (`0x10`) pixels, and excludes closer `15″` catalog neighbors. Displacement and annual proper motion are computed by inverse-variance (`1 / σ_i²`) weighted linear regression of `(dRA·cos Dec, dDec)` vs MJD twice: **(a)** using unsaturated-core frames only when `≥ 4` frames span `≥ 180` days (`"unsaturated frames only"`), and **(b)** using all valid frames including `2–6 px` Moffat wing fits weighted by their larger per-frame errors (`"includes wing-fit frames, low confidence"`). Significance requires `displacement / target_own_error ≥ 3.0σ` **and** agreement with the expected offset within `2.0σ`.
- **Per-Detector Astrometric Floor:** Combined in quadrature with the weighted fit error via Gaia DR3 leave-one-out (LOO) residuals per brightness class (`bright`/`medium`/`faint`) and unsaturated stationary-control scatter (`RW Aur` in `D1`: `0.69″` RMS). Observed per-detector floors: `D1` `0.54″` (`bright`, RW Aur), `D2` `3.20″` (`bright` LOO, R Dra), `D3` `1.92″` (`Epsilon Indi`), and `D5` `0.59″` (`bright`, Barnard) / `4.03″` (`faint`, WISE 0855).
- **Wing-Fit & `< 3σ` Caveats:** Targets whose cores saturate `0x02` across detectors (`Barnard's Star`, `R Draconis`) rely on `2–6 px` PSF wing fitting and are always flagged `"includes wing-fit frames, low confidence"` with conservative uncertainties (`≥ 1.8″` per frame); wing-fit scatter is excluded from calibrating the unsaturated detector floor. Targets below `3σ` (`WISE 0855`, `RW Aurigae`, `R Draconis`) are reported honestly as `"motion not significant"` and tracked at the predicted position with measured vs predicted shown.
- **Empirical PSF (`EPSF` Extension) & LVF Coupling:** `FITSReader` preserves `EPSF` 3D metadata (`101×101×121`), and `WCS-WAVE` `-TAB` maps pixel-level wavelengths; cross-band spectra spanning `> 0.3 µm` display an explicit LVF spatial-spectral slope caveat.

---

## Future Work

- Splitting `server.ts` into modular route and pipeline service modules (`src/server/routes/*`, `src/server/tapClient.ts`).
- Animated GIF / MP4 blink-sequence and time-lapse movie export directly from `FramePlayer`.
- Full 2D `EPSF` BINTABLE forward-modeling photometry for crowded fields and blended binaries (such as resolving sub-arcsecond Epsilon Indi Ba/Bb components).
- Automated multi-epoch shift-and-stack orbital search for Solar System NEOs and faint moving asteroids.
- Persistent browser workspace bookmarks for custom discovered transient candidates.

---

## Explorer Mode, SPEX AI Guide & Hands-On Missions

- **Two Workspace Modes (`localStorage`: `spherex_explore_mode`):**
  - **Explorer (default for new visitors):** Mobile-first layout (`360px+`) with 5 friendly target cards, the calibrated sky cutout, 3 action buttons (**Play the sky**, **Show what changed**, **Ask SPEX**), plain-language data status (`Live from NASA` / `Saved copy from <date>`), plain-word honesty labels, clickable beginner glossary links (**Learn the words**), and 3 hands-on **Learn by Doing** missions (`Catch a moving star`, `Meet a freezing brown dwarf`, `Moving or just noise?`) that unlock milestones in `Space Explorer's Log` and generate **Discovery Postcards**.
  - **Scientist (`More tools` / header toggle):** Unlocks the full WiseView control bar, `D1–D6` detector switcher, `Advanced` drawer, Centroid vs Time / Measured Spectrum / Light Curve plots, Curtain Lab, and `Aladin Lite`.
- **Grounded SPEX AI Guide (`POST /api/spex/explain`):** Clicking any pixel on the sky canvas computes WCS `(RA, Dec)` coordinates, nearby `Gaia DR3` / `AllWISE` sources, local flux & S/N, plain-word DQ flag warnings, and verified target facts (`src/science/targetFacts.ts`). When `GEMINI_API_KEY` is configured (`GEMINI_MODEL` optional, server-side only with 12 s timeout, 20 req/min rate limit, and SHA-256 context caching), Gemini explains the exact spot in JSON mode and draws **"SPEX points here"** highlights on canvas; without an API key or on error, SPEX seamlessly switches to a deterministic `"SPEX offline mode"` template guide.

---

## Setup, Run, Test & Cloud Run Deployment

```bash
npm install
npm run dev       # Express + Vite middleware on http://localhost:3000
npm run build     # Vite production bundle + esbuild server.js
npm start         # Production server (node server.js, respects $PORT)
npm run lint      # TypeScript type-check (tsc --noEmit)
npm test          # Full unit test suite
npm run data-drop-check                             # Live IRSA TAP readiness per official target
npx tsx scripts/build_snapshot.ts                   # Refresh compact (<3.5 MB) archive snapshots
npx tsx --test src/science/irsaIntegration.test.ts  # Live IRSA TAP + direct cutout + WCS-WAVE test
node scripts/e2e_smoke.mjs                          # Headless Chromium smoke test
```

---

## Data Attribution & Non-Endorsement

Data: NASA/IPAC IRSA SPHEREx, ESA Gaia DR3, NASA AllWISE, CDS SIMBAD & Aladin Lite. NASA does not endorse this project.
