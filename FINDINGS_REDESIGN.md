# Redesign Findings

## UX Findings
- Existing flow had all functional steps but weak visual continuity between stages.
- Upload and mapping surfaces were functional but visually generic, reducing perceived guidance.
- Users lacked a persistent high-level sense of overall workflow completion.
- Step transitions relied on navigation familiarity; explicit per-step "what next" guidance was missing.
- Preview/print stage lacked quick targeting controls and layout presets, making final output tuning slower than earlier steps.
- Template editing lacked precision keyboard controls and quick default naming, slowing repetitive placeholder setup.
- Large templates made placeholder navigation noisy without list filtering or duplicate-focused triage controls.
- Step 1 accumulated too many stacked guidance blocks, making action order unclear.
- Upload UI lost visual primacy when checklist/meta blocks competed with the actual file-drop surfaces.

## Theming Findings
- Dark mode behavior was split between global variables and multiple component-local media queries.
- Component-local dark overrides prevented reliable manual light/dark selection behavior.
- A visible three-state toggle (`System`, `Light`, `Dark`) created unnecessary mode complexity for this workflow.
- Preferred behavior is: system-derived first load, then explicit persisted light/dark user selection.

## Branding Findings
- Header used `/branding/popul8-logo.svg` instead of the requested root `logo.svg`.
- `logo.svg` was structurally suitable; only internal CSS variables/font needed refresh while preserving core `rect` and `text` nodes.

## Technical Findings
- Existing architecture (Zustand + step-based components) allowed redesign without changing core parser/mapping logic.
- Most improvements could be delivered through targeted component/CSS updates with minimal behavioral risk.
