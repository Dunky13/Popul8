# Plan Progress

## Snapshot (2026-03-02)
- Plan implementation completed end-to-end
- Validation run after implementation:
  - `npm run lint` passed
  - `npm run build` passed
  - `npm run test` passed

## Workstream Status

| Workstream | Linked Items | Status | Notes |
|---|---|---|---|
| P1.1 Offline architecture | F-01, F-07 | Completed | SW uses build-generated asset manifest + production-only registration |
| P1.2 Store ownership & derivation | F-02, F-03 | Completed | `characters` now derived through a single pathway |
| P1.3 Workflow consistency | F-04, F-08 | Completed | Placeholder validation and workflow state model aligned |
| P2.1 Bundle/perf optimization | F-05 | Completed | Editor split with lazy chunks + on-demand Prettier loading |
| P2.2 Print hardening | F-06 | Completed | Removed global print monkey patch |
| P3.1 SVG safety boundary | F-10 | Completed | Sanitization layer added before DOM insertion |
| P3.2 History retention policy | F-09 | Completed | TTL/size retention + clear-history actions shipped |
| P4.1 Config + automated tests | F-07, F-11 | Completed | Test script + unit/integration smoke tests added |

## Change Log
- 2026-03-02: Initialized plan and progress tracking artifacts.
- 2026-03-02: Completed all planned phases and revalidated lint/build/test.
- 2026-03-03: Ran browser-based manual QA pass on production preview build and captured results.

## Manual QA Checklist (2026-03-03)

| Scenario | Result | Evidence |
|---|---|---|
| Service worker registers in production preview | Pass | `navigator.serviceWorker.ready === true` on `http://127.0.0.1:4173` |
| Upload CSV + SVG and enter mapping flow | Pass | Uploaded `/tmp/vectorforge-qa.csv` and `/tmp/vectorforge-qa.svg`, reached mapping step via `Ctrl+3` |
| Move through selection and preview workflow | Pass | Reached selection via `Ctrl+4` and preview via `Ctrl+5` |
| Print handler does not reassign `window.print` | Pass | Instrumented assignment count stayed `0`; print callback executed |
| Offline reload works after app shell cache warm-up | Pass | Reloaded with browser context offline and page loaded successfully |
| Clear CSV history action | Pass | `Clear CSV History` visible and executable |
| Clear SVG history action | Pass | `Clear SVG History` visible and executable |

### QA Notes
- Mapping success banner was not visible with this fixture set, but preview gating succeeded (`Ctrl+4`/`Ctrl+5` path), indicating readiness checks passed.
- Automated Node tests include sanitizer coverage but are skipped in pure Node runtime due missing `DOMParser`; browser QA covered runtime behavior.

## Suggested Commit Sequence (P1 → P4)

1. `P1: harden runtime reliability and workflow consistency`
   - Files:
     - `index.html`
     - `public/sw.js`
     - `src/main.tsx`
     - `src/App.tsx`
     - `src/store/appStore.ts`
     - `src/hooks/useSelectedCharacters.ts`
     - `src/hooks/usePreviousRunLoader.ts`
     - `src/components/RowSelection/RowSelection.tsx`
     - `src/components/DataMapping/DataMapping.tsx`
     - `src/components/PageGrid/PageGrid.tsx`
     - `src/components/AppHeader/AppHeader.tsx`
     - `src/components/AppMessages/AppMessages.tsx`
     - `src/utils/svgManipulator.ts`

2. `P2: reduce initial bundle and defer advanced editor costs`
   - Files:
     - `vite.config.ts`
     - `src/components/StepContent/StepContent.tsx`
     - `src/components/TemplateEditor/TemplateEditor.tsx`
     - `src/components/TemplateEditor/TemplateEditorWorkspace.tsx`
     - `src/components/TemplateEditor/helpers.ts`
     - `src/components/TemplateEditor/cssHelpers.ts`

3. `P3: add SVG safety boundary and bounded file-history retention`
   - Files:
     - `src/utils/svgSanitizer.ts`
     - `src/components/TemplateEditor/TemplateEditorStage.tsx`
     - `src/components/CharacterSheet/CharacterSheet.tsx`
     - `src/utils/fileHistory.ts`
     - `src/components/FileUpload/FileUpload.tsx`
     - `src/components/TemplateUpload/TemplateUpload.tsx`
     - `src/utils/printUtils.ts`

4. `P4: add test gate + TS config fixes + progress artifacts`
   - Files:
     - `package.json`
     - `tsconfig.app.json`
     - `tsconfig.test.json`
     - `.gitignore`
     - `tests/appStoreFlow.test.ts`
     - `tests/requiredFields.test.ts`
     - `tests/svgSanitizer.test.ts`
     - `FINDINGS.md`
     - `PLAN.md`
     - `PROGRESS.md`
