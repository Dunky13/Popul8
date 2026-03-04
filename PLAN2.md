# Improvement Plan 2

## Objective
Address the highest-risk discrepancies first (security and correctness), then improve runtime consistency, performance, and maintainability.

## Execution Status (2026-03-03)
- P1.1: Completed
- P1.2: Completed
- P2.1: Completed
- P2.2: Completed
- P3.1: Completed
- P3.2: Completed
- P4.1: Completed
- P4.2: Completed
- P4.3: Completed
- P5.1: Completed
- P5.2: Completed
- P5.3: Completed
- P6.1: Completed
- P6.2: Completed
- P7.1: Completed
- P8.1: Completed
- P9.1: Completed
- P10.1: Completed
- P11.1: Completed
- P12.1: Completed
- P13.1: Completed
- P14.1: Completed
- P15.1: Completed
- P16.1: Completed
- P17.1: Completed
- P18.1: Completed
- P19.1: Completed
- P20.1: Completed
- P21.1: Completed
- P22.1: Completed
- P23.1: Completed
- P24.1: Completed

## Priority Mapping
- Phase 1: D2-01, D2-02
- Phase 2: D2-03, D2-04
- Phase 3: D2-05, D2-06
- Phase 4: D2-07, D2-08, D2-09
- Phase 5: D2-10, D2-11, D2-12
- Phase 6: D2-13, D2-14
- Phase 7: D2-15
- Phase 8: D2-16
- Phase 9: D2-17
- Phase 10: D2-18
- Phase 11: D2-19
- Phase 12: D2-20
- Phase 13: D2-21
- Phase 14: D2-22
- Phase 15: D2-23
- Phase 16: D2-24
- Phase 17: D2-25
- Phase 18: D2-26
- Phase 19: D2-27
- Phase 20: D2-28
- Phase 21: D2-29
- Phase 22: D2-30
- Phase 23: D2-31
- Phase 24: D2-32

## Phase 1 - Security Boundary Hardening

### P1.1 Fix sanitizer root coverage (D2-01)
- Tasks:
  - Sanitize root `<svg>` attributes in addition to descendants.
  - Add explicit denylist/allowlist checks for event and URL attributes.
  - Verify `TemplateEditorStage` preview path stays safe after update.
- Exit criteria:
  - Root event handlers (e.g. `onload`) are removed in sanitizer output.
  - Unsafe SVG content cannot execute when previewed or rendered.

### P1.2 Add executable security tests in browser runtime (D2-02)
- Tasks:
  - Add browser-based sanitizer tests that run in CI.
  - Add a regression test for root-attribute stripping.
  - Add one integration test for editor preview injection path.
- Exit criteria:
  - Sanitizer tests are no longer skipped under default CI test command.
  - CI fails when sanitizer regressions are introduced.

## Phase 2 - SVG Parsing and Editor Correctness

### P2.1 Replace string-heuristic extraction with DOM-scoped extraction (D2-03)
- Tasks:
  - Parse SVG once and extract placeholders only from intended text/attribute contexts.
  - Support single-quoted and double-quoted `id` attributes.
  - Add fixture tests for style/comment/script edge cases.
- Exit criteria:
  - Placeholder and ID extraction match expected fixtures across quoting/styles.
  - Editor duplicate-ID prevention works for both quote styles.

### P2.2 Fix token replacement determinism in placeholder actions (D2-04)
- Tasks:
  - Remove stateful global-regex `.test()` pattern from replacement loops.
  - Introduce a single helper for placeholder token replacement.
  - Add tests for multi-attribute/multi-node rename scenarios.
- Exit criteria:
  - Renames and snippet updates are deterministic and complete in all tested cases.

## Phase 3 - Performance and UX Consistency

### P3.1 Reduce preview rerender surface (D2-05)
- Tasks:
  - Convert `CharacterSheet` to selector-based store reads.
  - Optionally memoize `CharacterSheet` by stable props.
  - Measure rerender count before/after during print-layout and editor interactions.
