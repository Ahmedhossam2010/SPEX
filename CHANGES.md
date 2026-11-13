# SPEX — Changes Log (No-Git Workspace Sync)

## Phase A — UI Corrections (Complete, Lint & Tests Verified)
- `src/App.tsx`: Reverted default landing route to `'home'` while preserving `?target=`, `?case=`, `?ra=&dec=`, `?band=`, `?detector=`, `?fov=` deep links into `'explore'`, and passed `activeCaseId` for immediate one-click preset loading.
- `src/components/HomeView.tsx`: Added primary `"Open Explorer"` CTA, compact 5-target challenge preset bar, and non-blocking collapsible SPEX Cat Guide card.
- `src/components/Explore/SpexCompanion.tsx`: Updated bilingual EN/AR hints, proactive tips, quick questions, and fallback guidance for the A3/A4 controls and reserved slots.
- `src/components/Explore/SpexGuidedTour.tsx`: Updated EN/AR guided tour steps to reflect A3 progressive disclosure and A4 WiseView control bar and slots.
- `src/components/ExploreView.tsx`: Restored SPEX Companion toggle with `SpexPortrait`, moved FOV selector to `FramePlayer` Advanced drawer, wrapped `AladinLitePanel` in a collapsible labeled slot with honest empty state, and wired `activeCaseId` and modal triggers.
- `src/components/TimeLens/FramePlayer.tsx`: Implemented A3 default bar + collapsed `localStorage`-persisted `Advanced` drawer (`Display`, `Overlays`, `Analysis`, `Export`), A4 WiseView control bar with keyboard shortcuts (`Space`, `ArrowLeft`/`ArrowRight`, `L`, `B`), full ARIA/`prefers-reduced-motion` support, and collapsible reserved slots (Frame Metadata Strip, Centroid vs Time Plot, Measured Spectrum).
- `src/utils/translations.ts`: Added matching EN & AR translation keys for Phase A controls, sections, and reserved slots.
