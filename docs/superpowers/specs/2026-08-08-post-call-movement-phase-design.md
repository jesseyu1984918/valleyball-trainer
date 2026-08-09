# Post-Call Movement Phase Design

## Goal
Separate ownership decision from movement execution so the player must first decide MINE/LEAVE without trajectory assistance, then physically move toward the predicted contact area only after a correct MINE call.

## Revised Round Flow
The current trajectory guide appears before the player's ownership call and therefore leaks information. The round should instead follow one of three paths:

### Correct MINE
1. Serve begins with no trajectory guide visible.
2. Player reads the serve and calls `MINE`.
3. The ownership decision and reaction time are recorded immediately.
4. The rally continues; the ball does not stop and feedback is not shown yet.
5. The trajectory guide appears immediately after the correct MINE call.
6. WASD movement remains enabled while the ball continues toward the receiving point.
7. The guide continues to move and shrink using the existing prediction model.
8. At the receiving/contact evaluation point, the player's final movement position is scored.
9. Only then does the round enter feedback and show the large correctness result plus detailed score.

### Correct LEAVE
1. Serve begins with no trajectory guide visible.
2. Player calls `LEAVE`.
3. Because the ownership decision is correct and no movement is required, the attempt ends immediately.
4. No trajectory guide is shown.
5. Feedback is shown immediately.

### Wrong Call or Missed Call
1. Serve begins with no trajectory guide visible.
2. If the player makes the wrong ownership call, the attempt ends immediately.
3. If the call deadline is reached with no call, the attempt ends immediately as incorrect.
4. No trajectory guide is shown in either case.
5. Feedback explains the correct ownership decision.

## Training Intent
The trajectory guide is movement assistance, not an ownership hint.

The intended MINE learning loop becomes:

`Read serve -> decide MINE -> move to target -> receive -> result`

The intended LEAVE learning loop becomes:

`Read serve -> decide LEAVE -> result`

This prevents players from learning to infer ownership from guide styling or guide placement before committing to a call.

## Guide Controls
Replace the current `Guided / Read First` selector with a simpler trajectory-assistance control:

- `Trajectory Guide: On` — default.
- `Trajectory Guide: Off` — after a correct MINE call, the rally still continues into the movement phase but no target ring is rendered.

The guide is never visible before a call, regardless of this setting.

The setting persists across rounds during the current page session but does not persist across page reloads.

## Decision State vs Movement State
Introduce an explicit post-call movement phase rather than treating the ownership call as the end of the serve.

Recommended game phases:

- `countdown`
- `serve` — ball in flight; ownership call not yet accepted
- `move` — correct MINE has been accepted; ball remains in flight; movement continues
- `feedback`

A correct LEAVE or any incorrect/missed call transitions directly from `serve` to `feedback`.

A correct MINE transitions from `serve` to `move`, then from `move` to `feedback` at the receiving evaluation point.

## Decision Capture
When a call is made during `serve`:

- Run `decideOwnership` using the round's frozen ownership decision.
- Record `call`, `expectedCall`, correctness, and reaction time immediately.
- Do not compute the final movement score yet for a correct MINE.

Ownership for the round must be frozen from the receiver formation at serve start. Player movement after calling MINE must not be able to change who was supposed to take the ball.

## Movement Evaluation
For a correct MINE call, continue updating the ball and player until the receiving evaluation point.

Use the existing `ROUND_TIMING.decisionPlaneProgress` / receiving-progress concept as the initial evaluation point unless testing shows a more appropriate existing contact threshold is already available. The implementation must use serve progress, not wall-clock milliseconds, so Easy/Medium/Difficult speeds remain consistent.

At evaluation:

- Snapshot the player's final position and movement state.
- Compute the movement component of the score using the existing scoring rules.
- Preserve the decision correctness and reaction timing captured at call time.
- Produce one final attempt record and one final total score.

Do not record two attempt rows for the same serve.

## Scoring Behavior
### Correct MINE
- Decision score: determined at call time.
- Reaction score: determined from call reaction time.
- Movement score: determined later at receiving evaluation.
- Final total and feedback: produced after movement evaluation.

### Correct LEAVE
- Decision/reaction scoring happens immediately.
- Movement is not required and must not penalize the player for not chasing the ball.
- Final feedback is immediate.

