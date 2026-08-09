# Training Pause Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a training Pause control that cancels the current round without recording it, unlocks drill settings, and starts a fresh countdown with the selected configuration.

**Architecture:** Add `paused` as a first-class game phase and keep it independent from `sessionPaused`. Put pause/start-next-round UI behavior in `Hud`, put position-gating logic in `ReceiverPositions`, and put cancellation/reset transitions in `Game`.

**Tech Stack:** JavaScript ES modules, Three.js, Vitest, Vite, existing Docker/GHCR pipeline.

## Global Constraints
- Pause cancels an unfinished round and never records it.
- A finalized attempt remains recorded.
- Paused state allows position, serve type, difficulty, reveal serve, and trajectory-guide changes.
- Start Next Round creates a new scenario and fresh countdown; there is no resume-current-round action.
- Training pause is separate from session-summary pause.

---

### Task 1: HUD pause/start-next-round control
**Files:** Modify `index.html`, `src/ui/Hud.js`, `src/ui/Hud.test.js`, `src/styles.css`.
**Interface:** `onTrainingPause(callback)`, `setTrainingPaused(paused)`.
- [ ] Add failing HUD tests for click callback and label switching.
- [ ] Add `#training-pause` button and `#pause-message` overlay.
- [ ] Implement HUD methods and paused overlay state.
- [ ] Run `npm test -- src/ui/Hud.test.js`.
- [ ] Commit.

### Task 2: Position gating while paused
**Files:** Modify `src/game/ReceiverPositions.js` and its tests.
**Interface:** `canSelectPosition(phase, hasServeStarted)` returns true for `paused`.
- [ ] Add failing paused-position test.
- [ ] Implement explicit `phase === 'paused'` allowance.
- [ ] Run focused test.
- [ ] Commit.

### Task 3: Game cancellation and fresh-round transition
**Files:** Modify `src/game/Game.js`; create `src/game/TrainingPause.test.js`.
**Interfaces:** `pauseTraining()`, `startNextRound(now)`.
- [ ] Add tests that pause clears scenario/pending decision state, hides ball/guide, preserves session score/streak/records, and sets phase `paused`.
- [ ] Add test that Start Next Round calls `resetRound(now)` using current settings and returns to countdown.
- [ ] Implement `pauseTraining()` and `startNextRound(now)`.
- [ ] Wire HUD button: normal phases -> pause; paused -> start next round.
- [ ] Ensure game loop advances no physics while paused.
- [ ] Commit.

### Task 4: Regression verification
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `docker build -t volleyball-trainer:training-pause .`.
- [ ] Smoke test Pause during countdown/serve/move/feedback, edit settings, Start Next Round, and verify no canceled attempt is recorded.
- [ ] Confirm GHCR `latest` publish after successful main build.
