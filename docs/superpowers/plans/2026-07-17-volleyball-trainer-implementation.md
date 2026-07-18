# Volleyball Trainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based Three.js serve-receive trainer where a keyboard-controlled middle-back player reads randomized serves, moves with WASD, calls mine or leave, and receives consistent scoring and explanations.

**Architecture:** Use Vite as the application shell and Three.js for rendering. Keep domain logic—serve generation, ownership, scoring, and round-state transitions—independent from rendering so it can be unit-tested with Vitest. `Game` coordinates those modules, owns the animation loop, and updates a plain HTML HUD.

**Tech Stack:** Vite, JavaScript ES modules, Three.js, Vitest, plain HTML, plain CSS.

## Global Constraints

- Version 1 is desktop keyboard-only.
- Use a third-person camera behind and slightly above the controlled receiver.
- Movement is court-relative and uses `W`, `A`, `S`, and `D`.
- `M` calls **mine**; `L` calls **leave**; `R` restarts only after a round ends.
- Do not implement passing mechanics, multiplayer, mobile controls, accounts, saved progress, character animation, rigid-body physics, voice recognition, or match simulation.
- Each round awards at most 100 points: 60 decision, 25 movement, 15 reaction.
- The serve path must remain deterministic within a round and use a parametric curve with optional float drift.
- Show a visible startup error when WebGL initialization fails.
- Prevent duplicate decisions and ignore gameplay input during reset.

---

## File Map

- `package.json` — scripts and runtime/dev dependencies.
- `index.html` — root canvas container, HUD markup, and startup error region.
- `src/main.js` — application bootstrap and WebGL startup failure handling.
- `src/styles.css` — full-screen layout and HUD styling.
- `src/config.js` — court dimensions, receive formation, scoring constants, and timing constants.
- `src/math/vector2.js` — small dependency-free 2D vector helpers used by domain logic.
- `src/game/ServeGenerator.js` — validated randomized serve scenario creation.
- `src/game/Ball.js` — deterministic parametric ball trajectory.
- `src/game/DecisionEngine.js` — best-position ownership and explanations.
- `src/game/Scoring.js` — decision, movement, reaction, and crossing scores.
- `src/game/RoundState.js` — pure round-state transition rules.
- `src/input/Keyboard.js` — held movement keys and one-shot action events.
- `src/game/Court.js` — court, net, posts, lights, and background.
- `src/game/Player.js` — player mesh, court-relative movement, velocity, and bounds.
- `src/game/Teammate.js` — teammate mesh and receive-zone positioning.
- `src/ui/Hud.js` — score, streak, countdown, state, reaction time, and feedback.
- `src/game/Game.js` — animation loop, camera, state machine, and module coordination.
- `tests/serve-generator.test.js` — serve validation and bounds.
- `tests/ball.test.js` — deterministic trajectory behavior.
- `tests/decision-engine.test.js` — centered balls, seams, ties, and crossings.
- `tests/scoring.test.js` — score boundaries and movement quality.
- `tests/round-state.test.js` — legal transitions and duplicate-decision rejection.

---

