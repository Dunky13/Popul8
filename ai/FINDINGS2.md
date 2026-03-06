# System Audit Findings (2026-03-03)

## Scope
- React + Vite architecture
- SVG parsing/editing/rendering pipeline
- Print and offline runtime behavior
- Performance and maintainability
- Quality gates and test coverage

## Validation Snapshot
- `npm run lint`: pass
- `npm run build` (includes TypeScript project build): pass
- `npm run test`: pass (0 skipped)

## Findings

### D2-01 (P0) - SVG sanitizer does not sanitize root `<svg>` attributes
- Evidence:
  - Sanitization iterates `svg.querySelectorAll("*")`, which excludes the root `<svg>` element (`src/utils/svgSanitizer.ts:40`).
  - The same sanitizer is trusted before direct DOM injection (`src/components/TemplateEditor/TemplateEditorStage.tsx:145`, `src/components/TemplateEditor/TemplateEditorStage.tsx:152`).
  - Current test intends to assert root `onload` stripping, but is skipped in CI (`tests/svgSanitizer.test.ts:7`, `tests/svgSanitizer.test.ts:10`).
- Impact:
  - Event-handler attributes on the SVG root can survive sanitization.
  - This weakens the security boundary for uploaded/edited SVG content.
- Recommendation:
  - Sanitize both root and descendants (`[svg, ...svg.querySelectorAll("*")]`).
  - Add an explicit attribute allowlist for root-level attributes.

### D2-02 (P1) - Sanitizer security behavior is not actually tested in current test runtime
- Evidence:
  - Sanitizer test is conditionally skipped when `DOMParser` is unavailable (`tests/svgSanitizer.test.ts:7`).
  - Test script runs in Node test runner (`package.json:11`) where this case occurs.
- Impact:
  - Security-critical sanitizer regressions can merge undetected.
- Recommendation:
  - Add browser-based tests (e.g., Playwright/Vitest browser mode) for sanitizer behavior and stage rendering.

### D2-03 (P1) - SVG parsing strategy has correctness drift for placeholders and IDs
- Evidence:
  - Placeholder extraction is string-scanning across full SVG source (`src/utils/svgManipulator.ts:88`) and is not scoped to renderable nodes.
  - ID extraction only matches double-quoted `id="..."` (`src/utils/svgManipulator.ts:131`) and misses single-quoted IDs.
- Impact:
  - False-positive placeholders can appear from non-render content.
  - Duplicate ID checks can fail for valid SVGs using single quotes, creating editor collisions.
- Recommendation:
  - Move placeholder and ID extraction to DOM-based traversal with explicit node/attribute scopes.

### D2-04 (P1) - Placeholder rename/update logic can miss replacements due stateful regex usage
- Evidence:
  - A global regex is reused with `.test()` in attribute loops (`src/components/TemplateEditor/placeholderActions.ts:64`, `src/components/TemplateEditor/placeholderActions.ts:69`).
  - The same pattern appears in snippet sync logic (`src/components/TemplateEditor/placeholderActions.ts:130`, `src/components/TemplateEditor/placeholderActions.ts:135`).
- Impact:
  - Token replacement can be inconsistent across multiple attributes/nodes in one pass.
- Recommendation:
  - Avoid `.test()` with global regex in loops, or reset `lastIndex` before each check.
  - Centralize token replacement in a deterministic helper with tests.

### D2-05 (P1) - `CharacterSheet` subscribes to entire Zustand store
- Evidence:
  - `CharacterSheet` calls `useAppStore()` without selector (`src/components/CharacterSheet/CharacterSheet.tsx:24`).
  - Preview renders many `CharacterSheet` instances (`src/components/PageGrid/PageGrid.tsx:227`).
- Impact:
  - Any unrelated store update can trigger many expensive rerenders.
- Recommendation:
  - Use selector subscriptions (`useAppStore(selector)`) and keep `CharacterSheet` reactive only to required state slices.

### D2-06 (P2) - Print behavior is split across two pathways with inconsistent guarantees
- Evidence:
  - Shortcut path calls `window.print()` directly (`src/hooks/useAppKeyboardShortcuts.ts:12`).
  - Main preview action uses `handlePrint` with injected sizing/cleanup flow (`src/utils/printUtils.ts:17`, `src/utils/printUtils.ts:37`).
