# SPEX — Release & Verification Status

This file consolidates and supersedes the earlier status reports archived in `docs/archive/` (`PROGRESS.md`, `docs/FREEZE_STATUS.md`, `docs/QA_REPORT.md`).

---

## 1. Build, Typecheck & Test Metrics (Verified)

| Check | Command | Result | Notes |
| :--- | :--- | :--- | :--- |
| **TypeScript Lint** | `npm run lint` (`tsc --noEmit`) | **PASS (0 errors)** | Verified across client, server, science, academy, game, and community modules. |
| **Production Build** | `npm run build` | **PASS** | Vite client bundle (with lazy-loaded Three.js 3D module) + `esbuild` `server.js`. |
| **Unit & Integration Tests** | `npm test` (`tsx --test`, Node `node:test`) | **117 / 122 passing across 12 suites** | 12 suites, 122 tests total. 117 pass; **5 pre-existing failures** in `src/science/science.test.ts` (see §2). |

### Test Suite Breakdown (`npm test`)
- `src/progress/progressStore.test.ts`: **6 / 6 PASS** (rank thresholds, 3-source XP breakdown, bad-data reports, legacy localStorage migration, corrupted/throwing storage resilience)
- `src/utils/translations.test.ts`: **4 / 4 PASS** (100% EN/AR key parity, non-empty strings, valid Arabic script coverage)
- `src/game/minigames/slidingPuzzleLogic.test.ts`: **2 / 2 PASS** (guaranteed-solvable 3×3 board shuffling & orthogonal tile sliding rules)
- `src/community/communityValidation.test.ts`: **5 / 5 PASS** (nickname regex & HTML/link filtering, profanity blocking, flag validation, sliding-window rate limiter)
- `src/science/surveyPasses.test.ts`: **2 / 2 PASS** (real MJD pass grouping across `> 45d` gaps without synthetic uniform spacing)
- `src/game/game.test.ts`: **8 / 8 PASS** (cosmic detective 5-mission math, 102-channel spectral dips, `D = I2 - I1`, 3D station & avatar)
- `src/science/acceptanceAudit.test.ts`, `src/science/archiveAdapter.test.ts`, `src/utils/astronomyRender.test.ts`, `src/utils/productionHardening.test.ts`, `src/utils/provenanceIntegrity.test.ts`: **ALL PASS**
- `src/science/science.test.ts`: **5 pre-existing failures** (see §2)

---

## 2. Known Pre-Existing Test Caveat (Left Untouched)

The 5 failing subtests in `src/science/science.test.ts` (lines `1138`, `1376`, `2202`, `2445`, `2851`) pre-date the UI/platform polish pass and were intentionally **not** altered because modifying astrometry/FITS pipeline fixtures or expectations violates the science pipeline freeze:
- On-disk FITS test fixtures in `data/spherex_cache/` are newer `~8.22 MB`, 3-HDU cutouts rather than the earlier `5,117,760`-byte / 7-HDU (`WCS-WAVE` `-TAB`) fixtures expected by those 5 legacy unit assertions.

---

## 3. Implemented Capabilities by Phase

