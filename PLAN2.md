# Codebase Audit Plan

## Goal
Review the current React/Vite codebase for inconsistencies, duplicated code, ambiguous domain logic, performance issues, and other maintainability risks, then record the results in a way that can drive follow-up implementation work.

## Scope
- Workflow shell and step navigation
- Shared state and domain rules in the Zustand store
- Current vs `Legacy` component drift
- Mapping, selection, preview, and template-editor behavior
- React rendering and parsing hotspots
- Validation and messaging consistency

## Audit Approach
1. Establish the active runtime path
- Verify which app entrypoint is mounted.
- Check how the experiment switch chooses between redesigned and legacy UI trees.

2. Review workflow and domain rules
- Compare store readiness helpers with the rules enforced by navigation, CTAs, and keyboard shortcuts.
- Look for step transitions that disagree with the store’s domain model.

3. Measure duplication and drift
- Inventory duplicated `Legacy` files.
- Compare paired components to identify behavior drift, not just cosmetic differences.

4. Review high-cost paths
- Inspect the template editor for repeated SVG parsing, expensive effects, and avoidable recomputation.
- Inspect upload/history code for repeated parsing work on large datasets.

5. Review state and messaging ownership
- Trace where validation results are produced, stored, displayed, and cleared.
- Flag logic that depends on message text or parallel UI-only rules.

## Deliverables
- `FINDINGS2.md` with prioritized findings and evidence
- `PROGRESS2.md` with audit status and next follow-up work

## Success Criteria
- Every finding is tied to concrete files or behaviors.
- Duplicated-code findings distinguish between deliberate UI variants and accidental drift.
- Performance findings point to specific rerender or parsing hotspots.
- No new TypeScript or ESLint issues are introduced while adding the audit files.

