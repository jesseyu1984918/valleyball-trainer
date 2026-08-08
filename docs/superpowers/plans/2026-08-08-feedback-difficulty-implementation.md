# Feedback Visibility and Difficulty Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make MINE/LEAVE assessment immediately visible with a temporary centered result overlay and let players choose Easy, Medium, or Difficult serve difficulty.

**Architecture:** Keep difficulty physics in `ServeGenerator`, expose stable player-facing difficulty metadata from `config.js`, store the selected difficulty in `Game`, and keep presentation/event handling in `Hud`. Extract result-message mapping and difficulty resolution into small pure helpers so behavior can be tested without constructing Three.js/WebGL.

**Tech Stack:** Vite, vanilla JavaScript, Three.js, Vitest, existing static Docker/nginx deployment.

## Global Constraints

- Player-facing difficulty labels are exactly `Easy`, `Medium`, and `Difficult`.
- `Medium` is the default on every fresh page load.
- Difficulty maps to generator values exactly: Easy -> `easy`, Medium -> `normal`, Difficult -> `hard`.
- Difficulty changes both serve duration/speed and trajectory movement strength using the existing generator scaling.
- Changing difficulty affects the next generated serve only; it must not mutate a serve already in flight.
- Center feedback text is exactly one of: `CORRECT — MINE`, `CORRECT — LEAVE`, `WRONG — YOU SHOULD TAKE IT`, `WRONG — LET YOUR TEAMMATE TAKE IT`.
- The center result is visible for approximately 900 ms and does not change the existing 1800 ms feedback-phase timing.
- The existing bottom feedback, scoring, ownership logic, serve profiles, session tracking, and CSV formats remain unchanged.
- No backend, numeric speed slider, separate movement control, or persisted difficulty preference is added.

---

### Task 1: Difficulty metadata and serve-scaling tests

**Files:**
- Modify: `src/config.js`
- Create: `src/game/ServeGenerator.test.js`

**Interfaces:**
- Produces: `DIFFICULTIES` metadata keyed by `easy`, `medium`, `difficult`.
- Each entry contains `{ label, generatorValue }`.
- Continues consuming: `createServeScenario({ rng, difficulty, serveType })`.

- [ ] **Step 1: Write failing difficulty metadata/scaling tests**

Create `src/game/ServeGenerator.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { DIFFICULTIES } from '../config.js';
import { createServeScenario } from './ServeGenerator.js';

function fixedRng() {
  return 0.75;
}

describe('serve difficulty', () => {
  it('exposes the player-facing difficulty mapping', () => {
    expect(DIFFICULTIES).toEqual({
      easy: { label: 'Easy', generatorValue: 'easy' },
      medium: { label: 'Medium', generatorValue: 'normal' },
      difficult: { label: 'Difficult', generatorValue: 'hard' }
    });
  });

  it('orders speed and float movement from easy through difficult', () => {
    const easy = createServeScenario({ rng: fixedRng, difficulty: 'easy', serveType: 'jumpFloat' });
    const medium = createServeScenario({ rng: fixedRng, difficulty: 'normal', serveType: 'jumpFloat' });
    const difficult = createServeScenario({ rng: fixedRng, difficulty: 'hard', serveType: 'jumpFloat' });

    expect(easy.durationMs).toBeGreaterThan(medium.durationMs);
    expect(medium.durationMs).toBeGreaterThan(difficult.durationMs);
    expect(Math.abs(easy.floatDrift)).toBeLessThan(Math.abs(medium.floatDrift));
    expect(Math.abs(medium.floatDrift)).toBeLessThan(Math.abs(difficult.floatDrift));
    expect(Math.abs(easy.lateFloat)).toBeLessThan(Math.abs(medium.lateFloat));
    expect(Math.abs(medium.lateFloat)).toBeLessThan(Math.abs(difficult.lateFloat));
  });

  it('scales topspin drop with difficulty', () => {
    const easy = createServeScenario({ rng: fixedRng, difficulty: 'easy', serveType: 'jumpTopspin' });
    const medium = createServeScenario({ rng: fixedRng, difficulty: 'normal', serveType: 'jumpTopspin' });
    const difficult = createServeScenario({ rng: fixedRng, difficulty: 'hard', serveType: 'jumpTopspin' });

    expect(easy.topspinDrop).toBeLessThan(medium.topspinDrop);
    expect(medium.topspinDrop).toBeLessThan(difficult.topspinDrop);
  });
});
```