### Task 1: Project Shell and Shared Configuration

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/styles.css`
- Create: `src/config.js`
- Create: `src/math/vector2.js`
- Create: `tests/vector2.test.js`

**Interfaces:**
- Produces: `COURT`, `FORMATION`, `ROUND_TIMING`, `SCORING`, `clamp(value, min, max)`, `distance(a, b)`, `subtract(a, b)`, `length(v)`, `normalize(v)`, and `dot(a, b)`.
- Consumes: none.

- [ ] **Step 1: Add the Vite/Vitest/Three.js project manifest**

Create `package.json`:

```json
{
  "name": "valleyball-trainer",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "three": "^0.179.0"
  },
  "devDependencies": {
    "vite": "^7.0.0",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 2: Add the initial DOM shell**

Create `index.html` with `#app`, `#game-canvas`, a HUD containing elements with IDs `score`, `streak`, `reaction`, `round-state`, `feedback`, and `controls`, plus a hidden `#startup-error`. Load `/src/main.js` as a module.

- [ ] **Step 3: Write failing vector helper tests**

Create `tests/vector2.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { clamp, distance, dot, normalize, subtract } from '../src/math/vector2.js';

describe('vector2 helpers', () => {
  it('clamps values to a closed interval', () => {
    expect(clamp(-2, 0, 10)).toBe(0);
    expect(clamp(4, 0, 10)).toBe(4);
    expect(clamp(12, 0, 10)).toBe(10);
  });

  it('computes distance and normalized direction', () => {
    expect(distance({ x: 0, z: 0 }, { x: 3, z: 4 })).toBe(5);
    expect(normalize(subtract({ x: 3, z: 4 }, { x: 0, z: 0 }))).toEqual({ x: 0.6, z: 0.8 });
  });

  it('returns a zero vector when normalizing zero length', () => {
    expect(normalize({ x: 0, z: 0 })).toEqual({ x: 0, z: 0 });
    expect(dot({ x: 1, z: 2 }, { x: 3, z: 4 })).toBe(11);
  });
});
```

- [ ] **Step 4: Run the test and verify it fails**

Run: `npm install && npm test -- tests/vector2.test.js`

Expected: FAIL because `src/math/vector2.js` does not exist.

- [ ] **Step 5: Implement shared math and configuration**

Create `src/math/vector2.js`:

```js
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function subtract(a, b) {
  return { x: a.x - b.x, z: a.z - b.z };
}

export function length(vector) {
  return Math.hypot(vector.x, vector.z);
}

export function distance(a, b) {
  return length(subtract(a, b));
}

export function normalize(vector) {
  const magnitude = length(vector);
  if (magnitude === 0) return { x: 0, z: 0 };
  return { x: vector.x / magnitude, z: vector.z / magnitude };
}

export function dot(a, b) {
  return a.x * b.x + a.z * b.z;
}
```

Create `src/config.js`:

```js
export const COURT = Object.freeze({
  halfWidth: 4.5,
  nearBaselineZ: 9,
  netZ: 0,
  playableMinZ: 3.1,
  playableMaxZ: 8.7,
  receiveMinX: -4.1,
  receiveMaxX: 4.1
});

export const FORMATION = Object.freeze({
  left: { id: 'left', x: -3, z: 6.8 },
  middle: { id: 'middle', x: 0, z: 7.2 },
  right: { id: 'right', x: 3, z: 6.8 }
});

export const ROUND_TIMING = Object.freeze({
  readyMs: 500,
  countdownMs: 1500,
  feedbackMs: 1800,
  defaultServeMs: 2600,
  decisionPlaneProgress: 0.88
});

export const SCORING = Object.freeze({
  decisionMax: 60,
  movementMax: 25,
  reactionMax: 15,
  crossingPenalty: 5,
  idealContactOffsetZ: 0.65
});
```

- [ ] **Step 6: Implement a minimal bootstrap and styling**

Create `src/main.js` to import `./styles.css`, detect WebGL by creating a temporary canvas context, display `#startup-error` on failure, and otherwise set `#round-state` to `Loading` until `Game` is added later.

Create `src/styles.css` with a full-window dark layout, canvas filling the viewport, an absolute HUD at the top left, feedback at the bottom center, and readable keyboard reminders.

- [ ] **Step 7: Run tests and production build**

Run: `npm test && npm run build`

Expected: all vector tests PASS and Vite build completes successfully.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json index.html src tests/vector2.test.js
git commit -m "chore: scaffold volleyball trainer"
```

---

### Task 2: Serve Scenario Generation and Ball Trajectory

**Files:**
- Create: `src/game/ServeGenerator.js`
- Create: `src/game/Ball.js`
- Create: `tests/serve-generator.test.js`
- Create: `tests/ball.test.js`

**Interfaces:**
- Consumes: `COURT`, `ROUND_TIMING`, and `clamp`.
- Produces: `createServeScenario({ rng, difficulty })`, `validateScenario(scenario)`, and class `Ball` with `start(scenario)`, `getPosition(progress)`, `getLandingPoint()`, and `reset()`.

- [ ] **Step 1: Write failing serve-generator tests**

Create `tests/serve-generator.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { COURT } from '../src/config.js';
import { createServeScenario, validateScenario } from '../src/game/ServeGenerator.js';

const fixedRng = (() => {
  const values = [0.1, 0.8, 0.4, 0.7, 0.2, 0.9];
  let index = 0;
  return () => values[index++ % values.length];
})();

describe('ServeGenerator', () => {
  it('creates a valid deterministic serve inside receive bounds', () => {
    const scenario = createServeScenario({ rng: fixedRng, difficulty: 'normal' });
    expect(validateScenario(scenario)).toBe(true);
    expect(scenario.landing.x).toBeGreaterThanOrEqual(COURT.receiveMinX);
    expect(scenario.landing.x).toBeLessThanOrEqual(COURT.receiveMaxX);
    expect(scenario.landing.z).toBeGreaterThanOrEqual(COURT.playableMinZ);
    expect(scenario.landing.z).toBeLessThanOrEqual(COURT.playableMaxZ);
  });

  it('rejects invalid landing coordinates', () => {
    expect(validateScenario({
      start: { x: 0, y: 3, z: -8 },
      landing: { x: 20, z: 7 },
      durationMs: 2500,
      arcHeight: 3,
      drift: 0,
      floatOffset: 0
    })).toBe(false);
  });
});
```

- [ ] **Step 2: Write failing ball tests**

Create `tests/ball.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { Ball } from '../src/game/Ball.js';

const scenario = {
  start: { x: 0, y: 3.2, z: -8 },
  landing: { x: 1.5, z: 7 },
  durationMs: 2400,
  arcHeight: 3.5,
  drift: 0.2,
  floatOffset: -0.15
};

describe('Ball', () => {
  it('starts at the server and ends at the landing point', () => {
    const ball = new Ball();
    ball.start(scenario);
    expect(ball.getPosition(0)).toEqual(scenario.start);
    const end = ball.getPosition(1);
    expect(end.x).toBeCloseTo(scenario.landing.x);
    expect(end.y).toBeCloseTo(0.75);
    expect(end.z).toBeCloseTo(scenario.landing.z);
  });

  it('is deterministic for the same scenario and progress', () => {
    const ball = new Ball();
    ball.start(scenario);
    expect(ball.getPosition(0.63)).toEqual(ball.getPosition(0.63));
  });
});
```

- [ ] **Step 3: Run tests and verify failure**

Run: `npm test -- tests/serve-generator.test.js tests/ball.test.js`

Expected: FAIL because the modules do not exist.

- [ ] **Step 4: Implement validated scenario generation**

Implement `createServeScenario` using predefined receive-zone centers—left, left seam, middle, right seam, right, short, and deep—then apply bounded random jitter. Difficulty controls duration and maximum drift. Return:

```js
{
  start: { x, y, z },
  landing: { x, z },
  durationMs,
  arcHeight,
  drift,
  floatOffset
}
```

`validateScenario` must verify finite numeric values, positive duration, and landing bounds. If validation fails, `createServeScenario` returns this fallback:

```js
{
  start: { x: 0, y: 3.2, z: -8 },
  landing: { x: 0, z: 7.2 },
  durationMs: 2600,
  arcHeight: 3.2,
  drift: 0,
  floatOffset: 0
}
```

- [ ] **Step 5: Implement deterministic parametric ball movement**

Implement `Ball.getPosition(progress)` by clamping progress to `[0, 1]`, linearly interpolating start to landing, adding `sin(πt) * arcHeight` to height, adding `sin(2πt) * drift` to x, and applying `floatOffset * smoothstep(0.62, 1, t)` to x. Use terminal height `0.75` meters.

- [ ] **Step 6: Run tests**

Run: `npm test -- tests/serve-generator.test.js tests/ball.test.js`

Expected: all serve and ball tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/game/ServeGenerator.js src/game/Ball.js tests/serve-generator.test.js tests/ball.test.js
git commit -m "feat: add deterministic serve model"
```

---

### Task 3: Ownership Decision and Scoring Logic

**Files:**
- Create: `src/game/DecisionEngine.js`
- Create: `src/game/Scoring.js`
- Create: `tests/decision-engine.test.js`
- Create: `tests/scoring.test.js`

**Interfaces:**
- Consumes: `FORMATION`, `SCORING`, `distance`, `dot`, `normalize`, and `subtract`.
- Produces: `evaluateOwnership({ landing, receivers, controlledId })` returning `{ expectedCall, ownerId, confidence, explanation, candidates }`; `scoreRound({ userCall, ownership, controlledReceiver, landing, reactionMs, serveDurationMs })` returning `{ total, decision, movement, reaction, penalty, feedback }`.

- [ ] **Step 1: Write failing ownership tests**

Create `tests/decision-engine.test.js` covering:

```js
import { describe, expect, it } from 'vitest';
import { evaluateOwnership } from '../src/game/DecisionEngine.js';

const receivers = [
  { id: 'left', position: { x: -3, z: 6.8 }, velocity: { x: 0, z: 0 }, reachRadius: 2.4 },
  { id: 'middle', position: { x: 0, z: 7.2 }, velocity: { x: 0, z: 0 }, reachRadius: 2.5 },
  { id: 'right', position: { x: 3, z: 6.8 }, velocity: { x: 0, z: 0 }, reachRadius: 2.4 }
];

it('assigns a centered ball to the middle receiver', () => {
  const result = evaluateOwnership({ landing: { x: 0, z: 7 }, receivers, controlledId: 'middle' });
  expect(result.ownerId).toBe('middle');
  expect(result.expectedCall).toBe('mine');
});

it('assigns a left-centered ball to the left receiver', () => {
  const result = evaluateOwnership({ landing: { x: -3, z: 6.9 }, receivers, controlledId: 'middle' });
  expect(result.ownerId).toBe('left');
  expect(result.expectedCall).toBe('leave');
});

it('uses middle priority only for an effective seam tie', () => {
  const result = evaluateOwnership({ landing: { x: -1.45, z: 7 }, receivers, controlledId: 'middle' });
  expect(['left', 'middle']).toContain(result.ownerId);
  expect(result.confidence).toMatch(/low|medium/);
});
```

Add a crossing test where the middle receiver is moving sharply left across the left receiver's lane and ownership remains with the left receiver.

- [ ] **Step 2: Write failing scoring tests**

Create `tests/scoring.test.js` with exact boundary checks:

```js
import { describe, expect, it } from 'vitest';
import { scoreRound } from '../src/game/Scoring.js';

const ownership = {
  expectedCall: 'mine',
  ownerId: 'middle',
  confidence: 'high',
  explanation: 'You had the cleanest angle.'
};

it('awards 100 for a correct early call from the ideal point', () => {
  const result = scoreRound({
    userCall: 'mine',
    ownership,
    controlledReceiver: {
      id: 'middle',
      position: { x: 0, z: 7.65 },
      velocity: { x: 0, z: -0.2 },
      crossedLane: false
    },
    landing: { x: 0, z: 7 },
    reactionMs: 500,
    serveDurationMs: 2500
  });
  expect(result.total).toBe(100);
});

it('awards zero decision points for the wrong call', () => {
  const result = scoreRound({
    userCall: 'leave',
    ownership,
    controlledReceiver: {
      id: 'middle',
      position: { x: 0, z: 7.65 },
      velocity: { x: 0, z: 0 },
      crossedLane: false
    },
    landing: { x: 0, z: 7 },
    reactionMs: 500,
    serveDurationMs: 2500
  });
  expect(result.decision).toBe(0);
  expect(result.total).toBeLessThanOrEqual(40);
});
```

Also test reaction score at 20%, 60%, and 88% of serve duration, plus crossing penalty.

- [ ] **Step 3: Run tests and verify failure**

Run: `npm test -- tests/decision-engine.test.js tests/scoring.test.js`

Expected: FAIL because both modules are missing.

- [ ] **Step 4: Implement ownership ranking**

For each receiver, calculate:

```text
base cost = path distance
+ backward/sideways movement penalty
+ crossing-lane penalty
- small middle tie priority
```

Define `approachDirection` from receiver to an ideal point `landing.z + SCORING.idealContactOffsetZ`. Penalize velocity whose normalized dot product with the approach direction is below `-0.25`. Penalize a receiver when their x-path crosses another receiver's starting x and that other receiver is closer to the landing point. Sort candidates by total cost. Confidence is `high` when the first-to-second cost gap is at least `0.8`, `medium` at least `0.35`, otherwise `low`.

Generate explanations that name centered balls, seam ties, clean approach angles, and crossing penalties.

- [ ] **Step 5: Implement scoring**

Decision: 60 only when `userCall === ownership.expectedCall`.

Movement for `mine`: calculate distance from controlled position to `{ x: landing.x, z: landing.z + 0.65 }`; award 25 at distance `<= 0.35`, linearly decline to 0 at distance `>= 2.2`, and subtract 5 for moving away or crossing a lane.

Movement for `leave`: award 25 when the player stayed at least `0.9` meters from the owning teammate's lane; otherwise scale down to 0.

Reaction: award 15 at normalized call time `<= 0.30`, linearly decline to 0 at `>= 0.88`.

Clamp total to `[0, 100]` and return feedback containing both the ownership explanation and one movement cue.

- [ ] **Step 6: Run tests**

Run: `npm test -- tests/decision-engine.test.js tests/scoring.test.js`

Expected: all decision and scoring tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/game/DecisionEngine.js src/game/Scoring.js tests/decision-engine.test.js tests/scoring.test.js
git commit -m "feat: add ownership and scoring engine"
```

---

### Task 4: Round State and Keyboard Input

**Files:**
- Create: `src/game/RoundState.js`
- Create: `src/input/Keyboard.js`
- Create: `tests/round-state.test.js`

**Interfaces:**
- Consumes: none.
- Produces: `ROUND_STATES`, class `RoundState` with `beginCountdown(now)`, `beginServe(now)`, `recordDecision(call, now)`, `beginFeedback(now)`, `beginReset(now)`, `markReady(now)`, `canMove()`, and `canDecide()`; class `Keyboard` with `movement`, `consumeDecision()`, `consumeRestart()`, and `dispose()`.

- [ ] **Step 1: Write failing round-state tests**

Create `tests/round-state.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { ROUND_STATES, RoundState } from '../src/game/RoundState.js';

describe('RoundState', () => {
  it('follows the legal ready-to-reset sequence', () => {
    const state = new RoundState();
    expect(state.value).toBe(ROUND_STATES.READY);
    state.beginCountdown(100);
    state.beginServe(200);
    expect(state.canMove()).toBe(true);
    expect(state.recordDecision('mine', 500)).toBe(true);
    state.beginFeedback(600);
    state.beginReset(900);
    state.markReady(1000);
    expect(state.value).toBe(ROUND_STATES.READY);
  });

  it('rejects duplicate decisions', () => {
    const state = new RoundState();
    state.beginCountdown(0);
    state.beginServe(100);
    expect(state.recordDecision('mine', 300)).toBe(true);
    expect(state.recordDecision('leave', 400)).toBe(false);
    expect(state.decision.call).toBe('mine');
  });
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- tests/round-state.test.js`

Expected: FAIL because `RoundState.js` does not exist.

- [ ] **Step 3: Implement explicit state transitions**

Use frozen values `ready`, `countdown`, `serve`, `decision`, `feedback`, and `reset`. Throw an `Error` on illegal transition methods. Permit movement only in `serve` and `decision`; permit decisions only once in `serve` or `decision`. Store `{ call, timestamp }` on the first accepted call.

- [ ] **Step 4: Implement keyboard input**

`Keyboard` listens to `keydown`/`keyup`, tracks movement booleans for WASD, queues one-shot `mine`, `leave`, and `restart` actions, ignores repeated action keydown events, calls `preventDefault()` for handled keys, and removes listeners in `dispose()`.

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/round-state.test.js`

Expected: all round-state tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/RoundState.js src/input/Keyboard.js tests/round-state.test.js
git commit -m "feat: add round state and keyboard controls"
```

---

### Task 5: Three.js Court, Players, Camera, and HUD

**Files:**
- Create: `src/game/Court.js`
- Create: `src/game/Player.js`
- Create: `src/game/Teammate.js`
- Create: `src/ui/Hud.js`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `THREE`, `COURT`, `FORMATION`, and `clamp`.
- Produces: class `Court` with `group` and `dispose()`; class `Player` with `group`, `position2D`, `velocity2D`, `update(deltaSeconds, movement, enabled)`, `reset(position)`, and `crossedLane`; class `Teammate` with the same read-only position/velocity shape plus `update(deltaSeconds, target)`; class `Hud` with `setScore`, `setStreak`, `setReaction`, `setRoundState`, `setCountdown`, and `setFeedback`.

- [ ] **Step 1: Implement the indoor court scene**

Create a `THREE.Group` containing an 18 m × 9 m court, contrasting receive-side floor, white boundary and center lines, net plane at `z = 0`, two posts, ambient light, directional light, and a neutral background plane. Use primitive geometries only.

- [ ] **Step 2: Implement the controlled player**

Build the player from a capsule-like body using cylinder and sphere primitives. Update x/z from normalized WASD input at `4.6 m/s`; clamp to receive bounds; calculate velocity each frame; face the net; track whether x movement crossed either teammate's current lane by more than `0.25 m`.

- [ ] **Step 3: Implement teammates**

Use the same simple mesh with a different material. Each teammate eases toward an assigned target at no more than `2.6 m/s`, exposes current velocity, and resets to left/right formation points.

- [ ] **Step 4: Implement HUD adapter**

Cache the required DOM elements in the constructor and update text only when a value changes. `setFeedback(message, tone)` applies one of `neutral`, `success`, `warning`, or `error` classes.

- [ ] **Step 5: Complete responsive desktop styling**

Ensure the canvas fills the viewport, the HUD remains readable at 1024×600 and above, the feedback panel does not cover the player, and the startup-error element visibly replaces the canvas when active.

- [ ] **Step 6: Run unit tests and build**

Run: `npm test && npm run build`

Expected: all unit tests PASS and production build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/game/Court.js src/game/Player.js src/game/Teammate.js src/ui/Hud.js src/styles.css
git commit -m "feat: render court and receivers"
```

---

### Task 6: Game Loop, Camera, Round Flow, and Evaluation

**Files:**
- Create: `src/game/Game.js`
- Modify: `src/main.js`
- Modify: `src/game/Ball.js`
- Modify: `src/ui/Hud.js`

**Interfaces:**
- Consumes: all previous task interfaces.
- Produces: class `Game` with `start()`, `stop()`, `dispose()`, and internal round orchestration.

- [ ] **Step 1: Add a Three.js ball mesh adapter**

Extend `Ball` so its constructor optionally accepts a `THREE.Mesh`, `start()` makes the mesh visible, `updateMesh(progress)` copies `getPosition(progress)` into the mesh position, and `reset()` hides the mesh. Keep trajectory functions independent of Three.js so existing tests remain unchanged.

- [ ] **Step 2: Build the game scene and renderer**

In `Game` create the renderer, scene, perspective camera, court, player, teammates, server marker, ball mesh, keyboard input, HUD, round state, and score/streak totals. Set pixel ratio to `min(devicePixelRatio, 2)` and attach a resize listener.

- [ ] **Step 3: Implement the third-person camera**

Each frame, ease the camera toward `{ x: player.x * 0.35, y: 5.2, z: player.z + 6.2 }` and look at `{ x: player.x * 0.2, y: 1.4, z: 0 }`. Clamp interpolation delta so tab resumption cannot cause a camera jump.

- [ ] **Step 4: Implement automatic round timing**

The animation loop must progress:

```text
ready -> countdown -> serve/read -> decision/evaluation -> feedback -> reset -> ready
```

Show a 3-2-1 countdown, generate one scenario per round, start the ball once, and automatically begin the next round after `feedbackMs`. During reset, ignore movement and decisions.

- [ ] **Step 5: Implement movement and teammate positioning**

While the serve is active, update the controlled player from keyboard state. Give teammates modest target adjustments toward their likely receive zones without letting them instantly solve the drill. Their positions and velocities must be passed into `evaluateOwnership` at decision time.

- [ ] **Step 6: Implement calls and deadline handling**

Consume `M`/`L` once per frame. Accept the first call before `decisionPlaneProgress`; reject later calls and evaluate them as late. If no call is made by the deadline, evaluate with `userCall: null`. Do not permit a second result in the same round.

- [ ] **Step 7: Evaluate and update HUD**

At evaluation, call `evaluateOwnership`, then `scoreRound`. Add the round total to cumulative score. Increment streak only for the correct ownership call; otherwise reset it. Freeze player and ball during feedback. Display reaction milliseconds or `Late`, round points, ownership explanation, and movement cue.

- [ ] **Step 8: Wire restart behavior**

Permit `R` only during feedback. It must reset the current formation and start a new countdown without duplicating animation loops or event listeners.

- [ ] **Step 9: Wire application startup**

Update `src/main.js` to instantiate `Game` with the canvas and HUD root, call `start()`, display a detailed startup error on exception, and dispose the game on `beforeunload`.

- [ ] **Step 10: Run all automated checks**

Run: `npm test && npm run build`

Expected: all tests PASS and the production build succeeds.

- [ ] **Step 11: Commit**

```bash
git add src/main.js src/game/Game.js src/game/Ball.js src/ui/Hud.js
git commit -m "feat: add playable serve receive rounds"
```

---

### Task 7: Acceptance Verification and Project Documentation

**Files:**
- Create: `README.md`
- Modify: tests only if acceptance verification exposes a real domain-logic defect.

**Interfaces:**
- Consumes: complete application.
- Produces: documented installation, controls, architecture, and verified release candidate.

- [ ] **Step 1: Document local setup and controls**

Create `README.md` with:

```text
npm install
npm run dev
npm test
npm run build
```

Document WASD, M, L, R, the mine/leave training goal, scoring weights, and version-1 exclusions.

- [ ] **Step 2: Verify the development experience**

Run: `npm run dev -- --host 127.0.0.1`

Verify manually:

1. The app reaches countdown without console errors.
2. WASD moves smoothly and remains inside the receive half.
3. The camera follows without hiding the player or incoming ball.
4. The complete ball flight remains visible.
5. M or L creates exactly one result.
6. A late or absent call displays `Late`.
7. Feedback agrees with the visible receiver positions.
8. Automatic reset restores all three receivers and starts another round.
9. R during feedback starts a clean new countdown.
10. R during active play is ignored.

- [ ] **Step 3: Verify randomized scenario coverage**

Play at least 30 rounds and confirm the sample includes left, left seam, middle, right seam, right, short, deep, and lateral-movement serves. Confirm every landing remains inside the receiving court.

- [ ] **Step 4: Run final automated verification**

Run: `npm test && npm run build`

Expected: all tests PASS and Vite reports a successful production build.

- [ ] **Step 5: Inspect the production bundle**

Run: `npm run preview -- --host 127.0.0.1`

Expected: the built app loads and supports repeated complete rounds with the same behavior as development mode.

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: add setup and gameplay guide"
```

---

## Final Verification Checklist

- [ ] `npm test` passes all vector, serve, trajectory, ownership, scoring, and state tests.
- [ ] `npm run build` succeeds without warnings that indicate broken imports or missing assets.
- [ ] WebGL startup failure produces a visible error instead of a blank screen.
- [ ] Player movement is court-relative and bounded.
- [ ] Camera remains behind/above the player and faces the net.
- [ ] Serves vary in direction, depth, speed, arc, and float drift.
- [ ] M/L accepts only one call per round.
- [ ] Late calls are scored as late.
- [ ] Ownership uses position, velocity, approach angle, crossing penalty, and middle tie priority.
- [ ] Each round score is capped at 100 with 60/25/15 weighting.
- [ ] Feedback explains both ownership and movement quality.
- [ ] R works only after the round ends.
- [ ] Repeated automatic resets do not duplicate loops or listeners.
