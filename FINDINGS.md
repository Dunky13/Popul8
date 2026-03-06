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
- Quick access to recent files is still important, so the better pattern is a compact always-visible selector instead of fully collapsing history behind a toggle.
- The strongest version of that selector is a hybrid: desktop should read like a small table with aligned columns, while mobile should stay stacked.
- CSV history benefits more from content-aware metadata like row counts than from generic file metadata like byte size.
- Once the date is already a visible column, extra date-group separators add vertical noise and should be removed.
- Template metadata can stay useful with a compact summary plus placeholder overflow count; showing the full placeholder list in upload is unnecessary noise.
- The SVG uploader is now structurally closer to the CSV picker, so its layout has to be kept in sync when metadata columns change; otherwise the grid breaks immediately.
- The SVG upload step reads better when it behaves like a compact picker instead of duplicating current-template status inside the same panel.
- A condensed upload panel still needs an explicit visible primary action; relying only on “click the dropzone” hides the main interaction without saving enough space to justify it.
- The best compact upload pattern here is a shorter dropzone with an in-place browse button, while the lower action row should be reserved for secondary actions that only matter after a file is loaded.

## Template Editor Findings
- The template editor is functionally rich and worth preserving.
- The editor has the right overall split between canvas and controls, but the right-side panels feel like stacked utilities rather than one coherent inspector.
- Advanced workflows are present, but the boundary between default and advanced usage is not visually strong enough.
- Placeholder management is powerful, though the surrounding framing still inherits the busy shell patterns from the rest of the app.
- The editor reads more clearly when file stats, view mode, advanced controls, and history actions live in one compact workspace header instead of being repeated in the side column.
- The inspector works better when placeholder editing and detected-placeholder review stay ahead of advanced CSS/font tools in the vertical order.

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
- Mapping becomes easier to scan when status is compressed into a single header band and the table stays dominant.
- Auto-suggest, defaults, and clear actions belong near mapping status, not in a detached footer after the table.
- On mobile, collapsing the mapping table into a one-column stack keeps the data structure but loses the task model; it becomes hard to tell what is being mapped at any given moment.
- A better mobile mapping pattern is a guided placeholder flow: one field at a time, explicit progress, next-unresolved shortcut, and a compact jump list for overview.
- Desktop should stay table-first for fast scanning, but mobile should optimize for sequential resolution instead of column comparison.

## Selection Findings
- The row selection table is appropriate on desktop.
- The current title "Select Rows to Map" does not match the actual purpose of the step, which is choosing what gets generated and printed.
- The mobile experience will need a different presentation than the full table.
- Summary controls are useful, but the toolbar becomes crowded quickly as screen width shrinks.
- A mobile card fallback works better than horizontal table overflow for selection because users mostly need quick row inclusion decisions and a small field preview, not the entire dataset at once.
- Selection status reads better when selected count, visible count, and required-row warnings live in the header rather than as scattered toolbar badges.

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
- Preview becomes easier to understand when it is framed as a print workspace with one canvas area and one inspector, instead of a flat stack of print-related utilities.
- Page setup should stay visible by default, while field-by-field resize overrides should sit behind an explicit disclosure because they are expert controls, not the default next action.

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
- The upload panels now hold up better on mobile once history is collapsed, which suggests the same disclosure pattern should be used for other dense secondary controls.
- Mobile workflow navigation is clearer with compact previous/next controls and a current-step summary than with a horizontally scrolling rail of full desktop step cards.
- The print sidebar needs its summary stats stacked on mobile so the workspace keeps a readable rhythm instead of compressing three metrics into one cramped row.

## Technical Findings
- The current architecture is favorable for redesign:
  - Zustand store is centralized
  - step routing is simple
  - the editor is already lazy-loaded
  - functionality is mostly separated by step
- A shared design system can be introduced without rewriting the underlying CSV/SVG pipeline.
- The redesign should focus on shared layout primitives and state presentation rather than changing business logic first.
- The local PWA/service worker can keep serving stale UI during redesign verification, so future visual QA should either unregister the service worker in dev or use a development safeguard that disables stale caching.
- The current step architecture and scoped CSS modules made it possible to complete the redesign incrementally without destabilizing the underlying CSV/SVG processing flow.

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
- The redesign plan has been carried through to implementation, and the remaining work is now iterative polish rather than structural product redesign.