- [ ] **Step 2: Run focused tests and confirm failure**

```bash
npm test -- --run src/game/ServeGenerator.test.js
```

Expected: FAIL because `DIFFICULTIES` does not exist yet.

- [ ] **Step 3: Add stable difficulty metadata**

In `src/config.js`, add:

```js
export const DIFFICULTIES = Object.freeze({
  easy: Object.freeze({ label: 'Easy', generatorValue: 'easy' }),
  medium: Object.freeze({ label: 'Medium', generatorValue: 'normal' }),
  difficult: Object.freeze({ label: 'Difficult', generatorValue: 'hard' })
});
```

Do not move the existing `difficultyScale` out of `ServeGenerator.js`; it remains the source of physics scaling.

- [ ] **Step 4: Run focused tests and confirm pass**

```bash
npm test -- --run src/game/ServeGenerator.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config.js src/game/ServeGenerator.test.js
git commit -m "test: cover serve difficulty scaling"
```

---

### Task 2: Pure result-message mapping

**Files:**
- Create: `src/ui/DecisionFeedback.js`
- Create: `src/ui/DecisionFeedback.test.js`

**Interfaces:**
- Produces: `buildDecisionFeedback({ correct, expectedCall }): { text, tone }`.
- `tone` is either `correct` or `wrong` for visual styling.

- [ ] **Step 1: Write failing mapping tests**

Create `src/ui/DecisionFeedback.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { buildDecisionFeedback } from './DecisionFeedback.js';

describe('buildDecisionFeedback', () => {
  it('returns the two correct messages', () => {
    expect(buildDecisionFeedback({ correct: true, expectedCall: 'mine' })).toEqual({
      text: 'CORRECT — MINE',
      tone: 'correct'
    });
    expect(buildDecisionFeedback({ correct: true, expectedCall: 'leave' })).toEqual({
      text: 'CORRECT — LEAVE',
      tone: 'correct'
    });
  });

  it('bases wrong messages on the expected call', () => {
    expect(buildDecisionFeedback({ correct: false, expectedCall: 'mine' })).toEqual({
      text: 'WRONG — YOU SHOULD TAKE IT',
      tone: 'wrong'
    });
    expect(buildDecisionFeedback({ correct: false, expectedCall: 'leave' })).toEqual({
      text: 'WRONG — LET YOUR TEAMMATE TAKE IT',
      tone: 'wrong'
    });
  });
});
```

This covers normal wrong calls and missed calls because `Game` passes the ownership engine's `expectedCall`; the actual pressed key is deliberately irrelevant to this helper.

- [ ] **Step 2: Run and confirm failure**

