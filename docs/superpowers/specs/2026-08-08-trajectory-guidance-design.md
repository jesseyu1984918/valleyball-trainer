# Trajectory Guidance Design

## Goal
Train players to move instinctively toward the expected contact area, not just make the correct MINE/LEAVE call.

## Training Modes
Add a trajectory-guidance mode selector with two player-facing modes:

- `Guided` — default. The projected target circle is visible from the start of the serve.
- `Read First` — the target circle stays hidden until the ball crosses the net, then becomes visible.

The selected mode persists across rounds during the current page session but is not persisted across browser reloads.

## Target Visualization
Render a large translucent ring on the court floor representing the predicted receiving/contact area.

The circle is not a static landing marker. Its center tracks the predicted court-plane contact location implied by the current serve trajectory so float movement can shift the target during flight.

The circle also communicates uncertainty:

- Early in the serve, the circle is large: roughly 2.0–2.5 m in diameter.
- As the serve develops, the circle shrinks smoothly.
- Near the receiving/contact point, the circle reaches roughly 0.8–1.0 m in diameter.

The size at any instant depends on current serve progress. In `Read First`, when the circle first appears after net crossing, it immediately uses the radius appropriate for that point in the flight rather than restarting at the maximum size.

## Ownership Styling
The circle should reinforce ownership without becoming the ownership decision itself.

- If the controlled player is the expected owner (`MINE`), use the normal prominent target treatment.
- If another receiver is the expected owner (`LEAVE`), render the same predicted area with a muted gray treatment.

The muted LEAVE circle remains visible because it still teaches trajectory reading, but it should not visually invite the controlled player to chase the ball.

No ownership text is added to the circle. Existing MINE/LEAVE decision feedback remains the explicit assessment mechanism.

## Read First Reveal Point
`Read First` reveals the circle when the ball crosses the net plane (`z = 0`).

The implementation should detect this using serve progress/trajectory rather than a hard-coded time so the reveal remains consistent across Easy, Medium, and Difficult serve speeds.

## Architecture
Keep the feature within existing game boundaries:

- `Ball` continues to own the canonical trajectory calculation.
- A new lightweight `TrajectoryGuide` scene component owns the Three.js floor-ring mesh, visibility, position, radius, and ownership styling.
- `Game` owns the selected guidance mode and decides when to show/update/hide the guide.
- `DecisionEngine` remains the source of expected ownership.
- `Hud` owns the mode selector only.

Do not duplicate trajectory physics in `TrajectoryGuide`. Reuse `Ball.getPosition(progress)` or a small shared helper based on the same scenario data.

## State Flow
1. App starts with guidance mode `Guided`.
2. A new serve scenario is generated.
3. Before and during serve flight, `Game` determines expected ownership from the current scenario and receiver formation.
4. In `Guided`, the guide becomes visible when the serve begins.
5. In `Read First`, the guide remains hidden until the ball reaches/crosses the net plane.
6. Each frame, the guide center updates from the predicted trajectory/contact projection and its radius shrinks with serve progress.
7. Guide styling reflects expected ownership: prominent for MINE, muted gray for LEAVE.
8. On feedback/new round/session reset, the guide is hidden/reset.

## Prediction Behavior
The guide should follow the trajectory's likely receiving point, not simply mirror the ball's current x/z position.

Use a forward-looking prediction derived from the active scenario so the target converges toward the final contact/landing area while still reflecting float/late movement. The prediction must remain deterministic for a given scenario and progress.

A practical implementation may sample the canonical ball trajectory at a future progress value between the current progress and 1.0, with the look-ahead window shrinking as the serve approaches contact. This avoids duplicating serve physics while making the guide behave like a prediction instead of a shadow directly under the ball.

## Visual Treatment
- Ring lies flat on the court surface and remains easy to see from the existing 3D camera.
- Use translucency and a ring/outline rather than an opaque filled disk so court and player visibility are preserved.
- MINE styling should be visibly stronger than LEAVE styling.
- LEAVE styling should be neutral gray and lower emphasis.
- Radius transitions and position changes should be smooth rather than snapping frame-to-frame.
- The target should remain readable on desktop and mobile-sized screens.

## Interaction With Existing Features
- Difficulty changes trajectory speed/movement as before; guide behavior follows the generated scenario automatically.
- Serve Type selection works unchanged.
- Existing large CORRECT/WRONG feedback remains unchanged.
- Existing bottom feedback remains unchanged.
- Existing scoring remains unchanged for this feature. The guide is training assistance, not an additional scoring input yet.
- Session CSV schemas remain unchanged.

## Testing
Add focused tests for:

- `Guided` being the default mode.
- Mode selector changing between `Guided` and `Read First`.
- Guided mode visibility from serve start.
- Read First remaining hidden before net crossing and visible at/after net crossing.
- Reveal logic being based on trajectory/net crossing rather than fixed milliseconds.
- Prediction center changing with serve progress and respecting float/late movement.
- Target diameter decreasing monotonically from approximately 2.0–2.5 m early to approximately 0.8–1.0 m near contact.
- MINE and LEAVE producing distinct prominent/muted visual states.
- New round and new session clearing the guide.

Run the full Vitest suite, production build, and Docker image build after integration.

## Non-Goals
- No full 3D line showing the entire flight path.
- No scoring bonus/penalty for standing inside the circle in this iteration.
- No persisted guidance preference across reloads.
- No third hidden/off mode in this iteration.
- No changes to ownership rules.
- No changes to CSV/session reporting.
