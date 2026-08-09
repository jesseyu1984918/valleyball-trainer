# Movement Circle Assessment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Assess a correct-MINE movement attempt against the exact final trajectory target circle and report IN POSITION, CLOSE, or MISSED POSITION while deriving movement points from the same geometry.

**Architecture:** Add one pure movement-assessment module that accepts player position/body radius and target center/radius. `Game` will capture the final predicted guide target at the receive threshold, call the assessment, pass its movement points into scoring, and append its label to final feedback. The assessment must work identically whether the trajectory guide is visible or disabled.

**Tech Stack:** JavaScript ES modules, Three.js, Vitest, Vite, Docker/GHCR existing pipeline.

## Global Constraints

- Player body radius is `0.28 m`, matching the existing `THREE.CapsuleGeometry(0.28, ...)`.
- Final guide radius comes from `guideRadius(progress)` and converges to `0.45 m` at progress `1`.
- `IN POSITION` means player-body overlap/touch: center distance `<= targetRadius + playerRadius`.
- `CLOSE` means outside the overlap boundary by at most `0.5 m`.
- `MISSED POSITION` means more than `0.5 m` outside the overlap boundary.
- Full movement score is `SCORING.movementMax` for IN POSITION.
- CLOSE movement score decreases linearly from full score at the overlap boundary to `0` at the outer edge of the 0.5 m CLOSE band.
- MISSED POSITION receives `0` movement points.
- Correct LEAVE behavior is unchanged and does not require movement assessment.
- Wrong/missed calls are unchanged and do not enter the post-call movement assessment.
- Trajectory Guide Off hides only the visual ring; assessment still uses the same predicted target geometry.

---

### Task 1: Pure movement-circle assessment

**Files:**
- Create: `src/game/MovementAssessment.js`
- Create: `src/game/MovementAssessment.test.js`
- Modify: `src/config.js`

**Interfaces:**
- Produces: `assessMovement({ player, target, playerRadius? }) -> { status, distance, outsideDistance, movementPoints }`
- `target` shape: `{ x: number, z: number, radius: number }`
- `status`: `'in-position' | 'close' | 'missed'`

- [ ] **Step 1: Write the failing tests**

```js
import { describe, expect, it } from 'vitest';
import { SCORING } from '../config.js';
import { assessMovement } from './MovementAssessment.js';

const target = { x: 0, z: 7, radius: 0.45 };

describe('assessMovement', () => {
  it('counts body overlap with the target circle as in position', () => {
    const result = assessMovement({ player: { x: 0.72, z: 7 }, target });
    expect(result.status).toBe('in-position');
    expect(result.movementPoints).toBe(SCORING.movementMax);
    expect(result.outsideDistance).toBe(0);
  });

  it('classifies up to 0.5m outside the overlap boundary as close', () => {
    const result = assessMovement({ player: { x: 0.98, z: 7 }, target });
    expect(result.status).toBe('close');
    expect(result.outsideDistance).toBeCloseTo(0.25);
    expect(result.movementPoints).toBeGreaterThan(0);
    expect(result.movementPoints).toBeLessThan(SCORING.movementMax);
  });

  it('classifies beyond the close band as missed', () => {
    const result = assessMovement({ player: { x: 1.3, z: 7 }, target });
    expect(result.status).toBe('missed');
    expect(result.outsideDistance).toBeCloseTo(0.57);
    expect(result.movementPoints).toBe(0);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- src/game/MovementAssessment.test.js`

Expected: FAIL because `MovementAssessment.js` does not exist.

- [ ] **Step 3: Add explicit assessment constants**

Add to `SCORING` in `src/config.js`:

```js
playerBodyRadius: 0.28,
closePositionBand: 0.5,
```

- [ ] **Step 4: Implement the pure assessment**

```js
import { SCORING } from '../config.js';
import { clamp, distance } from '../math/vector2.js';

export function assessMovement({
  player,
  target,
  playerRadius = SCORING.playerBodyRadius
}) {
  const centerDistance = distance(player, target);
  const overlapBoundary = target.radius + playerRadius;
  const outsideDistance = Math.max(0, centerDistance - overlapBoundary);

  if (outsideDistance === 0) {
    return {
      status: 'in-position',
      distance: centerDistance,
      outsideDistance: 0,
      movementPoints: SCORING.movementMax
    };
  }

  if (outsideDistance <= SCORING.closePositionBand) {
    return {
      status: 'close',
      distance: centerDistance,
      outsideDistance,
      movementPoints: Math.round(
        SCORING.movementMax * clamp(1 - outsideDistance / SCORING.closePositionBand, 0, 1)
      )
    };
  }

  return {
    status: 'missed',
    distance: centerDistance,
    outsideDistance,
    movementPoints: 0
  };
}
```

- [ ] **Step 5: Run the focused test and verify it passes**