- Impact:
  - Keyboard-initiated printing bypasses layout prep and readiness handling.
- Recommendation:
  - Route all print triggers through one shared print action.

### D2-07 (P2) - Service worker cache lifecycle relies on manual version bumps
- Evidence:
  - Cache key is hardcoded (`public/sw.js:1`, `public/sw.js:2`).
  - Cleanup only removes caches with different names (`public/sw.js:53`).
- Impact:
  - Cache invalidation depends on manual discipline and can drift across releases.
- Recommendation:
  - Inject build-specific cache version (build hash or timestamp) at build time.

### D2-08 (P3) - Lint configuration source of truth is ambiguous
- Evidence:
  - Legacy `.eslintrc.cjs` exists (`.eslintrc.cjs:1`).
  - Flat config exists (`eslint.config.js:1`) and lint script is generic `eslint .` (`package.json:9`).
- Impact:
  - Rule intent is less clear for maintainers and can cause config drift.
- Recommendation:
  - Keep one lint config system and remove/document the other.

### D2-09 (P3) - Print rules are duplicated in CSS and runtime-injected style
- Evidence:
  - Static print stylesheet defines page/layout rules (`src/styles/print.css:3`, `src/styles/print.css:40`).
  - Runtime print handler injects overlapping `@page` and grid rules (`src/utils/printUtils.ts:39`, `src/utils/printUtils.ts:70`).
- Impact:
  - Debugging print regressions is harder due to split ownership.
- Recommendation:
  - Define a single source of truth for print layout rules, with minimal runtime overrides.

### D2-10 (P2) - `RecordCard` had duplicated sizing/timer management pathways
- Evidence:
  - Identical SVG sizing/font override logic ran from both deferred-fit and `onLoad` paths.
  - Timer cleanup logic was split across multiple effects.
- Impact:
  - Higher maintenance overhead and greater risk of divergence across render paths.
- Recommendation:
  - Share one sizing helper and one timer cleanup strategy.

### D2-11 (P2) - `PageGrid` recomputed resize badge metadata inside per-card render loop
- Evidence:
  - Badge state was computed on-demand for each card during rendering.
  - Card selection checks used repeated `includes` lookups over selected IDs.
- Impact:
  - Additional render-time work scales with record count and resize-rule cardinality.
- Recommendation:
  - Precompute badge map once per render and use a `Set` for card selection membership checks.

### D2-12 (P1) - Placeholder value fallback semantics could override explicit empty values
- Evidence:
  - Placeholder replacement used `||` fallback behavior between template key and mapped column.
- Impact:
  - Intentionally empty mapped values could be replaced by fallback data unexpectedly.
- Recommendation:
  - Use key-presence checks rather than truthy/falsy fallback semantics.
  - Add regression tests for empty-value preservation.

### D2-13 (P2) - `PageGrid` field-size baseline state could remain stale after content changes
- Evidence:
  - Base-size collection only set state when non-empty sizes were found.
- Impact:
  - Sidebar base-size hints could lag behind actual preview state after template/data changes that remove all targets.
- Recommendation:
  - Always reconcile collected sizes against prior state (including transitions to empty).

### D2-14 (P2) - Post-render fitting retries could target disconnected SVG containers
- Evidence:
  - Deferred retries and forced re-render callbacks in `svgManipulator` did not guard against disconnected nodes.
- Impact:
  - Unnecessary delayed work after unmount/navigation and avoidable DOM operations on stale nodes.
- Recommendation:
  - Add `isConnected` guards before retry and forced re-render operations.

### D2-15 (P1) - Debounced resize timers could re-apply cleared values in `PrintSidebar`
- Evidence:
  - Field reset path did not clear pending per-field debounce timers.
  - Field reset path did not clear pending draft values.
- Impact:
  - A recently reset field could be re-applied by an already queued timer, creating user-visible value bounce.
- Recommendation:
  - Clear pending field timer and draft state during reset.
  - Remove timer references after execution to avoid stale timer bookkeeping.

### D2-16 (P2) - Sidebar resize-reset behavior lacked direct unit-level coverage
- Evidence:
  - Reset/debounce correctness depended on component behavior without isolated unit tests for rule/draft mutation logic.
