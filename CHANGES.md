# SPEX — Changes Log (No-Git Workspace Sync)

## Phase A — UI Corrections & Baseline Alignment
- `src/App.tsx`: Kept `'home'` as the default landing route while preserving deep-link query params (`?target=`, `?case=`, `?ra=&dec=`, `?band=`, `?detector=`, `?fov=`) and passing `activeCaseId`.
- `src/components/HomeView.tsx`: Added primary `"Open Explorer"` CTA, compact 5-target challenge preset bar, and collapsible SPEX Cat Guide card.
- `src/components/Explore/SpexCompanion.tsx`: Updated bilingual EN/AR hints, proactive tips, quick questions, and guidance for progressive controls.
- `src/components/Explore/SpexGuidedTour.tsx`: Updated EN/AR guided tour steps to match progressive disclosure and WiseView player controls.
- `src/components/ExploreView.tsx`: Restored SPEX Companion toggle, moved FOV selector into `FramePlayer` Advanced drawer, wrapped `AladinLitePanel` in a collapsible labeled slot, and wired `activeCaseId`.
- `src/components/TimeLens/FramePlayer.tsx`: Added default control bar + collapsed `localStorage`-persisted `Advanced` drawer, WiseView playback shortcuts (`Space`, `ArrowLeft`/`ArrowRight`, `L`, `B`), ARIA/reduced-motion support, and collapsible metadata/centroid/SED slots.
- `src/utils/translations.ts`: Added matching EN & AR translation keys for Phase A controls and reserved slots.

