# Plan 2 Progress

## Snapshot (2026-03-03)
- Audit completed and findings documented in `FINDINGS2.md`.
- Improvement roadmap documented in `PLAN2.md`.
- Implementation completed for all plan items.
- Validation run completed after implementation:
  - `npm run lint`: pass
  - `npm run build`: pass
  - `npm run test`: pass (0 skipped)

## Workstream Status

| Workstream | Linked Findings | Status | Notes |
|---|---|---|---|
| P1.1 Sanitizer root coverage | D2-01 | Completed | Root + descendant sanitization implemented with no-DOM fallback. |
| P1.2 Browser security tests | D2-02 | Completed | Security tests now run in default test flow with no skips. |
| P2.1 DOM-scoped SVG extraction | D2-03 | Completed | Extraction moved to scoped parser utility with fallback path. |
| P2.2 Deterministic token replacement | D2-04 | Completed | Placeholder token replacement helper introduced and tested. |
| P3.1 Preview rerender reduction | D2-05 | Completed | `CharacterSheet` moved to selector-based store subscription. |
| P3.2 Print pathway unification | D2-06 | Completed | Keyboard print now routes through shared print request event. |
| P4.1 SW cache version automation | D2-07 | Completed | Build-time cache version injection added for service worker. |
| P4.2 ESLint config consolidation | D2-08 | Completed | Legacy `.eslintrc.cjs` removed; flat config remains canonical. |
| P4.3 Print style ownership cleanup | D2-09 | Completed | Runtime print injection reduced to dynamic layout/page rules. |
| P5.1 Card render pipeline cleanup | D2-10 | Completed | Consolidated `RecordCard` sizing helper + timer cleanup path. |
| P5.2 Preview render-path optimization | D2-11 | Completed | `PageGrid` now memoizes resize badges and uses `Set` membership checks. |
| P5.3 Placeholder fallback correctness | D2-12 | Completed | Preserved explicit empty values and added regression tests. |
| P6.1 Field-size baseline synchronization | D2-13 | Completed | Base-size collector now reconciles state for non-empty and empty transitions. |
| P6.2 Disconnected-node fitting guards | D2-14 | Completed | Added connectivity checks to delayed fitting and forced re-render callbacks. |
| P7.1 Resize debounce/reset race fix | D2-15 | Completed | Sidebar reset now clears pending timers/drafts and cleans executed timer refs. |
| P8.1 Sidebar resize helper unit coverage | D2-16 | Completed | Extracted pure helper logic and added targeted tests for reset mutation behavior. |
| P9.1 Selected-record identity stability | D2-17 | Completed | Selected records now keep original row-index IDs with direct unit tests. |
| P10.1 Previous-run CTA consistency | D2-18 | Completed | Previous-run availability now uses shared fallback resolution and reactive update listeners. |
| P11.1 Last-used CSV merge integrity | D2-19 | Completed | Merge workflows now persist full active CSV ID sets; helper tests validate dedupe and fallback behavior. |
| P12.1 Centralized selection event emission | D2-20 | Completed | `fileHistory` now emits selection-change events for meaningful selection/last-used/prune mutations; component-level manual dispatch paths simplified. |
| P13.1 Upload validation utility consolidation | D2-21 | Completed | Shared `fileValidation` utility now powers accept/size/custom validation across upload pathways. |
| P14.1 Selection vs last-used event channel split | D2-22 | Completed | `fileHistory` now emits dedicated selection and last-used events; listeners subscribe by concern to avoid cross-channel races. |
| P15.1 CSV ID dedupe normalization | D2-23 | Completed | Selection and last-used CSV IDs now normalize to unique existing IDs in stable order with duplicate-input regression coverage. |
| P16.1 Template upload hash-based ID persistence | D2-24 | Completed | SVG upload selection/last-used ID now derives from uploaded file hash instead of list-head ordering assumptions. |
| P17.1 CSV single-mode history selection consistency | D2-25 | Completed | History selection behavior extracted to helpers with strict single-select support when `multiple=false`; redundant post-process last-used writes removed. |
| P18.1 Drag/drop validation parity | D2-26 | Completed | Drag/drop accept filtering now shares normalized extension parsing with file-input validation. |
| P19.1 History hash source consolidation | D2-27 | Completed | `addFilesToHistoryWithHashes` now provides computed hashes; upload flows consume returned hashes directly. |
| P20.1 Same-file picker retry reliability | D2-28 | Completed | Shared upload hook now resets file input value before click to guarantee same-file reselection change events. |
| P21.1 MIME accept-rule consistency | D2-29 | Completed | Drag/drop and append upload paths now share full accept-rule matching (extensions + exact MIME + wildcard MIME). |
| P22.1 Deterministic SW cache versioning | D2-30 | Completed | Service-worker cache version now derives from deterministic emitted-output signature hashing instead of timestamp-only rotation. |
| P23.1 Validation message consistency | D2-31 | Completed | Shared file-validation mismatch messaging now derives accepted-type labels from normalized rules when raw accept strings are absent. |
| P24.1 Template validation flow consistency | D2-32 | Completed | Template validation warning/error handling is centralized with explicit prefix-based warning classification across upload/history paths. |