- Impact:
  - Future refactors could regress reset semantics without immediate CI signal.
- Recommendation:
  - Extract pure resize helper functions and test them directly.

### D2-17 (P1) - Selected record IDs were re-indexed by selection position
- Evidence:
  - Selected records were rebuilt from a subset list and assigned IDs based on subset index order.
- Impact:
  - Per-record overrides keyed by record ID could drift when selected rows were added/removed/reordered.
- Recommendation:
  - Anchor selected-record IDs to original CSV row indices.
  - Add regression tests for ID stability across row selection changes.

### D2-18 (P2) - Previous-run CTA visibility diverged from loader fallback logic
- Evidence:
  - Previous-run button visibility relied on `lastUsed` values only.
  - Loader action supports fallback selection values when `lastUsed` is empty.
- Impact:
  - Reusable files could exist but CTA stayed hidden, blocking one-click reuse.
- Recommendation:
  - Resolve targets via shared last-used/fallback selection helper.
  - Keep CTA visibility reactive to file-selection history updates.

### D2-19 (P1) - CSV merge workflows persisted partial `lastUsed` selection
- Evidence:
  - In the add-files merge flow, persisted `lastUsed.csvIds` tracked only newly appended file hashes.
  - In the add-selected-to-current flow, persisted `lastUsed.csvIds` tracked only selected history IDs and omitted current active IDs.
- Impact:
  - "Use Previous Run" could restore only part of the active combined CSV dataset after merge operations.
- Recommendation:
  - Persist a deduplicated union of active + appended CSV IDs for both merge workflows.
  - Add unit tests for merge-order and fallback resolution semantics.

### D2-20 (P2) - File-history mutations lacked centralized selection-change event emission
- Evidence:
  - `usePreviousRunLoader` availability state depends on `"file-selection-updated"` notifications.
  - Core history mutation utilities (`setSelection`, `setLastUsed`, normalization after history pruning) did not consistently emit this event.
  - Components compensated with ad-hoc manual event dispatches in specific handlers.
- Impact:
  - Previous-run CTA visibility could become stale until unrelated state transitions occurred.
  - Event semantics were split across component codepaths, increasing drift risk.
- Recommendation:
  - Emit `"file-selection-updated"` centrally from `fileHistory` mutation points when normalized selection/last-used values change.
  - Add regression tests for event emission behavior and history-prune normalization.

### D2-21 (P2) - File validation rules diverged across upload pathways
- Evidence:
  - `useFileUpload` used normalized extension parsing for `accept` values, including comma-separated entries.
  - `FileUpload` add-to-existing flow used separate inline checks (`accept.replace(".", "")`) with different behavior and messaging.
- Impact:
  - Extension validation behavior could differ between initial upload and add-to-existing workflows.
  - Future validation rule updates risk drifting across duplicated logic branches.
- Recommendation:
  - Centralize file-validation logic (accept parsing + size checks + custom validator delegation) in a shared utility.
  - Add unit tests for extension normalization and validation outcomes.

### D2-22 (P1) - Selection-sync listeners consumed last-used updates via shared event channel
- Evidence:
  - `setLastUsed` and `setSelection` both emitted `"file-selection-updated"`.
  - Upload components subscribe to that event to mirror persisted selection into local UI state.
- Impact:
  - Last-used-only updates could trigger selection listeners while local selection state was still in-flight, creating state overwrite risk.
  - Event semantics mixed two independent concerns (selection and last-used), increasing coupling and race potential.
- Recommendation:
  - Split mutation notifications into distinct channels (`file-selection-updated`, `file-last-used-updated`).
  - Keep selection listeners subscribed only to selection events and previous-run availability listeners subscribed to both.
  - Add regression tests for per-channel emission behavior.

### D2-23 (P2) - CSV selection and last-used IDs allowed duplicate entries
- Evidence:
  - CSV ID filtering retained order but did not deduplicate repeated IDs in selection/last-used normalization.
  - Callers could pass repeated IDs to `setSelection`/`setLastUsed`.
- Impact:
  - Redundant IDs increased normalization/event churn and risked inconsistent assumptions about unique active datasets.
