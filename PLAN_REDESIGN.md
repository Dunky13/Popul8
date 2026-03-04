# Redesign Plan

## Objective
Create a full UI redesign for the character sheet generator that improves visual quality and task flow for:
- Uploading data and templates
- Editing/tweaking templates
- Mapping CSV columns to template placeholders
- Selecting rows and previewing print output

## Scope
1. App shell redesign
- Replace existing top navigation look with a stronger workflow-oriented header.
- Integrate `logo.svg` as the primary brand mark in the header.
- Add progress visibility and contextual step framing.

2. Theme architecture
- Implement explicit `light` and `dark` controls.
- Use system preference on first load when no user choice is stored.
- Persist explicit user theme switches in local storage.
- Keep global token-driven theming and remove conflicting mode states.

3. Upload and mapping experience
- Redesign CSV and SVG upload cards for stronger affordances.
- Make Step 1 upload area the primary visual focus with a clear horizontal layout.
- Reduce redundant helper blocks and clarify "what to do next" in upload flow.
- Improve mapping visibility (coverage, unmapped placeholders, clearer controls).
- Improve readability and hierarchy in row selection and preview surfaces.

4. Documentation and verification
- Record findings and execution progress.
- Run lint and type/build checks and fix regressions.

## Milestones
1. Build new visual language and theme foundation.
2. Apply redesign to header, workflow controls, and key steps.
3. Clarify Step 1 hierarchy and upload-first layout.
4. Ensure responsive layout quality across desktop/mobile.
5. Verify no new ESLint or TypeScript errors.