Run: `npm test -- src/game/MovementAssessment.test.js`

Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/config.js src/game/MovementAssessment.js src/game/MovementAssessment.test.js
git commit -m "feat: assess movement against target circle"
```

---

### Task 2: Let scoring consume the circle-derived movement score

**Files:**
- Modify: `src/game/Scoring.js`
- Modify: `src/game/Scoring.test.js`

**Interfaces:**
- Extends `scoreRound(...)` with optional `movementPointsOverride`.
- Existing callers without the override retain current behavior.

- [ ] **Step 1: Add a failing scoring test**

Append to `src/game/Scoring.test.js`:

```js
it('uses an explicit movement score from circle assessment', () => {
  const result = scoreRound({
    call: 'mine',
    decision: mineDecision,
    player: { x: 4, z: 8 },
    landing,
    reactionMs: 800,
    movementPointsOverride: 17
  });
  expect(result.movementPoints).toBe(17);
});
```

- [ ] **Step 2: Run the focused scoring test and verify it fails**

Run: `npm test -- src/game/Scoring.test.js`

Expected: FAIL because the override is ignored.

- [ ] **Step 3: Implement the override without changing LEAVE behavior**

Extend the signature:

```js
movementRequired = true,
movementPointsOverride = null
```

Change movement selection to:

```js
if (!movementRequired) {
  movementPoints = SCORING.movementMax;
} else if (movementPointsOverride !== null) {
  movementPoints = movementPointsOverride;
} else if (decision.expectedCall === 'mine') {
  // existing fallback distance scoring
```

- [ ] **Step 4: Run scoring tests**

Run: `npm test -- src/game/Scoring.test.js`

Expected: PASS, including existing correct-LEAVE and fallback-MINE tests.

- [ ] **Step 5: Commit**

```bash
git add src/game/Scoring.js src/game/Scoring.test.js
git commit -m "feat: accept assessed movement score"
```

---

### Task 3: Build movement-result feedback copy

**Files:**
- Create: `src/ui/MovementFeedback.js`
- Create: `src/ui/MovementFeedback.test.js`

**Interfaces:**
- Produces: `buildMovementFeedback(assessment) -> string`

- [ ] **Step 1: Write failing copy tests**

```js
import { describe, expect, it } from 'vitest';
import { buildMovementFeedback } from './MovementFeedback.js';

describe('buildMovementFeedback', () => {
  it('reports in-position success', () => {
    expect(buildMovementFeedback({ status: 'in-position', outsideDistance: 0 }))
      .toBe('IN POSITION ✓');
  });

  it('reports close distance outside the circle', () => {
    expect(buildMovementFeedback({ status: 'close', outsideDistance: 0.34 }))
      .toBe('CLOSE — 0.3 m OUTSIDE');
  });

  it('reports missed distance outside the circle', () => {
    expect(buildMovementFeedback({ status: 'missed', outsideDistance: 1.08 }))
      .toBe('MISSED POSITION — 1.1 m OUTSIDE');
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- src/ui/MovementFeedback.test.js`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement feedback formatting**

```js
export function buildMovementFeedback({ status, outsideDistance }) {
  if (status === 'in-position') return 'IN POSITION ✓';
  const meters = outsideDistance.toFixed(1);
  if (status === 'close') return `CLOSE — ${meters} m OUTSIDE`;
  return `MISSED POSITION — ${meters} m OUTSIDE`;
}
```

- [ ] **Step 4: Run and verify pass**

Run: `npm test -- src/ui/MovementFeedback.test.js`

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/MovementFeedback.js src/ui/MovementFeedback.test.js
git commit -m "feat: add movement assessment feedback"
```

---

### Task 4: Integrate final predicted circle with Game finalization

**Files:**
- Modify: `src/game/Game.js`
- Modify: `src/game/PostCallFinalize.test.js`

**Interfaces:**
- Consumes: `assessMovement(...)`, `buildMovementFeedback(...)`, `guideRadius(progress)`, existing trajectory prediction.
- `finalizeRound(...)` receives optional `movementTarget` with `{ x, z, radius }` for correct-MINE movement finalization.

- [ ] **Step 1: Extend finalization tests with target-circle behavior**

Update the test fixture so `hud.showDecisionResult` is observable and add:

```js
it('uses the receive target circle to score and report movement', () => {
  const { game, recordAttempt } = makeFinalizer({ x: 0.6, z: 7 });

  Game.prototype.finalizeRound.call(game, {
    call: 'mine',
    reactionMs: 600,
    movementRequired: true,
    movementTarget: { x: 0, z: 7, radius: 0.45 },
    now: 1900
  });

  const attempt = recordAttempt.mock.calls[0][0];
  expect(attempt.movement_points).toBe(25);
  expect(game.hud.showDecisionResult).toHaveBeenCalledWith(
    expect.objectContaining({ text: expect.stringContaining('IN POSITION') })
  );
});

it('reports a missed final position from the same target geometry', () => {
  const { game, recordAttempt } = makeFinalizer({ x: 2, z: 7 });

  Game.prototype.finalizeRound.call(game, {
    call: 'mine',
    reactionMs: 600,
    movementRequired: true,
    movementTarget: { x: 0, z: 7, radius: 0.45 },
    now: 1900
  });

  const attempt = recordAttempt.mock.calls[0][0];
  expect(attempt.movement_points).toBe(0);
  expect(game.hud.showDecisionResult).toHaveBeenCalledWith(
    expect.objectContaining({ text: expect.stringContaining('MISSED POSITION') })
  );
});
```

- [ ] **Step 2: Run the integration test and verify failure**

Run: `npm test -- src/game/PostCallFinalize.test.js`

Expected: FAIL because `finalizeRound` does not yet assess `movementTarget`.

- [ ] **Step 3: Add imports and assess only correct-MINE movement attempts**

Add:

```js
import { assessMovement } from './MovementAssessment.js';
import { buildMovementFeedback } from '../ui/MovementFeedback.js';
```

Inside `finalizeRound`, before `scoreRound`:

```js
const movementAssessment = movementRequired && movementTarget && this.roundDecision.expectedCall === 'mine'
  ? assessMovement({ player: this.player.snapshot(), target: movementTarget })
  : null;
```

Pass:

```js
movementPointsOverride: movementAssessment?.movementPoints ?? null
```

to `scoreRound`.

- [ ] **Step 4: Append movement assessment to the large result**

Build the existing decision feedback first:

```js
const decisionFeedback = buildDecisionFeedback({
  correct: result.correct,
  expectedCall: this.roundDecision.expectedCall
});
```

For an assessed correct MINE:

```js
const movementText = movementAssessment ? buildMovementFeedback(movementAssessment) : null;
this.hud.showDecisionResult({
  ...decisionFeedback,
  text: movementText ? `${decisionFeedback.text}\n${movementText}` : decisionFeedback.text
});
```

Update `#decision-result` CSS with `white-space: pre-line;` so the movement line renders beneath the decision line.

- [ ] **Step 5: Pass the final predicted target at receive threshold**

In the `move` branch of the game loop, when `shouldFinalizeMove(progress)` becomes true, compute the target using the same trajectory functions used by `updateTrajectoryGuide`:

```js
const targetProgress = predictionProgress(progress);
const targetPosition = this.ball.positionAt(targetProgress);
const movementTarget = {
  x: targetPosition.x,
  z: targetPosition.z,
  radius: guideRadius(progress)
};
```

Then finalize with:

```js
this.finalizeRound({
  call: this.pendingCall,
  reactionMs: this.pendingReactionMs,
  movementRequired: true,
  movementTarget,
  now
});
```

This calculation must happen even when `selectedGuidanceMode === 'off'`; visibility must not affect assessment.

- [ ] **Step 6: Run focused post-call tests**

Run: `npm test -- src/game/PostCallFinalize.test.js src/game/PostCallFlowIntegration.test.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/game/Game.js src/game/PostCallFinalize.test.js src/styles.css
git commit -m "feat: score final movement against guide circle"
```

---

### Task 5: Regression and Docker verification

**Files:**
- No new production files expected.

**Interfaces:**
- Verifies the complete feature and existing game behavior.

- [ ] **Step 1: Run all tests**

Run: `npm test`

Expected: all Vitest suites PASS.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: Vite build exits `0` and produces `dist/`.

- [ ] **Step 3: Build the Docker image locally**

Run:

```bash
docker build -t volleyball-trainer:movement-assessment .
```

Expected: image build exits `0`; the Dockerfile test/build gate passes.

- [ ] **Step 4: Smoke-test the container**

Run:

```bash
docker run --rm -d --name volleyball-trainer-assessment -p 8080:8080 volleyball-trainer:movement-assessment
```

Open the app and verify one correct-MINE attempt in each case:

1. Player body touches/overlaps final circle -> `IN POSITION ✓` and full movement points.
2. Player stops slightly outside -> `CLOSE — X.X m OUTSIDE` and partial movement points.
3. Player remains far away -> `MISSED POSITION — X.X m OUTSIDE` and zero movement points.
4. With Trajectory Guide Off, scoring classifications remain identical for equivalent positions.
5. Correct LEAVE still finishes immediately without movement assessment.

Stop the smoke container:

```bash
docker stop volleyball-trainer-assessment
```

- [ ] **Step 5: Confirm GHCR publish after pushing `main`**

The existing workflow should publish the successful `main` image as:

```bash
ghcr.io/jesseyu1984918/valleyball-trainer:latest
```

Verify from a Docker host:

```bash
docker pull ghcr.io/jesseyu1984918/valleyball-trainer:latest
```

Expected: pull succeeds and reports the latest manifest/image digest.