- Recommendation:
  - Normalize CSV ID arrays to existing unique IDs while preserving first-seen order.
  - Add regression coverage for duplicate-ID normalization behavior.

### D2-24 (P1) - Template upload reused top-of-history ID instead of uploaded file hash
- Evidence:
  - SVG upload flow derived selected ID from `updated[0]?.id` after history write.
  - Re-uploading duplicate files does not reorder history entries, so list head can refer to a different template.
- Impact:
  - Last-used/selected SVG ID could drift from the actual uploaded template in duplicate-upload scenarios.
- Recommendation:
  - Resolve uploaded template ID from file hash and persist that ID directly.
  - Add regression coverage that duplicate uploads do not reorder history (to guard assumptions).

### D2-25 (P2) - CSV history selection behavior diverged when `multiple=false`
- Evidence:
  - History UI used checkbox toggles without single-select enforcement when `multiple=false`.
  - "Use Selected CSVs" fallback path processed one file in single mode but prior state updates could represent multi-selection intent.
- Impact:
  - UI selection state and actual processed dataset could diverge in single-file mode.
  - Last-used writes could drift from actual processed result when post-processing writes were unconditional.
- Recommendation:
  - Enforce single-selection semantics in history toggle/today-selection helpers when `multiple=false`.
  - Remove redundant post-processing `lastUsed` writes and rely on processor success paths.

### D2-26 (P2) - Drag-and-drop accept filtering diverged from file-input validation
- Evidence:
  - `useFileUpload` used normalized accept parsing supporting comma-separated values.
  - `useDragDrop` matched raw extension strings directly from `accept[]` entries, so comma-separated entries were treated as one unmatched token.
- Impact:
  - Drag-and-drop could reject files that file-input upload accepts for equivalent accept rules.
  - Validation behavior diverged across input channels.
- Recommendation:
  - Normalize drop accept entries through the same extension parser used by file-input validation.
  - Add unit tests for accept flattening/deduping and drop filtering behavior.

### D2-27 (P3) - Upload flows re-hashed files after history writes
- Evidence:
  - CSV/SVG upload flows called `addFilesToHistory` and then called `hashFiles` again to recover IDs.
  - History write path already computes hashes for dedupe and ID assignment.
- Impact:
  - Duplicate file reads/hashing increased upload overhead and spread ID-source logic across components.
- Recommendation:
  - Return computed hashes from history-write utilities and consume them directly in upload flows.
  - Keep hash identity source in one utility path.

### D2-28 (P2) - File picker did not reliably re-trigger for same-file reselection
- Evidence:
  - File input click flow did not reset the input value before opening picker.
- Impact:
  - Selecting the same file consecutively could fail to trigger `onChange`, making retries appear unresponsive.
- Recommendation:
  - Clear file input value before triggering the picker click.

### D2-29 (P2) - Accept-rule parity still diverged for MIME tokens across upload channels
- Evidence:
  - Drag-and-drop filtering accepted only extension matches and did not evaluate exact MIME or wildcard MIME rules.
  - CSV append validation path reused extension-only pre-parsed rules while `useFileUpload` moved to full accepted-rule parsing.
- Impact:
  - Inputs like `image/*` or `application/json` could be accepted by file-input flow but rejected by drag-and-drop/append pathways.
  - Upload behavior remained inconsistent after partial validation refactors.
- Recommendation:
  - Reuse one accepted-rule model (extensions + exact MIME + wildcard MIME) for drag/drop and append validation.
  - Add unit tests for wildcard and exact MIME accept cases.

### D2-30 (P3) - Service-worker cache versioning used timestamp-only rotation
- Evidence:
  - Build plugin generated cache version from current timestamp instead of output identity.
- Impact:
  - Cache names rotated on every build, even for identical assets, reducing cache efficiency.
  - Version values were not deterministic for equivalent output bundles.
- Recommendation:
  - Derive cache version from build output identity (bundle signature hash) so cache rotation tracks actual artifact changes.

### D2-31 (P3) - File-validation mismatch errors could surface ambiguous accepted-type labels
- Evidence:
  - `validateFileInput` mismatch messaging used raw `accept` string interpolation only.
  - Callers can provide pre-parsed accepted rules without a raw `accept` string.
- Impact:
  - Validation errors could show unclear accepted-type labels in shared utility usage.
