# Current Findings

## Product-Level Findings
- The app already has a complete end-to-end workflow and should be redesigned, not re-invented.
- The core experience is a multi-step production tool, so the UI should behave like a workbench rather than a dashboard.
- The strongest future value is better hierarchy and consistency, not more surface area.

## App Shell Findings
- The shell currently shows too many simultaneous guidance systems:
  - header stats
  - progress bar
  - step navigation cards
  - step intro copy
  - step checklist
  - step CTA/helper row
- These layers often describe the same state in different forms, which makes the app feel busier than it is.
- The current visual language uses gradients, pills, glows, rounded chips, and multiple card styles more often than the product needs.
- The current styling conflicts with the direction in `Uncodixfy.md`, especially around decorative gradients, pill-heavy status patterns, and dashboard-like step cards.

## Design System Findings
- The app has global tokens, but many components still behave like one-off islands rather than a coherent system.
- The same concepts recur with different implementations:
  - summary metrics
  - badges/chips
  - empty states
  - action bars
  - section headers
  - card containers
- Borders, shadows, spacing density, and emphasis patterns are inconsistent between steps.
- Typography hierarchy is better than generic dashboard UI, but there is still too much uppercase meta labeling and too many competing text scales.
- A first shell pass confirmed that the product becomes easier to scan when progress is expressed as compact state summaries and a single workflow rail instead of a dashboard header.

## Upload Findings
- Upload is the clearest example of clutter.
- Users are asked to process:
  - step framing
  - readiness chips
  - reuse previous run
  - upload dropzone
  - success banner
  - history lists
  - action buttons
  - footer CTA
- History and reuse are useful, but they currently compete with the primary task instead of supporting it.
- On mobile, the upload screen becomes a long stack of cards and actions, which increases scroll cost before the user can confirm readiness.
- After the shell redesign, the remaining upload clutter is concentrated inside `FileUpload` and `TemplateUpload`, which makes those components the correct next redesign target.

## Template Editor Findings
- The template editor is functionally rich and worth preserving.
- The editor has the right overall split between canvas and controls, but the right-side panels feel like stacked utilities rather than one coherent inspector.
- Advanced workflows are present, but the boundary between default and advanced usage is not visually strong enough.
- Placeholder management is powerful, though the surrounding framing still inherits the busy shell patterns from the rest of the app.

## Mapping Findings
- Mapping is structurally sound: table, preview value, filtering, unresolved-state support.
- The current screen still adds dashboard patterns on top of a table workflow:
  - summary metrics
  - coverage bar
  - unresolved chip group
  - filter controls
  - bottom action row
- The unresolved state should be more central than the overall completion state.
- The best future version is a calmer data workspace, not a more decorative one.

## Selection Findings
- The row selection table is appropriate on desktop.
- The current title "Select Rows to Map" does not match the actual purpose of the step, which is choosing what gets generated and printed.
- The mobile experience will need a different presentation than the full table.
- Summary controls are useful, but the toolbar becomes crowded quickly as screen width shrinks.

## Preview And Print Findings
- Preview is powerful but dense.
- The current screen combines:
  - output preview
  - selection targeting
  - print action controls
  - page setup
  - layout presets
  - text resize targeting
  - field-by-field resize controls
- This is valid functionality, but it needs clearer grouping and progressive disclosure.
- The print sidebar should become a more deliberate inspector, with default controls surfaced first and expert controls nested.

## Theme Findings
- The app already supports explicit light/dark mode with persisted preference and system-first behavior.
- The theme switch now has a morphing SVG treatment, but the rest of the app still needs the same semantic token discipline to make both modes feel fully unified.
- Theme styling still depends too much on step-specific visual treatments instead of one unified semantic token system.

## Mobile Findings
- The current mobile layout is usable but mostly created by stacking desktop structures.
- Step navigation, upload history, selection tables, and preview controls all need mobile-specific presentation rules.
- Mobile should prioritize:
  - one primary action area
  - collapsible secondary detail
  - shorter action rows
  - alternate representations for wide data tables
- The new shell improves readability on mobile, but the workflow rail still relies on horizontal scrolling at narrow widths and should be replaced with a more intentional compact navigation pattern.

## Technical Findings
- The current architecture is favorable for redesign:
  - Zustand store is centralized
  - step routing is simple
  - the editor is already lazy-loaded
  - functionality is mostly separated by step
- A shared design system can be introduced without rewriting the underlying CSV/SVG pipeline.
- The redesign should focus on shared layout primitives and state presentation rather than changing business logic first.
- The local PWA/service worker can keep serving stale UI during redesign verification, so future visual QA should either unregister the service worker in dev or use a development safeguard that disables stale caching.

## Functional Parity Findings
- The following capabilities should be preserved unless intentionally changed later:
  - CSV upload, multi-file combine, and history reuse
  - SVG upload, template validation, and bootstrapped CSV export
  - template editing, placeholder creation, filtering, duplicate detection, and export
  - mapping autosuggest, default mapping, filtering, and preview values
  - row filtering, bulk selection, and required-row behavior
  - preview targeting, layout presets, printing, and text resizing

## Planning Conclusion
- No blocking functional ambiguity was found during this review.
- The redesign can proceed as a staged UI-system refactor with functional parity as the guardrail.