- Exit criteria:
  - Unrelated store updates do not rerender all visible sheets.
  - Preview interaction latency is measurably lower under larger datasets.

### P3.2 Unify print entry points (D2-06)
- Tasks:
  - Route keyboard print shortcut through shared print action.
  - Keep one readiness gate and one print preparation path.
  - Add a test/checklist item for keyboard-initiated print behavior.
- Exit criteria:
  - Toolbar and keyboard print produce identical layout and cleanup behavior.

## Phase 4 - Runtime and Tooling Maintainability

### P4.1 Automate cache versioning in service worker build (D2-07)
- Tasks:
  - Inject build-specific cache version into `sw.js` at build time.
  - Confirm old cache cleanup on version changes.
- Exit criteria:
  - New deploys automatically rotate cache names and purge stale caches.

### P4.2 Consolidate lint config source of truth (D2-08)
- Tasks:
  - Keep flat config as primary (`eslint.config.js`) and remove/retire legacy config.
  - Document expected lint command and config behavior.
- Exit criteria:
  - Repository has one canonical ESLint config path.

### P4.3 Consolidate print style ownership (D2-09)
- Tasks:
  - Move static print rules and runtime page-size logic into a clearer contract.
  - Keep runtime style injection minimal and explicit.
- Exit criteria:
  - Print behavior is traceable to one primary style source with minimal overrides.

## Phase 5 - Post-Rebrand Continuation Cleanup

### P5.1 Reduce duplicate fit/cleanup logic in card rendering (D2-10)
- Tasks:
  - Consolidate repeated SVG sizing and font-size override logic in `RecordCard`.
  - Centralize deferred/on-load timer cleanup to one lifecycle path.
- Exit criteria:
  - `RecordCard` has one clear timer cleanup pathway and one shared sizing helper.

### P5.2 Precompute card-resize badge state per render (D2-11)
- Tasks:
  - Precompute resize badge metadata once per render cycle in `PageGrid`.
  - Use a `Set` for selection checks to avoid repeated linear scans in card loops.
- Exit criteria:
  - Per-card render path no longer recomputes badge state and selection via repeated scans.

### P5.3 Preserve explicit empty mapped values in placeholder replacement (D2-12)
- Tasks:
  - Replace `||` fallback semantics with key-presence checks in placeholder value selection.
  - Add regression tests for explicit-empty and fallback-to-column behavior.
- Exit criteria:
  - Empty mapped values remain empty after replacement.
  - Regression tests cover both empty-value and fallback cases.

## Phase 6 - Preview Lifecycle Robustness

### P6.1 Keep field-size baselines synchronized to preview state (D2-13)
- Tasks:
  - Reconcile collected field-size map against previous state on every collection pass.
  - Ensure empty-state transitions clear stale base-size hints.
- Exit criteria:
  - Field-size baseline state reflects current preview DOM, including empty transitions.

### P6.2 Guard delayed SVG fitting work against disconnected nodes (D2-14)
- Tasks:
  - Add connectivity guards to post-render fitting retries.
  - Add connectivity guards to forced SVG re-render callbacks.
- Exit criteria:
  - Delayed fit/re-render callbacks no-op when target nodes are disconnected.

## Phase 7 - Resize Interaction Correctness

### P7.1 Prevent debounced field reset races in sidebar resize controls (D2-15)
- Tasks:
  - Clear pending debounce timer when resetting a field.
  - Clear pending draft value when resetting a field.
  - Remove completed timer handles from internal timer registry.
- Exit criteria:
  - Reset actions cannot be undone by queued debounce callbacks.
  - Timer registry reflects only active timers.

## Phase 8 - Interaction Testability

### P8.1 Add isolated unit coverage for sidebar resize helpers (D2-16)
- Tasks:
  - Extract pure helper functions for draft/rule mutation in sidebar reset flows.
  - Add unit tests for absent-field no-op, field deletion, global override removal, and per-card prune behavior.
- Exit criteria:
  - Sidebar reset mutation rules are directly validated by unit tests.

