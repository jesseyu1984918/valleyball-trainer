# Explicit Serve Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five explicit volleyball serve profiles, Random as the default, and Show/Hide serve reveal controls.

**Architecture:** Keep generation deterministic and profile-driven in `ServeGenerator.js`, with pure metadata in `config.js`. `Ball.js` consumes separate float and topspin parameters. `Hud.js` reports settings changes while `Game.js` owns when new settings take effect.

**Tech Stack:** JavaScript, Three.js, Vite, Vitest, Docker/Nginx.

## Global Constraints

- Random is the startup default.
- Supported concrete types are Standing Float, Jump Float, Jump Topspin, Short Float, and Deep Topspin.
- Settings affect only newly generated rounds.
- Feedback always reveals the concrete serve type.
- Ball position at progress `1` must equal the landing point exactly.
- Existing receiver-position selection, scoring, and Docker deployment must remain intact.

---

### Task 1: Profile metadata and scenario generation

**Files:**
- Modify: `src/config.js`
- Modify: `src/game/ServeGenerator.js`
- Test: `tests/serve-generator.test.js`

**Interfaces:**
- Produces: `SERVE_TYPES`, `CONCRETE_SERVE_TYPES`, `SERVE_PROFILES`, and `createServeScenario({ rng, difficulty, serveType })`.

- [ ] Add failing tests for Random resolution, fixed-profile identity, short/deep landing constraints, invalid fallback, and validation.
- [ ] Run `npm test -- tests/serve-generator.test.js`; expect failures for missing profile behavior.
- [ ] Implement metadata and bounded profile sampling.
- [ ] Re-run the targeted test; expect PASS.
- [ ] Commit profile generation.

### Task 2: Distinct float and topspin trajectories

**Files:**
- Modify: `src/game/Ball.js`
- Test: `tests/ball.test.js`

**Interfaces:**
- Consumes scenario fields `floatDrift`, `lateFloat`, and `topspinDrop`.
- Produces trajectory positions ending exactly at `landing`.

- [ ] Add failing tests for exact landing, float lateral motion, and stronger topspin descent.
- [ ] Run `npm test -- tests/ball.test.js`; expect failures for missing separated parameters.
- [ ] Implement separate float and topspin contributions with zero endpoint displacement.
- [ ] Re-run the targeted test; expect PASS.
- [ ] Commit trajectory behavior.

### Task 3: HUD controls and game integration

**Files:**
- Modify: `index.html`
- Modify: `src/styles.css`
- Modify: `src/ui/Hud.js`
- Modify: `src/game/Game.js`

**Interfaces:**
- `Hud.onServeTypeSelect(callback)` emits the selected mode.
- `Hud.onRevealServeChange(callback)` emits a boolean.
- `Hud.setServeSettings({ selectedServeType, revealServeType })` updates controls.

- [ ] Add the selector and reveal toggle markup with Random selected.
- [ ] Add HUD binding/update methods.
- [ ] Add `selectedServeType='random'` and reveal state to `Game`.
- [ ] Generate each round from the selected mode, show Unknown or the label during countdown, and always reveal the label in feedback.
- [ ] Run `npm test` and `npm run build`; expect all tests and build to pass.
- [ ] Run `docker build -t volleyball-trainer:test .`; expect a successful image build.
- [ ] Commit the integrated feature.