### Wrong or Missing Call
- Finalize immediately as incorrect.
- No movement phase and no guide.

Existing aggregate session statistics and CSV schemas should remain stable unless internal attempt-building requires additional temporary state. No new CSV columns are required for this iteration.

## Trajectory Guide Behavior
The existing `TrajectoryGuide` rendering and prediction model can be reused with changed visibility rules.

For a correct MINE with guide enabled:

- Reveal the ring immediately when the call is accepted.
- The ring center continues following the forward-looking trajectory prediction.
- The ring radius uses the current serve progress, so a late MINE call begins with the appropriately smaller target rather than restarting at maximum radius.
- The ring remains the prominent MINE styling only; muted LEAVE styling is no longer needed during gameplay because LEAVE never enters movement guidance.
- Hide/reset the ring at final evaluation, round reset, session reset, or when trajectory assistance is Off.

## HUD and Feedback
Before ownership call:

- Keep existing serve state messaging and MINE/LEAVE controls.
- No trajectory target is visible.

After a correct MINE:

- Change state text to something like `Move`.
- Bottom feedback should prompt movement, e.g. `MINE confirmed — move into the target zone.`
- Do not show the large CORRECT result yet.

At receiving evaluation:

- Show the existing large correctness result.
- Show reaction, movement, and total score in the existing detailed feedback format where practical.

Correct LEAVE and wrong/missed calls continue to show immediate feedback.

## Architecture
Keep changes localized:

- `Game` owns the new `move` phase and pending decision state.
- `DecisionEngine` remains unchanged and provides the frozen ownership decision.
- `Scoring` should gain or expose a way to score decision/reaction independently from final movement, or a small orchestration helper should store the early inputs and call the final scorer later. Avoid duplicating scoring formulas in `Game`.
- `TrajectoryGuide` and `TrajectoryGuideModel` remain responsible for rendering and prediction geometry.
- `Hud` changes the guide selector to On/Off and displays the `Move` state.
- `GameSessionBridge` continues to produce exactly one attempt record per serve after the result is final.

## Error and Edge Behavior
- Ignore additional MINE/LEAVE keypresses after a correct MINE has entered `move`.
- Position shortcuts remain governed by existing round-position rules; do not allow changing controlled receiver during `serve` or `move`.
- If the receiving evaluation threshold is reached before the player calls, treat it as a missed call and finalize immediately.
- If trajectory guide is Off, correct MINE still enters the same movement phase and is scored identically; only the visual assistance is absent.
- Session pause/end behavior during `move` should pause and resume timing/flight consistently with the existing pause logic.

## Testing
Add focused tests for:

- No trajectory guide visibility before any ownership call.
- Correct MINE transitions `serve -> move` rather than directly to feedback.
- Correct MINE records reaction time at the call but defers final attempt recording until movement evaluation.
- Guide appears immediately after correct MINE when assistance is On.
- Guide stays hidden after correct MINE when assistance is Off.
- WASD movement remains active during `move`.
- Additional ownership calls are ignored during `move`.
- Final movement position changes the movement score for correct MINE.
- Correct LEAVE transitions directly to feedback with no guide and no movement penalty.
- Wrong MINE/LEAVE transitions directly to feedback with no guide.
- Missed call at the evaluation threshold transitions directly to feedback with no guide.
- Exactly one attempt record is created per serve.
- Round reset and session reset clear pending decision/movement state and hide the guide.
- Difficulty-independent behavior: transitions depend on serve progress, not fixed milliseconds.

Run the full Vitest suite, production build, and Docker build after integration.

## Superseded Behavior
This design supersedes the pre-call guide visibility behavior described in `docs/superpowers/specs/2026-08-08-trajectory-guidance-design.md`.

Specifically, the following earlier behaviors are removed:

- No guide visible from serve start.
- No `Read First` reveal at net crossing.
- No muted LEAVE guide during active play.

The trajectory prediction geometry, shrinking confidence ring, and float-aware target movement from that design remain valid and are reused only during the post-call MINE movement phase.

## Non-Goals
- No automatic player movement toward the target.
- No trajectory guide for correct LEAVE.
- No coverage-movement requirement for LEAVE.
- No change to ownership rules.
- No new CSV fields.
- No persistence of trajectory-guide preference across browser reloads.