## Phase 9 - Record Identity Stability

### P9.1 Preserve selected-record identity across selection changes (D2-17)
- Tasks:
  - Keep selected record IDs keyed to source CSV row indices instead of selection-order indices.
  - Add unit tests for stable IDs and out-of-range row filtering.
- Exit criteria:
  - Record-level settings tied to IDs remain stable when row selection changes.

## Phase 10 - Previous-Run UX Consistency

### P10.1 Align previous-run CTA visibility with actionable fallback logic (D2-18)
- Tasks:
  - Use one shared resolver for previous-run target selection.
  - Make CTA availability update when file-selection history changes.
  - Add unit tests for selection resolution precedence.
- Exit criteria:
  - CTA visibility matches actionable previous-run state.

## Phase 11 - Last-Used Selection Integrity

### P11.1 Preserve full active CSV selection after merge workflows (D2-19)
- Tasks:
  - Persist merged active CSV ID sets (existing active + newly appended) in both add-files and add-selected merge paths.
  - Use a shared helper to normalize ID merge/fallback behavior and dedupe ordering.
  - Add regression tests for merge ordering and fallback baseline selection rules.
- Exit criteria:
  - `lastUsed.csvIds` matches the full active CSV dataset after merge operations.
  - Regression tests prevent partial-selection persistence regressions.

## Phase 12 - Selection Event Consistency

### P12.1 Centralize file-selection change events in history utilities (D2-20)
- Tasks:
  - Emit `"file-selection-updated"` from `fileHistory` when normalized selection or last-used values change.
  - Emit events when history normalization prunes stale selections/last-used IDs.
  - Remove redundant component-level manual dispatches where utility-level emission already applies.
  - Add regression tests for event emission and no-op mutation behavior.
- Exit criteria:
  - Previous-run availability updates reliably after selection/last-used/history mutations.
  - Event ownership is centralized in utilities instead of ad-hoc component dispatches.

## Phase 13 - Upload Validation Consistency

### P13.1 Share file-validation rules across upload workflows (D2-21)
- Tasks:
  - Extract shared file-validation utility for accept parsing, max-size checks, and custom validator delegation.
  - Replace duplicated inline validation in CSV add-to-existing flow with shared validation path.
  - Reuse the shared utility inside `useFileUpload` to keep all upload paths consistent.
  - Add unit tests for extension normalization and validation result coverage.
- Exit criteria:
  - Initial upload and append workflows enforce the same validation rules and messages.
  - Validation changes require updates in one utility instead of duplicated branches.

## Phase 14 - Event Channel Separation

### P14.1 Split selection and last-used mutation events (D2-22)
- Tasks:
  - Emit distinct events for selection mutations and last-used mutations in `fileHistory`.
  - Update listeners to subscribe only to relevant channels (`selection` sync vs previous-run availability refresh).
  - Add regression tests verifying channel-specific emission semantics and no-op behavior.
- Exit criteria:
  - Selection listeners are not triggered by last-used-only changes.
  - Previous-run availability still updates for both selection and last-used changes.

## Phase 15 - ID Normalization Integrity

### P15.1 Deduplicate persisted CSV selection/last-used IDs (D2-23)
- Tasks:
  - Normalize CSV ID arrays to unique existing IDs while preserving first-seen order.
  - Apply the normalization across selection and last-used read/write pathways.
  - Add regression tests for duplicate-ID no-op behavior.
- Exit criteria:
  - Persisted CSV selection and last-used arrays never contain duplicates.
  - Repeated duplicate writes do not trigger additional mutation events.

## Phase 16 - Template Upload ID Correctness

### P16.1 Resolve uploaded SVG ID from file hash instead of list ordering (D2-24)
- Tasks:
  - Compute uploaded SVG hash in template upload flow and persist that ID as selected/last-used.
  - Avoid deriving upload identity from history list-head ordering.
  - Add regression test covering duplicate-upload history ordering behavior.
