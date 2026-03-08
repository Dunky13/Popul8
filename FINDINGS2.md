# Audit Findings 2

## Highest Priority Findings

### 1. Edit-step availability is inconsistent across the workflow
- The redesigned upload screen blocks the main CTA until both CSV and SVG are loaded: `src/components/UploadStep/UploadStep.tsx:20-22`, `src/components/UploadStep/UploadStep.tsx:118-132`.
- The shared flow-action helper still enables the upload-step action when only the SVG is present and explicitly says the CSV can wait: `src/utils/flowActions.ts:31-44`.
- The redesigned header also exposes the edit step when only the template exists: `src/components/AppHeader/AppHeader.tsx:261-281`.
- Result: the user can bypass the upload screen’s stated rule and land in the editor through navigation even though the primary upload UI says editing requires both files.
- Impact: inconsistent product behavior, harder QA, and confusing user guidance.

### 2. Preview readiness logic has drifted between the store and the legacy experiment branch
- The canonical store rule blocks preview when mappings reference missing CSV headers or when required placeholders remain unresolved: `src/store/appStore.ts:238-263`.
- The legacy app shell uses a weaker local rule that only checks whether the number of mapped placeholders matches the placeholder count: `src/AppLegacy.tsx:100-109`.
- The legacy header repeats the same weaker rule for step availability: `src/components/AppHeader/AppHeaderLegacy.tsx:189-213`.
- Because `src/main.tsx` mounts `AppExperiment`, production users can still be routed through this legacy path.
- Impact: experiment branches can unlock selection/preview under different rules than the store, which creates branch-specific bugs and unreliable A/B comparisons.

### 3. Mapping validation state is coupled to English message prefixes
- The redesigned app clears mapping-related messages by hard-coded `startsWith(...)` checks on the rendered text: `src/App.tsx:76-95`.
- Those prefixes come from the free-form message builders in `src/errors/errorMessages.ts:25-31` and `src/utils/validationUtils.ts:55-97`.
- The legacy mapping screen also writes validation results directly into the global error/warning arrays: `src/components/DataMapping/DataMappingLegacy.tsx:46-57`.
- Impact: changing copy, rewording errors, or localizing text can silently break cleanup behavior. The code is using display strings as state identifiers.

## Medium Priority Findings

### 4. The codebase carries a large duplicated UI surface and the copies are already drifting
- The runtime can render two parallel app trees through `src/AppExperiment.tsx`.
- The audit found 25 `Legacy` files under `src/`.
- Paired screens such as upload, mapping, selection, preview, headers, and editor wrappers exist twice, with some pairs nearly identical and others behaviorally different.
- Evidence of drift:
  - `UploadStep` vs `UploadStepLegacy`
  - `DataMapping` vs `DataMappingLegacy`
  - `RowSelection` vs `RowSelectionLegacy`
  - `PageGrid` vs `PageGridLegacy`
  - `AppHeader` vs `AppHeaderLegacy`
- Impact: fixes must be applied twice, behavior diverges easily, and reviews become slower because UI bugs may be variant-specific.

### 5. The template editor reparses SVG content in several overlapping places
- `TemplateEditor` reparses the full SVG to derive `contentSummary`: `src/components/TemplateEditor/TemplateEditor.tsx:35-42`.
- `TemplateEditorWorkspace` parses the SVG again for `svgInfo`, again for `parsedLocalSvg`, and keeps a callback that reparses it yet again: `src/components/TemplateEditor/TemplateEditorWorkspace.tsx:157-174`.
- `usePlaceholderBlocks` performs its own `DOMParser` pass across the full SVG: `src/components/TemplateEditor/hooks/usePlaceholderBlocks.ts:13-90`.
- `useSelectedCodeSync` parses selected snippet markup on every synchronization cycle: `src/components/TemplateEditor/hooks/useSelectedCodeSync.ts:54-120`.
- `useTemplateContent` also reparses on apply, undo, redo, and after formatting passes: `src/components/TemplateEditor/hooks/useTemplateContent.ts:31-132`.
- Impact: complex templates will pay for multiple DOM parses and placeholder scans per edit cycle, which is the most likely place for responsiveness to degrade.

### 6. CSV history metadata recomputes row counts by reparsing every stored CSV whenever history changes
- `FileUpload` uses an effect that loops through all stored CSV history items and reparses each file’s full content to count rows: `src/components/FileUpload/FileUpload.tsx:143-167`.
- History is allowed to keep up to 40 files in local storage, so this cost scales with the whole retained history rather than only the currently selected files.
- Impact: opening or updating history can do unnecessary background work on large CSV datasets.

## Lower Priority / Ambiguous Logic Findings

### 7. Mapping warning semantics are unclear and the implementation disagrees with its own comment
- The comment says unused CSV columns should warn when there are unmapped placeholders: `src/utils/validationUtils.ts:69-76`.
- The actual condition only warns when required placeholders are unmapped: `src/utils/validationUtils.ts:75-77`.
- Result: once required placeholders are resolved, optional unresolved placeholders no longer trigger unused-column warnings, even though the surrounding code and comment imply broader coverage.
- Impact: lower-confidence guidance and harder-to-reason-about mapping UX.

### 8. `validateDataMapping` advertises `invalidColumns` but never populates it
- The function detects invalid mappings and pushes errors, but always returns `invalidColumns: []`: `src/utils/validationUtils.ts:61-67`, `src/utils/validationUtils.ts:100-105`.
- Impact: the return type suggests structured invalid-column data exists when it does not, which increases ambiguity for future consumers.

## Recommended Follow-Up Order
1. Unify step gating around store readiness helpers and remove UI-only availability rules.
2. Replace string-based validation cleanup with structured message metadata or scoped validation state.
3. Decide whether the legacy branch remains temporary or needs shared primitives to reduce duplication.
4. Consolidate SVG parsing in the editor around one parsed representation per content revision.
5. Cache or persist CSV history row counts instead of reparsing all stored files on each history update.

