# Trajectory Guidance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shrinking, forward-looking floor target that guides player movement, with Guided as the default mode and Read First revealing at net crossing.

**Architecture:** Keep trajectory math canonical in `Ball`, isolate pure guide prediction/reveal/radius logic in `TrajectoryGuideModel`, and isolate the Three.js ring mesh in `TrajectoryGuide`. `Game` owns guidance mode and frozen serve-start ownership; `Hud` owns the selector only.

**Tech Stack:** Vite, vanilla JavaScript, Three.js, Vitest, existing Docker/nginx deployment.

## Global Constraints

- Player-facing modes are exactly `Guided` and `Read First`.
- `Guided` is the default on every fresh page load.
- `Guided` shows the guide from serve start; `Read First` reveals when the ball reaches/crosses net plane `z = 0`.
- Reveal depends on trajectory progress, not elapsed milliseconds.
- Early target diameter is about 2.4 m; near-contact target diameter is about 0.9 m and shrinks monotonically.
- Guide center is forward-looking and uses canonical `Ball.getPosition()` sampling so float and late movement affect prediction.
- MINE uses prominent styling; LEAVE uses muted gray styling.
- Ownership styling is frozen at serve start from receiver starting positions so player movement cannot change the guide's ownership cue.
- Existing scoring, MINE/LEAVE feedback, difficulty, serve type, session tracking, CSV schemas, and Docker interface remain unchanged.

---

### Task 1: Pure trajectory-guide model

**Files:**
- Create: `src/game/TrajectoryGuideModel.js`
- Create: `src/game/TrajectoryGuideModel.test.js`

**Interfaces:**
- `netCrossingProgress(scenario): number`
- `shouldShowGuide({ mode, progress, scenario }): boolean`
- `guideRadius(progress): number`
- `predictionProgress(progress): number`

- [ ] Write failing tests asserting Guided always shows during serve, Read First hides before computed net crossing and shows at/after it, radius decreases from 1.2 m to 0.45 m, and prediction progress is always ahead of current progress but converges to 1.
- [ ] Run `npm test -- --run src/game/TrajectoryGuideModel.test.js` and confirm failure because the module is missing.
- [ ] Implement the pure functions with clamped progress. Net crossing is `(0 - start.z) / (landing.z - start.z)`. Radius uses smoothstep interpolation from `1.2` to `0.45`. Prediction progress uses `t + (1 - t) * (0.72 - 0.32 * t)` clamped to `[t,1]`.
- [ ] Re-run the focused test and confirm pass.
- [ ] Commit.

### Task 2: Three.js floor-ring component

**Files:**
- Create: `src/game/TrajectoryGuide.js`
- Create: `src/game/TrajectoryGuide.test.js`

**Interfaces:**
- `new TrajectoryGuide(scene)`
- `update({ position, radius, ownership }): void`
- `hide(): void`
- `reset(): void`

- [ ] Write failing tests using `new TrajectoryGuide(null)` to verify state updates without WebGL: visibility, x/z, radius, and `mine|leave` ownership state.
- [ ] Implement a ring mesh with `THREE.RingGeometry(0.78, 1, 64)` rotated flat (`-Math.PI/2`), positioned slightly above the floor, scaled by radius, transparent, depth-write disabled. MINE material is bright/high-opacity; LEAVE is gray/lower-opacity.
- [ ] Ensure no scene is required for unit tests; component state still updates.
- [ ] Run focused tests and commit.

### Task 3: HUD guidance selector

**Files:**
- Modify: `index.html`
- Modify: `src/ui/Hud.js`
- Modify: `src/ui/Hud.test.js`

**Interfaces:**
- `Hud.onGuidanceModeChange(callback): void`
- `Hud.setGuidanceMode(mode): void`

- [ ] Add failing HUD tests for default `guided` value and emitting `readFirst` changes.
- [ ] Add a `Trajectory guide` selector with `Guided` selected and `Read First` as the second option.
- [ ] Add `guidanceMode` element wiring and the two methods to `Hud`.
- [ ] Run focused HUD tests and commit.

### Task 4: Game integration

**Files:**
- Modify: `src/game/Game.js`
- Create: `src/game/TrajectoryGuideIntegration.test.js`

**Interfaces:**
- `Game.selectedGuidanceMode` uses `guided | readFirst`.
- `Game.guideOwnership` is frozen per serve as `mine | leave`.

- [ ] Add a pure integration test that combines `Ball.getPosition(predictionProgress(t))`, `shouldShowGuide`, and `guideRadius`, verifying prediction center shifts for a float scenario and Read First reveal is based on net crossing.
- [ ] Construct `TrajectoryGuide`, default mode to `guided`, wire HUD selection, and reset/hide the guide on round reset and new session.
- [ ] In `beginServe()`, compute frozen ownership using `decideOwnership()` with receiver snapshots before any serve movement and store `expectedCall`.
- [ ] During serve frames, after updating the ball, compute current progress; if visibility rule passes, sample `Ball.getPosition(predictionProgress(progress))`, project x/z to the floor, compute shrinking radius, and call `trajectoryGuide.update({ position, radius, ownership: this.guideOwnership })`; otherwise hide it.
- [ ] Hide guide immediately on evaluation/feedback so the result UI remains visually dominant.
- [ ] Run focused integration tests and full Vitest suite; commit.

### Task 5: Build and Docker verification

- [ ] Run `npm run build`.
- [ ] Run `docker compose -f compose.yaml build --no-cache`.
- [ ] Verify manually: Guided visible from serve start; Read First appears at net crossing; ring shrinks; float serves shift target; MINE is prominent; LEAVE is muted; difficulty still works; End Session/CSV still works.
- [ ] If verification fixes are needed, commit them separately.
