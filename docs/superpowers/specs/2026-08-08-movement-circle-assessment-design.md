# Movement Circle Assessment Design

## Goal
Assess whether the controlled player actually reaches the same trajectory target circle shown during the post-call MINE movement phase, and make that assessment visible in the final feedback.

## Scope
This is a focused extension of the post-call movement phase. It does not change ownership rules, serve generation, trajectory prediction, LEAVE behavior, session CSV columns, or when the move phase ends.

## Assessment Geometry
At the receiving evaluation point (`ROUND_TIMING.decisionPlaneProgress`), compute the exact target circle that the guide represents at that same serve progress:

1. Compute the guide prediction progress with `predictionProgress(progress)`.
2. Get the predicted court position from the canonical `Ball.getPosition(...)` trajectory calculation.
3. Compute the guide radius with `guideRadius(progress)`.
4. Measure planar x/z distance between the player center and target center.

The assessment must use this same target position and radius even when `Trajectory Guide` is Off, so visual assistance changes only visibility, not scoring.

## Body-Overlap Rule
Treat the player as having a horizontal body radius of 0.28 m, matching the current player capsule radius.

Define:

- `targetRadius` = current guide radius at evaluation.
- `playerRadius` = 0.28 m.
- `overlapThreshold` = `targetRadius + playerRadius`.
- `distanceToTarget` = planar distance between player center and target center.
- `outsideDistance` = `max(0, distanceToTarget - overlapThreshold)`.

Classification:

- `in_position` when `distanceToTarget <= overlapThreshold`.
- `close` when `0 < outsideDistance <= 0.5 m`.
- `missed` when `outsideDistance > 0.5 m`.

Touching the target boundary with the player's body counts as `in_position`.

## Movement Score
For a correct MINE, movement points must come from the circle assessment rather than the old distance-to-static-ideal-point formula.

- `in_position`: full `SCORING.movementMax` points.
- `close`: linearly scale from just under full points at the overlap boundary down to 0 points at 0.5 m outside the overlap threshold.
- `missed`: 0 movement points.

The movement classification and movement points must be derived by one shared pure helper so the UI assessment and numeric score cannot disagree.

Correct LEAVE remains unchanged: no movement is required and it receives the existing non-penalized movement treatment.

Wrong/missed ownership calls remain unchanged and never enter this circle-assessment movement phase.

## Feedback
After a correct MINE reaches the evaluation point, the large result should communicate both decision and positioning.

Examples:

- `CORRECT — MINE` with secondary text `IN POSITION ✓`.
- `CORRECT — MINE` with secondary text `CLOSE — 0.3 m OUTSIDE`.
- `CORRECT — MINE` with secondary text `MISSED POSITION — 1.1 m OUTSIDE`.

The existing bottom detailed feedback should include movement points and the same position classification.

The assessment is shown only for a correct MINE movement phase. Correct LEAVE and wrong/missed calls keep their existing decision-only result presentation.

## Architecture
Add a pure `MovementAssessment` module responsible for target geometry comparison and movement-point calculation.

Recommended interface:

```js
assessMovementTarget({
  player,
  target,
  targetRadius,
  playerRadius = 0.28,
  closeBand = 0.5,
  movementMax
})
```

Return:

```js
{
  status: 'in_position' | 'close' | 'missed',
  distanceToTarget,
  outsideDistance,
  movementPoints
}
```

`Game` computes the evaluation target using the canonical ball trajectory plus `predictionProgress()` and `guideRadius()`, calls `assessMovementTarget`, then supplies that assessment to scoring and feedback.

`Scoring` must not independently recompute a different movement distance for a correct MINE. It should consume the already-computed movement assessment or its `movementPoints`.

The target calculation should be available through a small shared helper if needed so `TrajectoryGuide` updates and final assessment use the same prediction formula.

## Guide On/Off Consistency
With guide On, the final assessment target must match the circle the user was seeing immediately before evaluation.

With guide Off, the same invisible target is still computed and assessed. Turning visual assistance off must not make the movement task easier or harder numerically.

## Session Data
Do not add CSV columns in this iteration. Existing `movement_points` and `total_score` reflect the new circle-based assessment. The visible session result can show the classification, but persistence of `in_position/close/missed` is a non-goal for this iteration.

## Testing
Add focused tests for:

- Player body touching the circle edge counts as `in_position`.
- Player center inside the circle is `in_position`.
- A player 0.25 m outside the body-overlap boundary is `close`.
- A player exactly 0.5 m outside the body-overlap boundary is `close`.
- A player more than 0.5 m outside is `missed`.
- `in_position` receives full movement points.
- `close` points decrease monotonically as outside distance increases.
- `missed` receives zero movement points.
- Final assessment target uses `Ball.getPosition(predictionProgress(progress))` and `guideRadius(progress)` at the receive threshold.
- Guide On and Off produce identical movement assessment for identical player/scenario state.
- Final correct-MINE feedback displays the same classification returned by the assessment helper.
- Correct LEAVE behavior is unchanged.
- Exactly one attempt record remains created per serve.

Run the full Vitest suite, production build, and Docker image build after integration.

## Non-Goals
- No requirement that the player's center be fully inside the circle.
- No continuous scoring for time spent inside the circle.
- No automatic movement assistance.
- No new ownership logic.
- No new CSV fields.
- No change to trajectory-guide size or prediction behavior.