```bash
npm test -- --run src/ui/DecisionFeedback.test.js
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure helper**

Create `src/ui/DecisionFeedback.js`:

```js
export function buildDecisionFeedback({ correct, expectedCall }) {
  if (correct) {
    return {
      text: expectedCall === 'mine' ? 'CORRECT — MINE' : 'CORRECT — LEAVE',
      tone: 'correct'
    };
  }

  return {
    text: expectedCall === 'mine'
      ? 'WRONG — YOU SHOULD TAKE IT'
      : 'WRONG — LET YOUR TEAMMATE TAKE IT',
    tone: 'wrong'
  };
}
```

- [ ] **Step 4: Run and confirm pass**

```bash
npm test -- --run src/ui/DecisionFeedback.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/DecisionFeedback.js src/ui/DecisionFeedback.test.js
git commit -m "feat: add decision feedback mapping"
```

---

### Task 3: HUD difficulty selector and prominent result overlay

**Files:**
- Modify: `index.html`
- Modify: `src/styles.css`
- Modify: `src/ui/Hud.js`
- Create: `src/ui/Hud.test.js`

**Interfaces:**
- Consumes: `DIFFICULTIES` from `src/config.js`.
- Produces: `Hud.onDifficultyChange(callback): void`.
- Produces: `Hud.setDifficulty(difficultyKey): void`.
- Produces: `Hud.showDecisionResult({ text, tone, durationMs = 900 }): void`.
- Produces: `Hud.clearDecisionResult(): void`.

- [ ] **Step 1: Add failing HUD tests with a concrete fake DOM**

Create `src/ui/Hud.test.js` with this minimal fixture pattern:

```js
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hud } from './Hud.js';

function fakeElement(initial = {}) {
  const listeners = {};
  return {
    textContent: '',
    value: '',
    hidden: false,
    dataset: {},
    classList: { toggle: vi.fn() },
    setAttribute: vi.fn(),
    addEventListener: vi.fn((type, callback) => { listeners[type] = callback; }),
    dispatch(type) { listeners[type]?.(); },
    ...initial
  };
}

function makeDocument() {
  const elements = {
    '#score': fakeElement(), '#streak': fakeElement(), '#reaction': fakeElement(),
    '#round-state': fakeElement(), '#feedback': fakeElement(), '#controlled-position': fakeElement(),
    '#serve-type': fakeElement({ value: 'random' }), '#reveal-serve': fakeElement({ value: 'show' }),
    '#active-serve': fakeElement(), '#end-session': fakeElement(),
    '#difficulty': fakeElement({ value: 'medium' }), '#decision-result': fakeElement({ hidden: true })
  };
  return {
    elements,
    querySelector: (selector) => elements[selector] ?? null,
    querySelectorAll: () => []
  };
}
```

Cover:

```js
it('sets difficulty UI to medium');
it('emits selected difficulty changes');
it('shows and clears prominent decision feedback after 900 ms');
it('replaces any existing hide timer when a new result is shown');
```

Use fake timers for the timeout assertion:

```js
vi.useFakeTimers();
const doc = makeDocument();
const hud = new Hud(doc);
hud.showDecisionResult({ text: 'CORRECT — MINE', tone: 'correct', durationMs: 900 });
const result = doc.elements['#decision-result'];
expect(result.hidden).toBe(false);
expect(result.textContent).toBe('CORRECT — MINE');
expect(result.dataset.tone).toBe('correct');
vi.advanceTimersByTime(899);
expect(result.hidden).toBe(false);
vi.advanceTimersByTime(1);
expect(result.hidden).toBe(true);
```

Restore timers in `afterEach(() => vi.useRealTimers())`.

- [ ] **Step 2: Run and confirm failure**

```bash
npm test -- --run src/ui/Hud.test.js
```

Expected: FAIL because the new elements and methods do not exist.

- [ ] **Step 3: Add difficulty selector and result markup**

In `index.html`, add alongside the existing Serve Type / Reveal Serve controls:

```html
<label class="serve-control">Difficulty
  <select id="difficulty">
    <option value="easy">Easy</option>
    <option value="medium" selected>Medium</option>
    <option value="difficult">Difficult</option>
  </select>
</label>
```

Add a separate overlay near the existing `#feedback` element:

```html
<div id="decision-result" hidden aria-live="assertive"></div>
```

- [ ] **Step 4: Implement HUD event/state methods**

Update `src/ui/Hud.js` to import:

```js
import { DIFFICULTIES, RECEIVER_POSITIONS, SERVE_TYPES } from '../config.js';
```

