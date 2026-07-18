# Receiver Position Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user control left-back, middle-back, or right-back through HUD buttons or keyboard shortcuts while preserving the existing round and scoring behavior.

**Architecture:** Keep the existing controlled `Player` instance and reset its slot identity and coordinates when selection changes. Dispose and recreate exactly two `Teammate` instances for the remaining slots. Centralize slot ordering and switching permission in small pure helpers so position behavior can be unit-tested independently of Three.js.

**Tech Stack:** JavaScript ES modules, Three.js, Vitest, Vite, Docker/Nginx.

## Global Constraints

- Default controlled position is `middle`.
- `1`, `2`, and `3` select left, middle, and right respectively.
- Position changes are accepted only before the first serve or during feedback.
- Position changes must not reset score or streak.
- Exactly two teammate meshes remain after every switch.
- Receiver snapshots are always ordered `left`, `middle`, `right`.
- Docker build and root-path deployment behavior must remain unchanged.

---

### Task 1: Position Rules and Tests

**Files:**
- Modify: `src/config.js`
- Create: `src/game/ReceiverPositions.js`
- Create: `tests/receiver-positions.test.js`

**Interfaces:**
- Produces: `RECEIVER_POSITIONS`, `POSITION_SHORTCUTS`, `canSelectPosition(phase, hasServeStarted)`, `teammateSlots(controlledSlot)`, and `orderedReceiverSnapshots(controlledSlot, playerSnapshot, teammateSnapshots)`.

- [ ] Write tests for valid slots, shortcut mapping, phase permission, teammate slot selection, and stable snapshot ordering.
- [ ] Run `npm test -- tests/receiver-positions.test.js` and confirm failure before implementation.
- [ ] Implement the minimal pure helpers and rerun the test.
- [ ] Commit the passing domain behavior.

### Task 2: Input and HUD

**Files:**
- Modify: `index.html`
- Modify: `src/styles.css`
- Modify: `src/input/Keyboard.js`
- Modify: `src/ui/Hud.js`
- Create: `tests/keyboard.test.js`

**Interfaces:**
- `Keyboard.consume()` emits one-shot actions `1`, `2`, and `3` in addition to existing actions.
- `Hud.onPositionSelect(callback)` reports button slot values.
- `Hud.setPosition(slot)` updates label and active button state.

- [ ] Add keyboard one-shot tests with a fake event target.
- [ ] Add accessible position buttons and active-position text.
- [ ] Bind buttons in `Hud` and update the active state using `aria-pressed`.
- [ ] Run keyboard and existing tests.
- [ ] Commit the UI/input slice.

### Task 3: Formation Rebuilding and Integration

**Files:**
- Modify: `src/game/Player.js`
- Modify: `src/game/Teammate.js`
- Modify: `src/game/Game.js`

**Interfaces:**
- `Player.reset(position)` updates `id`, coordinates, and velocity.
- `Player.dispose()` removes and disposes its mesh resources.
- `Game.setControlledSlot(slot)` applies valid changes through one code path.
- `Game.rebuildFormation()` resets the player and recreates teammates.
- `Game.receiverSnapshots()` returns stable left-middle-right ordering.

- [ ] Add identity-aware player reset and resource cleanup.
- [ ] Replace fixed left/right teammate fields with a two-item array.
- [ ] Wire HUD buttons and keyboard shortcuts through `setControlledSlot`.
- [ ] Enforce timing rules and preserve score/streak.
- [ ] Use stable receiver snapshots for ownership evaluation.
- [ ] Run `npm test`, `npm run build`, and `docker build -t volleyball-trainer:test .`.
- [ ] Commit the integrated feature.