## Change Log
- 2026-03-03: Created `FINDINGS2.md`, `PLAN2.md`, and `PROGRESS2.md`.
- 2026-03-03: Captured baseline lint/build/test status before implementation work.
- 2026-03-03: Implemented all plan workstreams and revalidated lint/build/test.
- 2026-03-03: Completed follow-up hardening pass (memoized sheet rendering + print CSS deduplication + README updates).
- 2026-03-03: Completed cleanup pass (removed dead print/offline state, narrowed upload store subscription, simplified template apply API).
- 2026-03-03: Added keyboard shortcut helper + unit tests for managed print shortcut routing.
- 2026-03-03: Added keyboard key normalization (`P`/`p` parity), timeout cleanup in `CharacterSheet`, and consolidated App store subscription.
- 2026-03-03: Reduced editor parser churn in placeholder update flow and deduplicated upload file validation logic.
- 2026-03-03: Centralized `StepId` typing, added upload progress timeout lifecycle cleanup, and hardened offline hook initialization for non-browser environments.
- 2026-03-03: Rebased continuation work on Popul8 rebrand state and revalidated (`lint`, `build`, `test`) against renamed record/card architecture.
- 2026-03-03: Consolidated `RecordCard` SVG sizing/timer flow and optimized `PageGrid` badge/selection computations.
- 2026-03-03: Fixed placeholder fallback semantics for explicit empty mapped values and added `tests/svgManipulator.test.ts` (test suite now 15 total, 0 skipped).
- 2026-03-03: Kept `PageGrid` field-size baseline state synchronized (including empty transitions) and hardened delayed SVG fitting against disconnected DOM nodes.
- 2026-03-03: Fixed `PrintSidebar` resize debounce/reset race by clearing per-field timers+drafts on reset and removing executed timer handles.
- 2026-03-03: Extracted sidebar resize mutation helpers to `resizeHelpers.ts` and added `tests/printSidebarResizeHelpers.test.ts` (test suite now 19 total, 0 skipped).
- 2026-03-03: Preserved selected-record IDs across selection changes in `useSelectedRecords` and added `tests/useSelectedRecords.test.ts` (test suite now 21 total, 0 skipped).
- 2026-03-03: Aligned previous-run CTA availability with fallback selection logic in `usePreviousRunLoader` and added `tests/usePreviousRunLoader.test.ts` (test suite now 23 total, 0 skipped).
- 2026-03-03: Fixed merged-upload `lastUsed` persistence in `FileUpload` using `csvSelectionHelpers.ts`; added `tests/csvSelectionHelpers.test.ts` (test suite now 26 total, 0 skipped).
- 2026-03-03: Centralized file-selection event emission in `fileHistory`, removed redundant manual dispatches, and added `tests/fileHistoryEvents.test.ts` (test suite now 29 total, 0 skipped).
- 2026-03-03: Consolidated upload validation into `fileValidation.ts` and added `tests/fileValidation.test.ts` (test suite now 34 total, 0 skipped).
- 2026-03-03: Split selection vs last-used mutation events (`file-selection-updated` vs `file-last-used-updated`) and updated listeners to use channel-specific refresh behavior.
- 2026-03-03: Normalized CSV selection/last-used IDs to deduplicated existing IDs and extended `tests/fileHistoryEvents.test.ts` for duplicate-input and duplicate-upload ordering cases.
- 2026-03-03: Updated `TemplateUpload` to persist uploaded template IDs by content hash and tightened selection sync state updates to no-op on unchanged values.
- 2026-03-03: Added `historySelectionHelpers.ts` + `tests/historySelectionHelpers.test.ts` and aligned CSV history UI behavior with single-file mode semantics (test suite now 38 total, 0 skipped).
- 2026-03-03: Added drag/drop accept normalization utilities (`dragDropUtils.ts`) and tests (`tests/dragDropUtils.test.ts`) to align drop filtering with file-input validation.
- 2026-03-03: Added `addFilesToHistoryWithHashes` and updated CSV/SVG upload flows to reuse returned hash IDs instead of re-hashing files.
- 2026-03-03: Updated shared upload click handler to reset input value before picker open, enabling reliable same-file retries (test suite now 41 total, 0 skipped).
- 2026-03-03: Expanded accepted-file rule parity to MIME and wildcard MIME matching across drag/drop, append, and shared validation paths; simplified drop accept normalization and updated tests (`tests/fileValidation.test.ts`, `tests/dragDropUtils.test.ts`).
- 2026-03-03: Updated Vite SW cache-version plugin to derive version from bundle-signature hash for deterministic cache rotation tied to build output changes (test suite now 43 total, 0 skipped).
- 2026-03-03: Strengthened SW cache-version signature to hash deterministic emitted output metadata/content, and normalized accepted-type mismatch labels in shared file-validation utility with new regression coverage (`tests/fileValidation.test.ts`) (test suite now 44 total, 0 skipped).
- 2026-03-03: Added shared `templateValidation` utility and refactored `TemplateUpload` to use one warning/error handling path; added `tests/templateValidation.test.ts` for prefix warning classification and error propagation (test suite now 47 total, 0 skipped).