Store `difficulty` and `decisionResult` elements, initialize `this.resultTimer = null`, and add:

```js
onDifficultyChange(callback) {
  this.e.difficulty?.addEventListener('change', () => callback(this.e.difficulty.value));
}

setDifficulty(key) {
  if (this.e.difficulty && DIFFICULTIES[key]) this.e.difficulty.value = key;
}

showDecisionResult({ text, tone, durationMs = 900 }) {
  if (!this.e.decisionResult) return;
  if (this.resultTimer) clearTimeout(this.resultTimer);
  this.e.decisionResult.textContent = text;
  this.e.decisionResult.dataset.tone = tone;
  this.e.decisionResult.hidden = false;
  this.resultTimer = setTimeout(() => this.clearDecisionResult(), durationMs);
}

clearDecisionResult() {
  if (this.resultTimer) clearTimeout(this.resultTimer);
  this.resultTimer = null;
  if (!this.e.decisionResult) return;
  this.e.decisionResult.hidden = true;
  this.e.decisionResult.textContent = '';
  delete this.e.decisionResult.dataset.tone;
}
```

- [ ] **Step 5: Add desktop/mobile result styling**

Extend `src/styles.css` with:

```css
#decision-result{position:absolute;left:50%;top:48%;transform:translate(-50%,-50%);z-index:6;width:min(760px,calc(100vw - 32px));padding:22px 28px;border-radius:16px;text-align:center;font-size:clamp(24px,5vw,52px);font-weight:800;letter-spacing:.02em;backdrop-filter:blur(8px)}
#decision-result[hidden]{display:none}
#decision-result[data-tone="correct"]{background:#0b3f2ee8;border:2px solid #77f0b5}
#decision-result[data-tone="wrong"]{background:#521b1be8;border:2px solid #ff9b9b}
```

Keep `#feedback` in its current bottom position. Under the existing `@media(max-width:560px)` rule, add:

```css
#decision-result{width:calc(100vw - 20px);padding:18px 14px;font-size:clamp(22px,8vw,36px)}
```

- [ ] **Step 6: Run focused tests and production build**

```bash
npm test -- --run src/ui/Hud.test.js
npm run build
```

Expected: PASS and Vite build succeeds.

- [ ] **Step 7: Commit**

```bash
git add index.html src/styles.css src/ui/Hud.js src/ui/Hud.test.js
git commit -m "feat: add difficulty and prominent result HUD"
```

---

### Task 4: Game integration for next-round difficulty and feedback

**Files:**
- Create: `src/game/GameSettings.js`
- Create: `src/game/GameSettings.test.js`
- Modify: `src/game/Game.js`

**Interfaces:**
- Consumes: `DIFFICULTIES` and `buildDecisionFeedback()`.
- Produces: `resolveGeneratorDifficulty(selectedDifficulty): 'easy' | 'normal' | 'hard'`.
- `Game.selectedDifficulty` stores player-facing keys `easy | medium | difficult`.

- [ ] **Step 1: Write failing difficulty-resolution tests**

Create `src/game/GameSettings.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { resolveGeneratorDifficulty } from './GameSettings.js';

describe('resolveGeneratorDifficulty', () => {
  it('maps UI difficulty keys to generator values', () => {
    expect(resolveGeneratorDifficulty('easy')).toBe('easy');
    expect(resolveGeneratorDifficulty('medium')).toBe('normal');
    expect(resolveGeneratorDifficulty('difficult')).toBe('hard');
  });

  it('falls back to normal for an invalid key', () => {
    expect(resolveGeneratorDifficulty('invalid')).toBe('normal');
  });
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
npm test -- --run src/game/GameSettings.test.js
```

Expected: FAIL because `GameSettings.js` does not exist.

- [ ] **Step 3: Implement the difficulty resolver**

Create `src/game/GameSettings.js`:

```js
import { DIFFICULTIES } from '../config.js';

export function resolveGeneratorDifficulty(selectedDifficulty) {
  return DIFFICULTIES[selectedDifficulty]?.generatorValue ?? 'normal';
}
```

Run:

```bash
npm test -- --run src/game/GameSettings.test.js
```

Expected: PASS.

- [ ] **Step 4: Integrate difficulty state into Game**

Update `src/game/Game.js` imports to include `DIFFICULTIES`, `resolveGeneratorDifficulty`, and `buildDecisionFeedback`.

In the constructor, next to serve settings, add:

```js
this.selectedDifficulty = 'medium';
```

After HUD construction/setup, add:

```js
this.hud.setDifficulty(this.selectedDifficulty);
this.hud.onDifficultyChange((key) => {
  if (DIFFICULTIES[key]) this.selectedDifficulty = key;
});
```

Change round generation from:

```js
createServeScenario({ difficulty: 'normal', serveType: this.selectedServeType })
```

to:

```js
createServeScenario({
  difficulty: resolveGeneratorDifficulty(this.selectedDifficulty),
  serveType: this.selectedServeType
})
```

Because scenarios are created only in `resetRound()`, a selector change during countdown/serve/feedback affects the next scenario and does not mutate the current ball.

- [ ] **Step 5: Integrate prominent result display**

In `evaluate()` after `result` and `decision` exist, add:

```js
this.hud.showDecisionResult(buildDecisionFeedback({
  correct: result.correct,
  expectedCall: decision.expectedCall
}));
```

At the beginning of `resetRound()` add:

```js
this.hud.clearDecisionResult();
```

Also add `this.hud.clearDecisionResult();` in `startNewSession()` so no stale result survives session reset.

Do not alter the existing bottom `hud.update({ feedback: ... })` message or `ROUND_TIMING.feedbackMs`.

- [ ] **Step 6: Run focused and full tests**

```bash
npm test -- --run src/game/GameSettings.test.js src/ui/DecisionFeedback.test.js src/ui/Hud.test.js
npm test -- --run
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/game/GameSettings.js src/game/GameSettings.test.js src/game/Game.js
git commit -m "feat: integrate difficulty and decision feedback"
```

---

### Task 5: Production and Docker verification

**Files:**
- Modify only if verification reveals a defect.

- [ ] **Step 1: Run production build**

```bash
npm run build
```

Expected: Vite completes without errors and emits `dist/`.

- [ ] **Step 2: Build the Docker image**

```bash
docker compose -f compose.yaml build --no-cache
```

Expected: the existing Node build stage runs tests/build and the nginx image completes successfully.

- [ ] **Step 3: Run manual acceptance flow**

Verify all of the following:

1. Fresh load shows Difficulty = Medium.
2. Medium uses the same serve behavior as before this feature.
3. Easy visibly slows the next serve and reduces float/topspin movement.
4. Difficult visibly speeds the next serve and increases movement/drop.
5. Changing difficulty while a ball is already in flight does not alter that ball; the next round uses the new setting.
6. Correct MINE shows `CORRECT — MINE` centered immediately.
7. Correct LEAVE shows `CORRECT — LEAVE` centered immediately.
8. Wrong or missed expected-MINE shows `WRONG — YOU SHOULD TAKE IT`.
9. Wrong or missed expected-LEAVE shows `WRONG — LET YOUR TEAMMATE TAKE IT`.
10. Center feedback disappears after about 0.9 seconds while the detailed bottom feedback remains until the existing round feedback timeout.
11. A new round and Start New Session both clear any center feedback.
12. Desktop and narrow mobile layouts remain readable without horizontal overflow.
13. End Session / summary / CSV downloads still behave exactly as before.

- [ ] **Step 4: Commit verification fixes only if needed**

```bash
git add -A
git commit -m "fix: address feedback difficulty verification findings"
```

Skip this commit if verification produces no changes.