## Phase B — Live IRSA `spherex.artifact` / `spherex.plane`, WCS-WAVE `-TAB`, SIMBAD Astrometry & Variance Gating
- `server.ts`: Migrated TAP queries to `spherex.artifact` JOIN `spherex.plane`, implemented release ordering (`dr1`/`qr3`/`qr2`), MEF HDU extension parsing, progressive cutout streaming, startup preset cache warming, and `/api/health` readiness telemetry.
- `src/science/fitsReader.ts`: Added MEF extension indexing (`IMAGE`, `FLAGS`, `VARIANCE`, `ZODI`, `PSF`, `WCS-WAVE`) and `WCS-WAVE` `-TAB` spectral lookup interpolation.
- `src/science/pipeline.ts`: Added `VARIANCE`-gated centroid uncertainty, signal-to-noise gating (`S/N >= 5`), DQ bitmask exclusion, and same-release compatibility checks (`dr1`/`qr3`/`qr2`).
- `src/science/properMotion.ts`: Implemented spherical $\Delta\text{RA}\cdot\cos(\text{Dec})$ and $\Delta\text{Dec}$ propagation to observation epochs.
- `src/science/challengeTargets.ts`: Verified SIMBAD J2000 coordinates and proper motions for all 5 official targets (Barnard's Star, Epsilon Indi, WISE 0855, RW Aur, R Dra).
- `src/science/famousObjects.ts`: Updated catalog object availability wording to reflect the live DR1 / QR3 / QR2 public archive.
- `src/science/science.test.ts`: Added tests for MEF extension indexing, `WCS-WAVE` `-TAB` evaluation, release boundary enforcement, and Barnard's Star / WISE 0855 $\cos(\text{Dec})$ proper-motion + `VARIANCE` S/N gating.
- `Dockerfile`: Configured Cloud Run production container build and startup on port 3000 (`PORT=3000`).
- `.env.example`: Documented `GEMINI_API_KEY` and `SPHEREX_*` environment variables with no embedded secrets.

## Phase C (Finish Pass) — Live Proof, Snapshot Fallback, Stale Copy, Release Honesty, Repo Hygiene & E2E Verification
- `server.ts`: Added 5xx retry/backoff up to 120s on TAP queries, single-detector-first query optimization (`D2`/`D3`/`D1`) with widening fallback, 25s snapshot race fallback (`data/snapshots/<target>.json`), per-release exposure breakdowns (`exposuresPerRelease`, `activeRelease`, `activeVersion`), and updated SPEX archive copy.
- `scripts/build_snapshot.ts`: Created compact snapshot generator (<3 MB total across all 5 presets) with rounded pixel arrays and full FITS/WCS/MJD/VERSION/release provenance.
- `data/snapshots/{barnards-star,epsilon-indi,wise-0855,rw-aur,r-dra}.json`: Generated verified live-archive demo snapshots totaling 2.71 MB.
- `src/components/TimeLens/FramePlayer.tsx`: Displayed `release` (`dr1`/`qr3`/`qr2`) and processing `VERSION` in HUD and metadata strip, rendered exact archive snapshot label (`"REAL SPHEREx DATA - archive snapshot taken <date> (live archive slow or unreachable)"`), and gated diffs/stacks to same-release & same-VERSION frames with `"Use same-release subset"` action.
- `src/components/ChallengeTargetsBar.tsx`: Replaced stale QR2-only / NEP-restricted copy (EN & AR) with DR1 / QR3 / QR2 weekly-updates public archive wording.
- `src/components/DataReleaseModal.tsx`: Replaced stale QR2-only / NEP-restricted copy (EN & AR) with DR1 / QR3 / QR2 weekly-updates public archive wording.
- `src/components/AboutView.tsx`: Updated archive attribution text (EN & AR) to DR1 / QR3 / QR2 public archive.
- `src/components/ScientistExplore.tsx`: Updated release header and status strings to DR1 / QR3 / QR2 public archive.
- `src/components/SkyCoverageModal.tsx`: Updated sky coverage modal copy (EN & AR) to reflect DR1 / QR3 / QR2 public archive across all 5 targets.
- `src/components/QuickHelpQuestions.tsx`: Updated archive coverage Q&A (EN & AR) to DR1 / QR3 / QR2 public archive.
- `src/utils/translations.ts`: Replaced stale QR2/NEP hero and benchmark strings in EN & AR with DR1 / QR3 / QR2 weekly-updates wording.
- `src/components/Explore/AstronomicalSkyViewport.tsx`: Replaced stale QR2-only / NEP-restricted fallback card strings with DR1 / QR3 / QR2 wording.
- `src/components/Explore/FourLensesDock.tsx`: Updated default `dataRelease` and `D1–D6` status badge copy to DR1 / QR3 / QR2.
- `src/components/Explore/ObservationTimelineSelector.tsx`: Updated default `dataRelease` prop string to DR1 / QR3 / QR2.
- `src/components/Explore/ScientistInvestigationPanel.tsx`: Updated header badge copy to `DR1 / QR3 / QR2 LEVEL-2B`.
- `src/components/Explore/SpaceExplorerLogModal.tsx`: Updated archive attribution banner (EN & AR) to DR1 / QR3 / QR2.
- `src/components/Explore/SpexContextualGuide.tsx`: Updated level-3 dataset label to DR1 / QR3 / QR2 public archive.
- `src/App.tsx`: Aligned status strings and metadata labels with DR1 / QR3 / QR2 public archive.
- `scripts/data_drop_check.ts`: Rewrote `data-drop-check` to query live IRSA `spherex.artifact` JOIN `spherex.plane` per SIMBAD target position (propagated to 2025.6), reporting per-target row counts, detector bands, and date spans.
- `scripts/e2e_smoke.mjs`: Converted Playwright smoke script to plain JS checking Home load, SPEX visibility, preset Explore launch with frames, play/pause, blink toggle, detector selector, and EN/AR language toggle.
- `.gitattributes`: Marked `*.fits binary` to prevent CRLF/encoding corruption.
- `.gitignore`: Ignored `data/spherex_cache/*.fits` while tracking the 3 verified benchmark FITS files (`b6a1e605728059ea6b7def1e9683adb2.fits`, `569dafa911ec60ff30abb1807d719fef.fits`, `75b2c2369c175060576bec8d2e5333c0.fits`).
- `README.md`: Updated documentation with `build_snapshot.ts`, live `data-drop-check`, E2E smoke test, and Future Work items (splitting `server.ts`, GIF/MP4 export, EPSF photometry).
- `CHANGES.md`: Recorded all Phase A, Phase B, and Phase C file changes.
- `PROGRESS.md`: Marked Phase B and Phase C checklist items complete.

## Phase D — Astrometry Validity Pass
- `src/science/astrometry.ts`: Implemented differential Gaia DR3 frame alignment (`selectIsolatedReferenceStars`, `fitFrameAstrometryCorrection`, `measureFrameTargetDifferential`), critical SPHEREx DQ saturation/non-functional bitmask rejection (`0x02`/`0x10`), peak isolation checks, `15"` catalog neighbor exclusion, and stationary-control residual scatter helpers (`measureControlResidualScatter`, `computeAstrometricFloor`).
- `src/science/catalogMatcher.ts`: Increased live Gaia DR3 + AllWISE field query limits (`TOP 60`) for dense reference stars and added nearby `AllWISE J085501.95-071428.1` (`7.9"–8.2"` from WISE 0855) to benchmark catalog overlays.
- `src/science/timeSeriesPipeline.ts`: Extended `MeasuredCentroid` provenance with `refStarsUsed`, `refScatterArcsec`, `astrometryMethod`, `lowConfidence`, `lowConfidenceReason`, `maskedReason`, and `distToPredictedPix`.
- `server.ts`: Updated `/api/spherex/timeseries` with per-target recommended detector selection (`WISE 0855` -> `D5`/`D6`, `Barnard` -> `D3`/`D1`/`D5`, `Epsilon Indi` -> `D3`, `RW Aur` -> `D1`, `R Dra` -> `D6`), multi-release (`dr1`+`qr3`) baseline retention for astrometry & blink, group-first `sameReleaseOnly` subsetting, live differential astrometry calibration, stationary-control `astrometricFloorArcsec` calibration (`RW Aur` / `R Dra` persisted to `data/snapshots/control-floor.json`), and `3×` significance gating.
- `src/components/TimeLens/FramePlayer.tsx`: Surfaced `Astrometric floor`, reference star count, `low confidence` & `motion not significant` / `significant` badges, `not detected in D<n>` states, `15"` catalog neighbor notices, per-point `release`/`VERSION` tooltips, and largest-group Diff/Stack filtering.
- `scripts/build_snapshot.ts` & `data/snapshots/*.json`: Preserved `astrometrySummary`, `recommendedDetector`, and `largestDiffGroupKey` in refreshed compact (<3 MB) archive snapshots.
- `src/science/science.test.ts`: Added unit tests covering differential Gaia DR3 alignment, `< 3` reference-star low confidence, `0x02` DQ saturation masking, non-isolated peak rejection, and stationary-control astrometric floor gating (93/93 passing).
- `README.md`, `PROGRESS.md`, `CHANGES.md`: Documented differential astrometry, empirical error floor limitation, and verified benchmark results.

## Phase E — Final Close-Out (Error Budget, Live 5-Target Verification, Snapshots & Docs)
- `.env.example`: Added `GEMINI_API_KEY=` placeholder for server-side Gemini integration.
- `server.ts`: Restricted stationary-control floor updates to unsaturated frames (`unsatValidFrames.length >= 2`), normalized detector screening scores by `framesReturned`, and ordered `R Draconis` `D2` first.
- `src/components/TimeLens/FramePlayer.tsx`: Removed `× floor` / `Floor ratio` wording, added `annualMotion` and `errorBudgetLabel` fields/display, and aligned the wing-fit badge with `errorBudgetLabel`.
- `src/components/ExploreView.tsx`: Updated 60s demo step 3 caption to describe `WISE 0855` honestly as tracked at the predicted position with measured vs predicted shown (`6.11″ ± 4.41″`, `1.39σ`).
- `scripts/build_snapshot.ts`: Raised total snapshot cap to `3.35 MB` (`< 3.5 MB`) and per-preset fetch timeout to `240s`.
- `data/snapshots/control-floor.json`: Purged wing-fit `R Draconis` entries so only unsaturated `RW Aurigae` (`D1`) calibrates the stationary-control floor.
- `data/snapshots/{barnards-star,epsilon-indi,wise-0855,rw-aur,r-dra}.json`: Rebuilt compact (`3.23 MB` total) live snapshots containing `astrometrySummary`, per-detector floor, and `lightCurve`.
- `data/catalog_cache.json`: Persisted Gaia DR3 + AllWISE reference-star overlays and `15″` neighbor lists across all 5 presets.
- `README.md`: Documented two-pass weighted linear error budget, per-detector floors, wing-fit/`< 3σ` caveats, verified 5-row table, 60-second demo script, and 3-sentence pitch.
- `PROGRESS.md`: Marked Final Close-Out items complete and recorded the final 5-row live verification table.
- `CHANGES.md`: Recorded all Phase E Final Close-Out file changes.

## Phase F — UI + AI Guide Pass (Explorer Mode, Grounded SPEX Guide, 3 Missions & Beginner Language)
- `src/App.tsx`: Changed default exploration mode to `Explorer` (`isScientistMode` false by default for new visitors), persisted toggle selection in `localStorage` (`spherex_explore_mode`), and kept `?mode=scientist|explorer` query parameter support.
- `src/science/targetFacts.ts`: Added curated verified facts-only knowledge base (`TARGET_FACTS_BY_CASE`, `SPHEREX_MISSION_FACTS`, `matchTargetFacts`, `BEGINNER_TERMS_MAP`) in English and Arabic for grounded AI explanations.
- `src/science/spexExplain.ts`: Added `POST /api/spex/explain` request/response contracts, plain-word DQ flag decoder (`decodeFlagsPlainWords`), strict system prompt builder (`buildSpexSystemInstruction`), canvas highlight clamping, and deterministic `"SPEX offline mode"` template generator (`buildOfflineSpexExplain`).
- `server.ts`: Added `POST /api/spex/explain` calling Gemini server-side via `GEMINI_MODEL` with strict JSON schema output, 12s timeout, 20 req/min per-IP rate limiting, SHA-256 context cache, and automatic `"SPEX offline mode"` fallback when no API key is configured or on error.
- `src/components/Explore/SpexGuidePanel.tsx`: Created responsive AI Guide panel (bottom sheet on mobile, side drawer on desktop) with Kid/Beginner/Scientist level selector, quick chips, clickable `ScienceTerm` chips, follow-up buttons, `"SPEX offline mode"` badge, and `"AI explanation. The data panel is the source of truth."` notice.
- `src/components/Explore/ExplorerMissions.tsx`: Created 3 interactive hands-on missions (`Catch a moving star`, `Meet a freezing brown dwarf`, `Moving or just noise?`) with reactive step checkmarks triggered by real user actions, 3-bullet `"What you learned"` completion cards, Discovery Postcard CTA, and `localStorage` sync with `SpaceExplorerLogModal`.
- `src/components/Explore/SpaceExplorerLogModal.tsx`: Synced milestone updates from `spex-missions-updated` events and surfaced completed hands-on Explorer mission count in the modal header.
- `src/components/TimeLens/FramePlayer.tsx`: Implemented clean `Explorer` UI (3 big buttons, plain sentence, friendly `Live from NASA` / `Saved copy from <date>` badge, plain-word honesty card, `"Learn the words"` & `"More tools"` links), canvas pixel tap-to-sky inspection, `"Explain this spot"` button, animated `"SPEX points here"` canvas highlights, and `onCanvasReady` export support while keeping all Scientist controls intact.
- `src/components/ExploreView.tsx`: Added 5 friendly target preset cards in Explorer mode, wired `FramePlayer` <-> `SpexGuidePanel` <-> `ExplorerMissions` state and callbacks, and preserved Scientist mode workspace unchanged.
- `src/utils/scientificGlossary.ts` & `src/utils/translations.ts`: Added beginner-friendly EN/AR terms (`epoch`, `centroid`, `wing_fit`, `saturated`, plus updated `image_subtraction`, `proper_motion`, `sigma`, `dq_flags`) and full EN/AR translation parity for Explorer UI, SPEX Guide, and Missions.
- `scripts/e2e_smoke.mjs`, `.env.example`, `README.md`, `PROGRESS.md`, `CHANGES.md`: Extended Playwright E2E smoke test (Explorer default, 3 buttons, canvas tap explain, Mission completion, Scientist controls, EN/AR toggle, `360px` zero-overflow check), documented `GEMINI_MODEL`, and updated docs.
