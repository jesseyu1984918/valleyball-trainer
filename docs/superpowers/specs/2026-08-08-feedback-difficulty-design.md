# Prominent Feedback and Difficulty Control Design

## Goal
Make MINE/LEAVE assessment immediately visible and let players choose a meaningful Easy, Medium, or Difficult serve level.

## Current Context
The trainer already has serve-profile difficulty scaling internally, but `Game.resetRound()` always requests `normal`. Current feedback is a small bottom message, which is easy to miss while watching the 3D court.

## HUD Difficulty Control
Add a `Difficulty` selector alongside the existing Serve Type and Reveal Serve controls.

Options:
- `Easy`
- `Medium` (default)
- `Difficult`

The selected level persists in game state across rounds and applies when the next serve scenario is generated. Changing difficulty during a round does not mutate the ball already in flight.

Map the player-facing labels to the existing generator concepts:
- Easy -> `easy`
- Medium -> `normal`
- Difficult -> `hard`

Difficulty changes both dimensions already modeled by the serve generator:
- serve duration/speed
- trajectory movement strength, including float movement and topspin drop

Easy uses longer duration and reduced movement. Medium preserves the current baseline. Difficult uses shorter duration and stronger movement.

## Prominent Decision Feedback
Add a dedicated center-screen feedback overlay independent of the existing detailed bottom feedback.

On evaluation, display one of exactly four messages:
- `CORRECT — MINE`
- `CORRECT — LEAVE`
- `WRONG — YOU SHOULD TAKE IT`
- `WRONG — LET YOUR TEAMMATE TAKE IT`

Message selection is based on correctness and the expected ownership call, not merely the key pressed. A missed call therefore receives the appropriate WRONG message based on the expected call.

The overlay:
- appears immediately after evaluation
- is visually dominant and centered over the 3D court
- remains visible for approximately 900 ms
- then disappears automatically
- does not change round timing or block rendering/input
- is hidden when a new round begins

The existing bottom feedback remains visible for the normal feedback phase and continues to contain serve type, ownership explanation, and score details.

## Visual Treatment
Use a large bold result card/text with strong contrast and enough size to read without looking away from the court. Correct and wrong states should be visually distinguishable without relying only on wording. The overlay must remain legible on desktop and narrow mobile screens and must not introduce horizontal overflow.

## Architecture
Keep the change within existing boundaries:
- `ServeGenerator` continues owning difficulty physics.
- `Game` owns the selected difficulty and passes it into scenario generation.
- `Hud` owns the difficulty selector and prominent result presentation.
- `config.js` may expose stable difficulty metadata/labels so UI and game logic do not duplicate mappings.

No backend, session-export format, scoring formula, ownership algorithm, or serve-profile definitions need to change.

## State Flow
1. App starts with Medium selected.
2. Player may choose Easy, Medium, or Difficult from the HUD.
3. `Game` stores the selection.
4. On the next `resetRound`, `Game` passes the mapped difficulty to `createServeScenario()`.
5. Player makes MINE/LEAVE decision or misses the decision window.
6. Existing scoring and ownership evaluation run unchanged.
7. `Game` asks the HUD to show the appropriate prominent result.
8. HUD hides the result after about 900 ms while bottom feedback remains.

## Testing
Add focused tests for:
- Medium being the default difficulty.
- HUD difficulty changes reaching the game setting.
- Easy/Medium/Difficult mapping to `easy`/`normal`/`hard` scenario generation.
- Existing duration and movement scaling remaining ordered Easy < Medium < Difficult in challenge.
- Correct MINE and LEAVE messages.
- Wrong expected-MINE and expected-LEAVE messages, including missed calls.
- Prominent feedback being cleared for a new round.

Run the full Vitest suite and production build after integration. Docker/nginx architecture remains unchanged.

## Non-Goals
- No custom numeric speed slider.
- No separate speed and movement controls.
- No changes to scoring weights.
- No persistent difficulty preference across browser reloads.
- No changes to CSV/session reporting in this feature.