- Exit criteria:
  - Uploaded template selection/last-used IDs match the actual uploaded file content hash.
  - Duplicate uploads cannot redirect selection to unrelated history entries.

## Phase 17 - Single-Mode Selection Consistency

### P17.1 Align CSV history selection behavior for single-file mode (D2-25)
- Tasks:
  - Extract history selection helpers for toggle/today-selection behavior.
  - Enforce single-selection semantics when `multiple=false`.
  - Remove redundant post-processing `lastUsed` writes and rely on processor success pathways.
  - Add helper-level unit tests for multi vs single selection behavior.
- Exit criteria:
  - CSV history UI selection semantics match the configured `multiple` mode.
  - Last-used updates reflect successful processed results only.

## Phase 18 - Drag/Drop Validation Parity

### P18.1 Align drag-and-drop accept filtering with file-input validation (D2-26)
- Tasks:
  - Normalize drop accept entries with shared extension parsing.
  - Update drop-file filtering logic to consume normalized accept extensions.
  - Add unit tests for flattened/deduped accept entries and filtered-file outcomes.
- Exit criteria:
  - Drag-and-drop and file-input upload channels accept/reject the same file sets for equivalent accept config.

## Phase 19 - History Hash Source Consolidation

### P19.1 Reuse history-write hashes in upload flows (D2-27)
- Tasks:
  - Add a history-write API that returns both updated items and computed file hashes.
  - Update CSV and SVG upload flows to consume returned hashes instead of re-hashing files.
- Exit criteria:
  - Upload flows no longer call `hashFiles` after history writes to recover IDs.
  - File-hash identity remains sourced from one utility path.

## Phase 20 - File Picker Retry Reliability

### P20.1 Enable same-file reselection retries in upload hook (D2-28)
- Tasks:
  - Reset file input value before triggering file-picker click in shared upload hook.
- Exit criteria:
  - Consecutive same-file selections reliably trigger upload processing.

## Phase 21 - MIME Accept-Rule Consistency

### P21.1 Align MIME accept matching across drag/drop and append workflows (D2-29)
- Tasks:
  - Reuse shared accepted-rule parsing (extensions + exact MIME + wildcard MIME) in drag/drop filtering.
  - Update append-upload validation path to pass shared accepted rules instead of extension-only subsets.
  - Expand unit coverage for wildcard and exact MIME accept scenarios.
- Exit criteria:
  - Drag/drop, initial upload, and append flows apply equivalent accept behavior for MIME and extension inputs.

## Phase 22 - Deterministic SW Cache Versioning

### P22.1 Use bundle-identity hash for service-worker cache version (D2-30)
- Tasks:
  - Replace timestamp-based cache version generation with hash derived from build bundle signature.
  - Keep cache-version injection behavior unchanged for service-worker placeholder replacement.
- Exit criteria:
  - Equivalent bundles produce stable cache version values.
  - Cache version rotates when build output identity changes.

## Phase 23 - Validation Message Consistency

### P23.1 Normalize accepted-type error labels in shared validation utility (D2-31)
- Tasks:
  - Build accepted-type labels from normalized rule tokens when raw `accept` input is unavailable.
  - Keep label formatting aligned for extensions, exact MIME tokens, and wildcard MIME tokens.
  - Add regression tests for mismatch messaging in accepted-rules-only validation paths.
- Exit criteria:
  - File-validation mismatch messaging is clear and stable when callers pass pre-parsed accepted rules.

## Phase 24 - Template Validation Flow Consistency

### P24.1 Centralize template validation warning/error handling (D2-32)
- Tasks:
  - Extract shared template validation-message handler used by both template upload and history-load paths.
  - Replace loose warning detection with prefix-based classification.
  - Add focused unit tests for warning handling and thrown-error behavior.
- Exit criteria:
  - Template validation-message handling logic exists in one utility path with deterministic warning classification.

## Verification Gates (applies to all phases)
- `npm run lint` passes.
- `npm run build` passes.
- `npm run test` passes with no skipped security-critical tests.
