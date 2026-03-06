# App Redesign Plan

## Goal
Redesign the app into a unified workflow product that feels calm, legible, and consistent across upload, template editing, mapping, selection, and preview without losing existing capabilities.

## Product Direction
- Design direction: a quiet production workbench, not a dashboard.
- Visual tone: restrained, editorial, and utilitarian, using the existing warm neutrals as the base palette and a tighter accent system for state and emphasis.
- Layout rule: one primary task area, one secondary context area, one persistent workflow rail.
- Interaction rule: reduce simultaneous guidance layers and show only the next useful decision.

## Non-Negotiables
- Preserve all current workflow stages and working features.
- Preserve file history, previous-run reuse, advanced template editing, mapping helpers, row filtering/selection, print layout controls, and text resize controls unless a specific feature is later removed intentionally.
- Add a true light/dark theme system with one shared token set and a morphing SVG theme icon.
- Make the full workflow usable on mobile without forcing users through unreadable stacked desktop layouts.
- Keep the editor lazy-loaded and preserve performance-sensitive behavior in preview and print flows.

## What Needs To Change
1. App shell
- Replace the current layered shell with a simpler structure:
  - top app bar for brand, theme, and lightweight session status
  - left or top workflow navigation depending on breakpoint
  - main task canvas
  - optional contextual inspector/panel only when the step needs it
- Remove redundant progress surfaces competing with each other.
- Keep one clear workflow model across every step.

2. Design system
- Create shared tokens for color, typography, spacing, radius, borders, shadows, motion, and state feedback.
- Standardize a small set of primitives:
  - `AppShell`
  - `SectionCard`
  - `PanelHeader`
  - `InlineStat`
  - `ActionBar`
  - `StatusMessage`
  - `EmptyState`
  - `DataTable`
  - `InspectorPanel`
- Replace one-off pill, badge, glow, and gradient treatments with consistent component states.
- Use calmer surfaces, lower shadow reliance, and stricter spacing rhythm.

3. Information architecture
- Reframe each step around one main question:
  - Upload: Do I have the right source files?
  - Template: Is the template structurally correct?
  - Mapping: Does every placeholder map correctly?
  - Selection: Which rows should generate?
  - Preview: Is the output ready to print?
- Collapse repeated helper copy and checklist patterns into fewer, stronger cues.
- Convert dense blocks of metadata into compact summaries with expandable detail.

4. Step-by-step redesign
- Upload
  - Make CSV and SVG the only dominant actions.
  - Demote history and reuse flows into tabs, drawers, or collapsible sections.
  - Replace success banners plus readiness chips plus footer CTA with one clear completion state.
- Template editor
  - Keep the canvas primary.
  - Turn the right-hand controls into a consistent inspector with sections for selection, placeholders, and advanced tools.
  - Make advanced mode clearly separate from the default path.
- Mapping
  - Preserve the table, but tighten hierarchy and make unresolved items the first-class view.
  - Keep summary metrics compact and attach them directly to the mapping table header.
  - Ensure preview data stays visible without turning the screen into a dashboard.
- Selection
  - Keep the table on desktop.
  - Add a mobile list/card representation with the same filtering and selection behavior.
  - Clarify that this step controls print inclusion, not data mapping.
- Preview and print
  - Treat preview as a workspace with canvas left, print settings right.
  - Group layout, page setup, and text resizing under clearer headings.
  - Use progressive disclosure so casual users are not hit with every print control immediately.

5. Theming
- Build a single semantic token layer for light and dark mode.
- Keep contrast high and reduce per-component custom theming.
- Implement the theme switch as a dedicated component with:
  - persisted user preference
  - system-based first load fallback
  - morphing SVG icon
  - reduced-motion fallback
- Follow rendering guidance by animating the control wrapper and keeping SVG path complexity controlled.

6. Mobile strategy
- Define mobile layouts intentionally instead of stacking desktop panels.
- Change navigation from wide step cards to compact segmented workflow navigation.
- Move secondary controls into bottom sheets, drawers, or collapsible inspectors on small screens.
- Prioritize thumb-reachable primary actions and readable table alternatives.

7. Functional parity and cleanup
- Build a feature parity checklist before implementation starts.
- Preserve behavior for:
  - CSV upload and multi-file combine
  - SVG upload and validation
  - previous-run reuse
  - placeholder creation/editing/filtering
  - mapping autosuggest/default reset/filtering
  - row search and bulk selection
  - preview targeting, layout presets, print, and text resize
- Fix confusing labels or flows during redesign when they do not change capability.

## Implementation Phases
### Phase 1: Audit and system foundation
- Finalize workflow IA and mobile behavior rules.
- Define design tokens and component primitives.
- Inventory every reusable visual pattern that should be replaced.

### Phase 2: Shell and theme
- Rebuild app shell, navigation, top bar, and shared message system.
- Implement unified light/dark tokens and the morphing theme toggle.
- Remove legacy shell styling that conflicts with the new system.

### Phase 3: Upload and step framing
- Redesign upload as the cleanest expression of the new system.
- Replace redundant checklist/helper/CTA layers with one primary flow.
- Normalize step framing so later screens inherit the same structure.

### Phase 4: Editor, mapping, selection
- Apply the new system to the template editor workspace and inspector.
- Redesign mapping for clearer triage and lower visual noise.
- Redesign selection with desktop table plus mobile-friendly alternate presentation.

### Phase 5: Preview and print workspace
- Rebuild preview as a deliberate production workspace.
- Refactor print sidebar sections for hierarchy and progressive disclosure.
- Improve resize targeting controls and mobile behavior.

### Phase 6: Verification and polish
- Run a full functional parity pass.
- Verify keyboard flow, accessibility states, theme transitions, and responsive behavior.
- Run lint and type/build checks before finalizing.

## Technical Guidance
- Keep lazy loading for the template editor.
- Avoid introducing new data waterfalls while reorganizing step components.
- Prefer direct imports and step-scoped code splitting where useful.
- Minimize unnecessary client state subscriptions during shell refactors.
- Use shared primitives to reduce CSS drift across step-specific modules.

## Validation
- Desktop widths: 1440px, 1280px, 1024px.
- Mobile widths: 430px and 390px.
- Test the happy path from upload to print in both light and dark mode.
- Confirm no new TypeScript or ESLint errors.

## Current Assessment
- No blocking functionality gaps were found that prevent planning.
- The main issue is clarity and hierarchy, not missing core features.
