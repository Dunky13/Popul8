# Improvement Plan

## Plan Principles
- Address production reliability before feature/UI expansion
- Reduce architectural ambiguity (single sources of truth)
- Improve performance through targeted code splitting and subscription control
- Add safety and quality gates to prevent regressions

## Execution Status (2026-03-02)
- P1.1: Completed
- P1.2: Completed
- P1.3: Completed
- P2.1: Completed
- P2.2: Completed
- P3.1: Completed
- P3.2: Completed
- P4.1: Completed

## Phase 1 - Reliability Foundations (Highest Priority)

### P1.1 Fix offline architecture (F-01, F-07)
- Tasks:
  - Replace static SW precache list with build-generated asset list
  - Register service worker in app runtime only for production builds
  - Add cache versioning and verified activation/update flow
- Exit criteria:
  - Service worker installs/activates in production build without failed fetches
  - Offline reload of cached app shell succeeds

### P1.2 Unify character derivation and store ownership (F-02, F-03)
- Tasks:
  - Define one derivation pathway for `characters` from `csvData` and `selectedRowIndices`
  - Remove duplicate `setCharacters` update paths from upload/selection/reload flows
  - Convert broad Zustand subscriptions to selectors for high-churn components
- Exit criteria:
  - No duplicate character derivation effects remain
  - UI behavior is unchanged across upload, selection, and previous-run restore

### P1.3 Align template validation with intended workflow (F-04, F-08)
- Tasks:
  - Convert zero-placeholder validation from error to warning
  - Clean up or implement dead `"print"` state semantics in workflow model
- Exit criteria:
  - Uploading placeholder-free SVG is possible
  - Workflow state machine has no unreachable states

## Phase 2 - Performance and UX Stability

### P2.1 Reduce initial bundle and defer advanced editor cost (F-05)
- Tasks:
  - Lazy-load `TemplateEditor` and advanced panels
  - Dynamically import Prettier formatting modules on demand
  - Rebuild and measure chunk size deltas
- Exit criteria:
  - Initial JS payload reduced materially from current baseline
  - Formatting features still work correctly when invoked

### P2.2 Harden print pipeline behavior (F-06)
- Tasks:
  - Remove `window.print` monkey patching
  - Move print-specific styling to deterministic CSS/media-print strategy
  - Validate output on target browsers/page sizes
- Exit criteria:
  - Print flow works without global API overrides
  - No post-print residual style/listener side effects

## Phase 3 - Safety and Data Governance

### P3.1 Add SVG sanitization boundary (F-10)
- Tasks:
  - Add sanitize step before DOM insertion for preview/editor surfaces
  - Strip script tags, event attributes, and unsafe external references
- Exit criteria:
  - Unsafe SVG payloads are neutralized before render
  - Valid editable SVG content still round-trips correctly

### P3.2 Add storage retention and controls (F-09)
- Tasks:
  - Enforce max count/max size/TTL retention policy for file history
  - Add explicit clear-history action and migrate existing data safely
- Exit criteria:
  - localStorage usage is bounded
  - History UX remains functional for normal usage

## Phase 4 - Quality Gates

### P4.1 Fix TS config drift and add tests (F-07, F-11)
- Tasks:
  - Correct `tsconfig.app.json` alias placement (`compilerOptions.paths`)
  - Add unit tests for parsing/mapping/store transitions
  - Add one integration smoke test for core flow
- Exit criteria:
  - Type/lint/test commands are part of regular development workflow
  - Core flow regressions are caught automatically
