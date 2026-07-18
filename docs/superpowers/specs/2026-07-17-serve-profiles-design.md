# Explicit Serve Profiles — Design Specification

## 1. Purpose

Replace the current generalized randomized serve with explicit, selectable serve profiles so the trainer can model recognizable serve behaviors while preserving per-round variation.

## 2. Serve Types

The trainer supports five named serve profiles plus a random mode:

- `random` — default; chooses one of the five profiles each round
- `standingFloat`
- `jumpFloat`
- `jumpTopspin`
- `shortFloat`
- `deepTopspin`

Random remains the default selection when the trainer starts.

## 3. HUD and Training Controls

Add two HUD controls:

1. **Serve type** selector with:
   - Random
   - Standing Float
   - Jump Float
   - Jump Topspin
   - Short Float
   - Deep Topspin

2. **Reveal serve** toggle with:
   - Show
   - Hide

Behavior:

- In `random`, one concrete serve profile is selected independently each round.
- In a fixed mode, every round uses that profile with bounded random variation.
- When reveal is enabled, countdown shows the actual serve type.
- When reveal is disabled, countdown shows `Unknown`.
- Feedback always reveals the actual serve type.
- Changing serve settings affects the next generated round and does not reset score or streak.

## 4. Profile Model

Add `SERVE_TYPES` and `SERVE_PROFILES` in `src/config.js`.

Each profile defines ranges or fixed values for:

- launch height
- base duration
- duration variation
- arc height
- lateral drift amplitude
- late float movement
- topspin drop strength
- allowed landing zones or depth range

Profiles:

### Standing Float

- slower than jump serves
- lower launch height
- moderate lateral instability
- modest late float movement
- mid-to-deep landing distribution

### Jump Float

- faster than standing float
- higher launch point
- stronger late float movement
- moderate lateral instability
- broad landing distribution

### Jump Topspin

- fastest general profile
- smooth lateral path
- strong downward acceleration late in flight
- broad mid-to-deep landing distribution

### Short Float

- float-style instability
- shorter trajectory
- landing constrained near the front of the receive area

### Deep Topspin

- high speed
- strong topspin drop
- landing constrained near the baseline

## 5. Scenario Generation

Update `createServeScenario()` to accept:

```js
createServeScenario({
  rng = Math.random,
  difficulty = 'normal',
  serveType = 'random'
})
```

Generation flow:

1. Validate the requested serve type.
2. If `random`, choose one concrete profile uniformly.
3. Sample a landing zone allowed by that profile.
4. Sample duration, launch height, arc height, drift, float movement, and topspin drop within profile bounds.
5. Return the concrete `serveType` on the scenario.
6. Preserve the existing scenario validation and safe fallback.

Difficulty continues to scale the profile, primarily through duration and movement amplitude, rather than replacing the serve type.

## 6. Ball Trajectory

Keep the trajectory profile-based rather than introducing full aerodynamic simulation.

`Ball.getPosition()` should combine:

- linear horizontal progress from start to landing
- a vertical arc envelope
- float instability from bounded lateral oscillation
- late float offset for float serves
- late downward displacement for topspin serves

Float and topspin behaviors must be separate parameters so topspin serves do not inherit random float movement.

The final position at progress `1` must still equal the scenario landing point.

## 7. Game State

`Game` adds:

- `selectedServeType`, initialized to `'random'`
- `revealServeType`, initialized to the agreed UI default
- HUD callbacks for changing both values

`resetRound()` passes `selectedServeType` into `createServeScenario()`.

Countdown copy:

- reveal enabled: `Serve: Jump Float` or corresponding label
- reveal disabled: `Serve: Unknown`

Feedback always includes the actual serve label.

## 8. Error Handling

- Unknown serve selections are ignored or normalized to `random`.
- Random mode must always resolve to one of the five concrete profiles.
- Generated landing points must remain inside playable court bounds.
- Profile sampling must always produce a scenario that passes `validateScenario()`.
- Serve-setting changes do not modify the active trajectory mid-serve.

## 9. Files to Modify

- `index.html`
  - add serve-type selector and reveal control
- `src/styles.css`
  - style the new HUD controls
- `src/config.js`
  - add serve metadata and profile definitions
- `src/ui/Hud.js`
  - bind serve controls and update displayed serve state
- `src/game/ServeGenerator.js`
  - generate explicit profile-based scenarios
- `src/game/Ball.js`
  - separate float movement and topspin drop behavior
- `src/game/Game.js`
  - store settings, generate selected profiles, and reveal labels at the correct time
- tests for generator, trajectory, HUD wiring where practical, and game-state integration

## 10. Testing

### Unit tests

- default selection is `random`
- `random` always resolves to a concrete profile
- each fixed serve type returns its own `serveType`
- short float lands in the short receive region
- deep topspin lands in the deep region
- topspin profiles have stronger drop than float profiles
- float profiles expose lateral or late movement while topspin profiles remain comparatively smooth laterally
- all generated scenarios pass validation and remain in court bounds
- trajectory ends exactly at the scenario landing point
- invalid serve type falls back to `random`

### Manual acceptance tests

- Random is selected on startup
- each named serve can be selected from the HUD
- fixed selection persists across rounds
- Random visibly produces multiple serve types over repeated rounds
- reveal Show displays the profile during countdown
- reveal Hide shows `Unknown` until feedback
- feedback always names the actual serve
- short float and deep topspin are visually and spatially distinct
- Docker image still builds and serves successfully

## 11. Definition of Done

The feature is complete when the user can keep Random as the default or select one of five explicit serve profiles, optionally reveal or hide the serve type before contact, and observe profile-specific speed, placement, float movement, and topspin drop while existing position-selection, scoring, and Docker deployment behavior continue to work.