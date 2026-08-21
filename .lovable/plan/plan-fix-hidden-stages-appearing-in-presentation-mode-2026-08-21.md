# Plan: Fix Hidden Stages Appearing in Presentation Mode

The user reported that stages marked as "hidden" (oculto) still appear in the Presentation Mode. Although there is some logic in `PresentationMode.tsx` to filter these stages, it seems incomplete or inconsistent, particularly in the timeline and navigation.

## Proposed Changes

### Frontend Components

#### `src/components/PresentationMode.tsx`
- **Filter `visibleStages`**: Ensure the initial `visibleStages` array used for indices and mapping is correctly filtered.
- **Update Navigation Logic**: The `handlePrevStage`, `handleNextStage`, and keyboard arrow handlers already have some filtering, but they rely on the full `stages` array and check `stage.oculto`. I will verify and tighten this logic to ensure it correctly skips hidden stages unless they are the currently active one (to avoid breaking the state if a stage is hidden while playing).
- **Refactor Timeline**: Ensure the timeline footer only renders visible stages. The current implementation already filters but it might be causing index mismatches if not handled carefully.
- **Index Management**: Ensure `selectedStageIndex` refers to the index in the *original* stages array to maintain consistency with `currentStageId`, or refactor to use `visibleStages` consistently.

## Technical Details

- Use the `oculto` property from the `CeremonyStage` object.
- The `stages` prop passed to `PresentationMode` contains all stages for the section.
- I will create a `visibleStages` array: `const visibleStages = stages.filter(s => !s.oculto || s.id === currentStageId);`
- I will ensure all navigation (buttons, keyboard, timeline) uses this filtered set for "next/prev" calculations.

## Verification Plan

### Automated Tests
- I will create a Playwright test to:
    1. Navigate to a section.
    2. Mark a stage as hidden.
    3. Open Presentation Mode.
    4. Verify the hidden stage does not appear in the timeline.
    5. Verify navigating "Next" skips the hidden stage.

### Manual Verification
- Toggle hidden status in the UI.
- Enter Presentation Mode and check the timeline dots.
- Use keyboard arrows to navigate and verify hidden stages are skipped.
