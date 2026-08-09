# Post-Call Movement Phase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the round flow so trajectory guidance never appears before the ownership call, while a correct MINE enters a post-call movement phase and is scored only when the ball reaches the receive threshold.

**Architecture:** Freeze ownership at serve start, capture call/reaction state separately from final scoring, and add a `move` phase for correct MINE. Reuse the existing trajectory prediction/ring during `move`; replace the Guided/Read First selector with a simple On/Off assistance control.

**Tech Stack:** JavaScript ES modules, Three.js, Vitest, Vite, Docker/nginx.

## Global Constraints

- No trajectory guide is visible before a MINE/LEAVE call.
- Correct MINE: `serve -> move -> feedback`.
- Correct LEAVE, wrong call, or missed call: `serve -> feedback`.
- Ownership is frozen from receiver formation at serve start.
- Correct MINE reaction time is captured at call time; movement is scored at `ROUND_TIMING.decisionPlaneProgress`.
- Exactly one attempt record is written per serve.
- Trajectory Guide defaults to On and does not persist across reloads.
- No trajectory guide is shown for LEAVE, wrong calls, or missed calls.
- No new CSV fields.

---

### Task 1: Separate movement-required scoring

**Files:**
- Modify: `src/game/Scoring.js`
- Create: `src/game/Scoring.test.js`

**Interfaces:**
- Extend `scoreRound({ call, decision, player, landing, reactionMs, crossedLane=false, movementRequired=true })`.
- When `movementRequired === false`, award `SCORING.movementMax` so a correct LEAVE is not penalized for not chasing the ball.

- [ ] Write a failing test asserting correct LEAVE receives full movement points when `movementRequired:false` and correct MINE movement still varies with final player position.
- [ ] Run `npm test -- src/game/Scoring.test.js` and confirm the new case fails before implementation.
- [ ] Add the optional `movementRequired` branch without changing existing default behavior.
- [ ] Re-run the focused test and confirm pass.
- [ ] Commit as `feat: support deferred movement scoring`.

### Task 2: Replace guidance mode with On/Off assistance

**Files:**
- Modify: `index.html`
- Modify: `src/ui/Hud.js`
- Modify: `src/ui/Hud.test.js`

**Interfaces:**
- DOM selector remains `#guidance-mode` to minimize markup churn, but values become `on` and `off`.
- `Hud.onGuidanceModeChange(callback)` emits `on|off`.
- `Hud.setGuidanceMode(mode)` accepts `on|off`.

- [ ] Update HUD tests first: default `on`, emit `off` after change.
- [ ] Run focused HUD test and verify the old `guided/readFirst` implementation fails the new expectations.
- [ ] Change markup labels/options to `Trajectory Guide: On/Off` with On selected.
- [ ] Update `Hud.setGuidanceMode` validation to `on|off`.
- [ ] Re-run HUD tests and confirm pass.
- [ ] Commit as `feat: simplify trajectory guide control`.

### Task 3: Add round-state orchestration helper

**Files:**
- Create: `src/game/PostCallFlow.js`
- Create: `src/game/PostCallFlow.test.js`

**Interfaces:**
- `classifyCall({ call, decision })` returns `move` only for a correct MINE, otherwise `feedback`.
- `shouldFinalizeMove(progress)` returns true at/after `ROUND_TIMING.decisionPlaneProgress`.

- [ ] Write failing tests for correct MINE -> `move`, correct LEAVE/wrong/missed -> `feedback`, and progress-based move finalization.
- [ ] Run focused tests and verify failure because module does not exist.
- [ ] Implement the pure helper using `ROUND_TIMING.decisionPlaneProgress`.
- [ ] Re-run focused tests and confirm pass.
- [ ] Commit as `feat: define post-call round transitions`.

### Task 4: Integrate frozen ownership and post-call movement in Game

**Files:**
- Modify: `src/game/Game.js`
- Create: `src/game/PostCallFlowIntegration.test.js`

**Interfaces and state:**
- Add `this.roundDecision = null`.
- Add `this.pendingCall = null` and `this.pendingReactionMs = null`.
- At `beginServe`, freeze `this.roundDecision = decideOwnership(...)`; keep guide hidden.
- `evaluate(call, now)` becomes call capture/finalization orchestration:
  - ignore outside `serve`.
  - capture reaction from `roundStart`.
  - correct MINE => set pending call/reaction, `phase='move'`, show movement prompt, no attempt record, no result overlay.
  - all other outcomes => finalize immediately.
- Add `finalizeRound({ call, reactionMs, movementRequired, now })` that calls `scoreRound`, builds/records one attempt, updates aggregate score/streak, hides guide, and enters feedback.
- During `move`, continue `player.update`, `ball.update`, and update the guide only when selected guidance is `on`.
- At `decisionPlaneProgress`, finalize using the final player snapshot.
- Ignore M/L keys during `move`.
- Reset pending/frozen state in `resetRound` and `startNewSession`.

- [ ] Add focused integration tests for no pre-call guide, correct MINE deferral, correct LEAVE immediate finalization, wrong/missed immediate finalization, one attempt only, and progress-based completion.
- [ ] Run focused test and verify failures against current `Game` behavior/helper surface.
- [ ] Implement the state-machine change and use `roundDecision` everywhere instead of recomputing ownership after the player has moved.
- [ ] Keep `TrajectoryGuideModel.guideRadius` and `predictionProgress` unchanged and use them only during `move`.
- [ ] Re-run focused tests and confirm pass.
- [ ] Commit as `feat: add post-call movement phase`.

### Task 5: Remove obsolete pre-call guide behavior and verify

**Files:**
- Modify: `src/game/TrajectoryGuideModel.js`
- Modify: `src/game/TrajectoryGuideModel.test.js`
- Modify: `src/game/TrajectoryGuideIntegration.test.js`

**Interfaces:**
- Keep `guideRadius(progress)` and `predictionProgress(progress)`.
- Remove `netCrossingProgress` and `shouldShowGuide`; pre-call reveal modes are obsolete.

- [ ] Rewrite trajectory model tests around shrinking radius and forward prediction only.
- [ ] Remove obsolete net-crossing/reveal helpers and their tests.
- [ ] Run focused trajectory tests.
- [ ] Run full `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `docker build -t volleyball-trainer:post-call-move .`.
- [ ] Review `git diff` against this plan and the approved spec; verify no CSV schema changes and no guide path before a call.
- [ ] Commit as `refactor: remove pre-call guide modes`.

## Verification Checklist

- No ring before call.
- Correct MINE shows `Move`, keeps WASD active, and reveals ring only after the call when guide is On.
- Correct MINE with guide Off still enters movement and scores final position.
- Correct LEAVE ends immediately with full non-movement credit and no ring.
- Wrong and missed calls end immediately with no ring.
- Ownership cannot change after the player moves.
- Final movement position changes movement score.
- Exactly one attempt row per serve.
- Session pause/resume preserves move-phase flight timing.
- Full tests/build/Docker build pass before claiming completion.
