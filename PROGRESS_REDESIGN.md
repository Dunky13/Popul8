# Redesign Progress

## Status Log
- [x] Reviewed app architecture, step flow, and relevant UI components.
- [x] Applied requested skills context to implementation approach.
- [x] Reworked app shell/header with stronger workflow framing and integrated `logo.svg`.
- [x] Redesigned upload surfaces for CSV and SVG workflows.
- [x] Redesigned mapping surface with coverage and unmapped visibility.
- [x] Refreshed row selection and preview styling for visual consistency.
- [x] Updated `logo.svg` CSS while preserving core `rect` + `text` elements.
- [x] Moved logo asset to dedicated branding location and refined header brand placement.
- [x] Continued redesign through template editing and print sidebar surfaces.
- [x] Added step transition motion and staggered content reveal across workflow views.
- [x] Improved template editor empty state with direct navigation back to upload.
- [x] Refined template editor canvas and side-panel density for better focus and consistency.
- [x] Kept global app messages visible during mapping for continuous feedback.
- [x] Added placeholder search/unresolved filtering to mapping for faster conflict resolution.
- [x] Added row filtering and filtered bulk-select controls in selection step.
- [x] Added keyboard-first tooling in template editor (1/2/3 tools, +/- zoom, Enter apply, Esc cancel).
- [x] Added in-context quick shortcut hints in canvas toolbar and placeholder panel.
- [x] Improved mobile/coarse-pointer ergonomics across upload, mapping, selection, print sidebar, and editor controls.
- [x] Added a step-level "checklist + next action" flow coach for edit/mapping/selection/preview stages.
- [x] Added preview workflow guidance and quick actions for resize targeting (target all, clear targeting, print).
- [x] Added print layout presets and sheet-count summary chips in the sidebar for faster final setup.
- [x] Added template editor precision keyboard controls (Arrow nudge, Shift+Arrow resize) for faster region tuning.
- [x] Added automatic default placeholder naming when drawing new text/image regions.
- [x] Added detected placeholder filtering/search with duplicate-only mode and duplicate badges for fast editor triage.
- [x] Switched theme controls to explicit `light`/`dark`, while keeping first-load system detection when no preference exists.
- [x] Persisted user theme switches and updated app bootstrap to resolve initial theme before first paint.
- [x] Replaced text-based theme buttons with an icon selector (sun/moon) while preserving accessibility labels.
- [x] Removed Step 1 global flow-coach block to reduce stacked guidance panels.
- [x] Rebuilt Step 1 as a dedicated upload stage with horizontal CSV/SVG core panels, readiness chips, and direct continue action.
- [x] Removed the extra Step 1 intro panel, tightened header stat chips near brand text, and fixed upload stage centering/fill behavior.
- [x] Rearranged header controls to `2x2` stat badges left, progress center, and light/dark selector right.
- [x] Made the "Reuse Previous Run" card compact and right-aligned on desktop, with full-width fallback on smaller screens.
- [x] Repositioned "Reuse Previous Run" into the upload header right column under readiness chips to remove floating/awkward spacing.
- [x] Simplified "Reuse Previous Run" to a single compact action button (removed extra title/description card copy).
- [x] Integrated "Reuse Previous Run" into the readiness chip row with a tighter pill style for better visual fit.
- [x] Run ESLint and TypeScript/build verification after this correction pass.

## Verification
- `npm run lint` passed.
- `npm run build` passed.
- `npm test` passed (47/47).
