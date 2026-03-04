# System Audit Findings (2026-03-02)

## Scope
- React + Vite frontend architecture
- State management and workflow consistency
- Build/runtime performance
- Offline/print pipeline reliability
- Safety and maintainability

## Findings

### F-01 (P0) - Production service worker precache list is invalid
- Evidence:
  - `public/sw.js` precaches `/vite.svg` and `/src/*.tsx` (`public/sw.js:2-10`)
  - `cache.addAll` in install phase fails the install when any asset is missing (`public/sw.js:13-18`)
  - Production output has hashed assets in `dist/assets/*` and no `/src/*.tsx`
- Impact:
  - Service worker install can fail in production, breaking offline behavior
  - App claims offline support but can silently run without a valid active worker
- Recommendation:
  - Replace manual static list with build-generated asset manifest (e.g., `vite-plugin-pwa` or custom manifest injection)
  - Version cache keys per build and add stale-cache cleanup strategy

### F-02 (P1) - Zustand subscriptions are too broad and trigger unnecessary rerenders
- Evidence:
  - Multiple components call `useAppStore()` and destructure many keys directly (`src/App.tsx:18-22`, `src/components/PageGrid/PageGrid.tsx:17-26`, `src/components/AppHeader/AppHeader.tsx:66-76`, `src/components/DataMapping/DataMapping.tsx:15-25`)
- Impact:
  - Large render surface updates on unrelated state changes
  - Increased UI latency as editor/preview complexity grows
- Recommendation:
  - Migrate to selector-based subscriptions and shallow equality (`useAppStore(selector, shallow)`)
  - Split high-churn editor state from low-churn app workflow state

### F-03 (P1) - Character derivation has multiple competing update paths
- Evidence:
  - Global derivation in app-level hook (`src/App.tsx:25`, `src/hooks/useSelectedCharacters.ts:17-28`)
  - Duplicate derivation in row selection (`src/components/RowSelection/RowSelection.tsx:75-91`)
  - Direct writes during upload/reload (`src/components/FileUpload/FileUpload.tsx:69-76`, `src/hooks/usePreviousRunLoader.ts:78-81`)
- Impact:
  - No single source of truth for `characters`
  - Hard-to-reason state transitions and risk of stale/overwritten results
- Recommendation:
  - Derive `characters` from `csvData + selectedRowIndices` in one place only
  - Remove direct `setCharacters` writes outside that derivation boundary

### F-04 (P1) - Template validation rules conflict with editor workflow
- Evidence:
  - Validation rejects templates with no placeholders (`src/utils/svgManipulator.ts:525-527`)
  - Upload UI states placeholders can be added later in editor (`src/components/TemplateUpload/TemplateUpload.tsx:240-245`)
- Impact:
  - Contradictory UX and blocked intended workflow
- Recommendation:
  - Treat zero placeholders as warning (not hard error) and enforce required mappings at preview/print gates

### F-05 (P1) - Initial bundle is oversized and includes heavy edit-only dependencies
- Evidence:
  - Build output JS chunk is ~1.17 MB minified (`npm run build`, 2026-03-02)
  - Runtime imports pull `prettier/standalone` + parser plugins in editor helper modules (`src/components/TemplateEditor/helpers.ts:7-8`, `src/components/TemplateEditor/cssHelpers.ts:1-2`)
- Impact:
  - Slow initial load and parse/execute cost, especially on lower-end devices
- Recommendation:
  - Lazy-load `TemplateEditor` and code-split advanced editor panels
  - Dynamically import Prettier only when formatting is requested

### F-06 (P2) - Print flow monkey-patches `window.print`
- Evidence:
  - `handlePrint` overrides global `window.print`, injects dynamic style, then restores (`src/utils/printUtils.ts:59-146`)
- Impact:
  - Brittle global side effects and hard-to-debug race/failure modes
  - Higher risk of regressions across browsers
- Recommendation:
  - Avoid monkey-patching; rely on print CSS + controlled pre/post print hooks
  - Encapsulate print-specific layout changes with deterministic class toggles

### F-07 (P2) - TypeScript path alias configuration is misplaced
- Evidence:
  - `paths` is outside `compilerOptions` in `tsconfig.app.json` (`tsconfig.app.json:29-31`)
- Impact:
  - Alias config is ignored by TypeScript
  - Future path alias adoption can fail unexpectedly
- Recommendation:
  - Move `paths` under `compilerOptions` and add `baseUrl` if aliasing is required

### F-08 (P2) - Workflow state includes dead `print` step
- Evidence:
  - Store and step rendering include `"print"` (`src/store/appStore.ts:32`, `src/components/StepContent/StepContent.tsx:35`)
  - No setter path transitions to `"print"` found in source
- Impact:
  - Dead state increases complexity and confusion in step logic
- Recommendation:
  - Remove unused step or implement explicit entry point and UI contract

### F-09 (P2) - Local file history stores full file contents without retention limits
- Evidence:
  - Stored file model keeps full `content` in localStorage (`src/utils/fileHistory.ts:14`)
  - New entries are appended with no quota/TTL policy (`src/utils/fileHistory.ts:186-207`)
- Impact:
  - localStorage quota pressure and potential data persistence/privacy concerns
- Recommendation:
  - Add max item count/total byte budget + TTL purge
  - Provide clear-user-history controls and optional encryption if required

### F-10 (P2) - Raw SVG markup is injected into DOM without sanitization
- Evidence:
  - SVG preview writes markup via `innerHTML` (`src/components/TemplateEditor/TemplateEditorStage.tsx:150`)
- Impact:
  - Potential unsafe markup execution path via uploaded/customized SVG
- Recommendation:
  - Sanitize SVG before DOM insertion (strip script/event attributes/external refs)
  - Add allowlist-based parsing for editable SVG features

### F-11 (P3) - No automated test command for core workflows
- Evidence:
  - `package.json` has `dev`, `build`, `lint`, `preview` only; no test script
- Impact:
  - Regression risk remains high for mapping/editor/print workflows
- Recommendation:
  - Add unit tests for utils/state transitions and at least one integration smoke test for upload→map→preview flow

## Resolution Status (2026-03-02)
- F-01: Resolved via build-generated `sw-assets.json`, production-only SW registration, cache versioning, and resilient install caching.
- F-02: Resolved via selector-based Zustand subscriptions with `useShallow` across high-churn components.
- F-03: Resolved by consolidating `characters` derivation into `useSelectedCharacters` and removing duplicate write paths.
- F-04: Resolved by downgrading zero-placeholder validation to warning.
- F-05: Resolved by lazy-loading editor surfaces and on-demand dynamic imports for Prettier.
- F-06: Resolved by removing `window.print` monkey patch and using listener/class based print handling.
- F-07: Resolved by moving TS alias config under `compilerOptions` and adding `baseUrl`.
- F-08: Resolved by removing dead `print` workflow state from the app state machine.
- F-09: Resolved via history TTL/item/storage budgets and clear-history controls.
- F-10: Resolved by adding SVG sanitization before DOM insertion and sheet rendering.
- F-11: Resolved by adding test infrastructure and core unit/integration smoke tests.