- Recommendation:
  - Derive accepted-type error labels from normalized accepted rules when raw `accept` is absent.
  - Keep normalized label formatting consistent across extension, exact MIME, and wildcard MIME rules.

### D2-32 (P3) - Template validation warning/error handling was duplicated and loosely classified
- Evidence:
  - `TemplateUpload` implemented duplicate warning/error branching logic in both upload and history-load paths.
  - Warning detection used `includes("Warning:")` checks in each path.
- Impact:
  - Behavior could drift across template loading paths over time.
  - Loose warning classification increased risk of misclassifying messages containing `"Warning:"` outside prefix semantics.
- Recommendation:
  - Centralize template validation-message handling in one utility.
  - Use explicit prefix-based warning classification and add unit tests.

## Resolution Status (2026-03-03)
- D2-01: Resolved (root + descendant sanitization, including no-DOM fallback path).
- D2-02: Resolved (sanitizer security tests execute in default test run; no skips).
- D2-03: Resolved (DOM-scoped placeholder/ID extraction utility with fallback parsing).
- D2-04: Resolved (deterministic placeholder token replacement helper and tests).
- D2-05: Resolved (`CharacterSheet` converted to selector-based Zustand subscription).
- D2-06: Resolved (keyboard print now dispatches shared managed print pathway).
- D2-07: Resolved (service worker cache version injected at build time).
- D2-08: Resolved (legacy ESLint config removed, flat config retained).
- D2-09: Resolved (runtime print injection narrowed to dynamic layout/page sizing only).
- D2-10: Resolved (`RecordCard` sizing logic and timer cleanup consolidated).
- D2-11: Resolved (`PageGrid` now precomputes resize badges and uses `Set` membership checks).
- D2-12: Resolved (placeholder fallback semantics corrected; regression tests added).
- D2-13: Resolved (`PageGrid` base-size collection now reconciles state for both non-empty and empty transitions).
- D2-14: Resolved (`svgManipulator` fitting/re-render paths now guard disconnected nodes).
- D2-15: Resolved (`PrintSidebar` reset now clears pending field timers/drafts; executed timers are de-registered).
- D2-16: Resolved (extracted `PrintSidebar` resize helpers and added focused unit tests).
- D2-17: Resolved (`useSelectedRecords` now preserves original row-index IDs; regression tests added).
- D2-18: Resolved (`usePreviousRunLoader` now uses shared selection resolution and reactive CTA availability updates).
- D2-19: Resolved (`FileUpload` merge flows now persist merged active CSV IDs; helper tests cover dedupe and fallback behavior).
- D2-20: Resolved (`fileHistory` now centrally emits mutation events for normalized selection/last-used changes and prune flows).
- D2-21: Resolved (shared `fileValidation` utility now drives upload validation in both `useFileUpload` and CSV append flow; unit tests added).
- D2-22: Resolved (selection and last-used mutations now emit separate event channels; listeners updated to avoid cross-channel state races).
- D2-23: Resolved (CSV ID normalization now deduplicates while preserving order; regression tests cover duplicate-input behavior).
- D2-24: Resolved (`TemplateUpload` now resolves persisted uploaded template ID from file hash, not list-head ordering; duplicate-order behavior tested).
- D2-25: Resolved (CSV history selection extracted to helpers with single-select mode support; redundant post-process `lastUsed` write removed).
- D2-26: Resolved (drag-and-drop accept filtering now uses shared normalized extension parsing; unit tests added).
- D2-27: Resolved (`addFilesToHistoryWithHashes` now returns computed hashes and upload flows consume them directly).
- D2-28: Resolved (`useFileUpload` now resets input value before click, enabling same-file reselection).
- D2-29: Resolved (drag/drop and append workflows now use shared accepted-rule matching, including exact/wildcard MIME rules; validation tests expanded).
- D2-30: Resolved (service-worker cache version now derives from deterministic emitted-output signature hashing instead of timestamp-only rotation).
- D2-31: Resolved (`validateFileInput` now formats accepted-type labels from normalized rules when raw `accept` is omitted).
- D2-32: Resolved (template validation-message handling is centralized in `templateValidation` utility with prefix-based warning classification and unit coverage).