### Phase 1 & 2 — Flow, Full-Bleed Explore Viewer & High-DPR Image Quality
- **Header & Home (`Header.tsx`, `HomeView.tsx`):** 4-item header (`Home`, `Explore`, `Academy`, `Play`) + live `Rank + XP` pill (`data-testid="header-rank-badge"`) + compact Community shortcut. Home presents 3 clear primary action cards (`Start Academy`, `Explore the Sky`, `Play`) and a one-click `Quick Demo: WISE 0855` button.
- **Full-Bleed Viewport & Collapsible Floating Panels (`FramePlayer.tsx`, `ExploreView.tsx`):** Sky canvas fills the viewport edge-to-edge with soft radial vignette fading cutout borders cleanly. Floating collapsible panels organize Time/Survey-pass/Bands (Left), `Other telescopes` + FOV warning + DQ Legend & Report (Right), and Playback + Actual-Date Timeline + Share + Immersive idle auto-hide (Bottom).
- **High-DPR Smooth Optics (`smoothCanvas.ts`, `astronomyRender.ts`, `CurtainDivider.tsx`, `PostcardModal.tsx`):** Canvases scale by `devicePixelRatio`; cutouts use separable 2D Catmull-Rom bicubic upsampling (`bicubicUpsampleRgba()`) and `imageSmoothingQuality = 'high'`; stars render as soft PSF glows (`drawPsfStar()`). Raw-pixel viewing is strictly tucked behind Advanced Scientist mode.
- **Survey-Pass Cadence & Honest Motion Trails:** `groupFramesBySurveyPass` clusters real exposures (`≤ 45d` gaps) and discloses `< 2` passes honestly without fabricating intervals. Ghost trail draws solid cyan when significant and dashed amber `"expected"` otherwise (`"motion not significant"` wording preserved).
- **DQ Marking, Cross-Telescopes & Share/Embed:** Affected cutouts show DQ artifact circles, timeline warning badges, a `"Why is this marked?"` legend, and `"Report bad data"` (saved locally + posted to `/api/community/flags`). Share modal copies `?target=&ra=&dec=&band=&fov=&pass=`, invokes Web Share API, copies `?embed=1` `<iframe>` snippets, and links to Discovery Card export.

### Phase 3 — Khan Academy-Style Learning Platform
- **`src/academy/academyData.ts`, `src/academy/AcademyDiagram.tsx`, `src/components/AcademyView.tsx`:** 6 progressive levels (`0` What is SPHEREx → `5` Discover on Your Own) with Course Map (`Preview all levels` toggle + progress bar), Lesson (`AcademyDiagram` crisp SVG vectors, concept sections w/ `ScienceTerm`, inline Practice Check w/ Hint, Key Takeaways, `"Try it in Explore"`), Exam (MCQ + live Explore `viewer_action` checks), and Results screen awarding Learning XP.

### Phase 4 — Full Story Game Experience & High-DPR Puzzles
- **Story & Game Loop (`SpexAdventureGame.tsx`, `storyChapters.ts`):** Main Menu (`Play Story`, `Level Select Map`, `Rank & Achievements`, `Settings`), 6-chapter Level Select Map with `0–3 ★` star ratings, Gameplay HUD (`Score`, `Lives`, `Timer`, `Help`, `Pause`), first-time 3-step skippable Tutorial (`try/catch` guarded storage), Pause Modal, Level Complete modal, and lazy-loaded Three.js 3D Space Station (`React.lazy`).
- **New `SlidingSkyPuzzleGame.tsx` + High-DPR Mini-Games:** Crisp 3×3 sliding sky mosaic puzzle (`slidingPuzzleLogic.ts` guaranteed-solvable shuffle, arrow keys + click controls), plus high-DPR PSF backdrops on `ConstellationDotsGame`, `SpotDifferenceBlinkGame`, and bicubic upsampling in `CosmicDetectiveGame`.

### Phase 5 — Community Board & 3-Source XP Backend
- **Express APIs (`server.ts`, `src/community/communityValidation.ts`):** `GET/POST /api/community/posts`, `GET/POST /api/community/posts/:id/comments`, `POST /api/community/posts/:id/report`, and `GET/POST /api/community/flags`, backed by `data/community_store.json` with strict regex nickname checks, HTML/URL stripping, profanity filter, and sliding-window per-IP rate limiting.
- **`src/components/CommunityView.tsx`:** Displays **Learning XP**, **Solving XP**, and **Game XP** separately, Discoveries Feed with inline replies & reporting, Rank Board, Citizen Bad-Data Flags log, and graceful offline notice.
- **Cloud Run Ephemeral Storage Note:** `data/community_store.json` persists on local disk (and seeds cleanly on boot). On ephemeral container platforms such as Cloud Run without mounted persistent storage, submissions remain live for the container instance's lifetime and degrade cleanly to local state if storage is read-only.

---

## 4. Repository Note
- No `.git` directory is present in `/app/applet`, so changes are verified directly on disk rather than committed via `git commit`.
