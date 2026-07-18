# Volleyball Trainer — Design Specification

## 1. Purpose

Build a small browser-based 3D volleyball serve-receive trainer that teaches one focused decision: whether the incoming first pass is **mine** or should be **left** to a teammate.

The first version is a single-player keyboard-controlled web app. It is intended to train reading serve trajectory, moving into position, and making an early ownership decision. It does not simulate the pass itself.

## 2. Product Scope

### Included in version 1

- Three.js-based 3D indoor volleyball court
- Vite development and build setup
- Third-person camera behind and slightly above the controlled receiver
- One keyboard-controlled player in middle-back serve receive
- Two AI-controlled teammates in left-back and right-back
- Randomized serves with different lateral direction, depth, speed, arc, and small float drift
- WASD movement
- `M` key for **mine**
- `L` key for **leave**
- Round scoring for decision correctness, movement quality, and reaction time
- Clear post-round explanation
- Automatic next-round reset

### Excluded from version 1

- Passing or platform mechanics
- Aiming passes to a setter
- Multiplayer
- Mobile controls
- Accounts or saved progress
- Character animation systems
- Advanced rigid-body physics
- Voice recognition
- Match simulation

## 3. User Experience

### Camera

The camera follows behind and above the controlled receiver. It remains oriented toward the net and server so the user can see:

- the controlled player,
- both teammates,
- the court and seams,
- the server,
- and the incoming ball trajectory.

The camera should move smoothly and avoid rapid rotation or motion that would make the ball difficult to read.

### Controls

- `W`: move forward toward the net
- `S`: move backward
- `A`: move left
- `D`: move right
- `M`: call mine
- `L`: call leave
- `R`: restart the current round when the round has ended

Movement is court-relative rather than camera-relative because the camera orientation is fixed toward the net.

### HUD

The HUD displays:

- current score,
- current streak,
- reaction time,
- round state,
- and the most recent feedback message.

A short control reminder remains visible during play.

## 4. Round Flow

Each round follows this state sequence:

1. **Ready** — player and teammates are reset to serve-receive positions.
2. **Countdown** — a short visual countdown begins.
3. **Serve** — the server tosses and contacts the ball.
4. **Read and move** — the ball travels while the player moves.
5. **Decision** — the user presses `M` or `L` before the ball reaches the receiving plane.
6. **Evaluation** — ownership, movement, and timing are scored.
7. **Feedback** — the scene freezes briefly and explains the result.
8. **Reset** — the next round begins automatically.

A call made after the decision deadline is treated as late.

## 5. Serve Model

The serve trajectory is deterministic within each round and generated from randomized parameters:

- starting server position,
- intended landing point,
- travel duration,
- vertical arc,
- lateral drift,
- and optional late float offset.

The ball path uses a lightweight parametric trajectory rather than full rigid-body physics. A quadratic or cubic curve determines the base path, with a small time-dependent lateral offset for float behavior.

The target landing area stays inside the receiving half of the court. Version 1 should emphasize realistic zones:

- directly at each passer,
- between adjacent passers,
- short in front of the formation,
- deep behind the formation,
- and balls requiring lateral movement.

## 6. Decision Engine

The decision engine evaluates which receiver owns the ball.

### Inputs

- projected landing point
- controlled player position at decision time
- teammate positions
- movement direction of each receiver
- receiver reach radius
- approach angle to the ball
- configured seam rule

### Default seam rule

Version 1 uses **best-position ownership**:

1. Determine each receiver's estimated path distance to the ideal receiving point.
2. Penalize crossing in front of another receiver.
3. Penalize receiving while moving sharply sideways or backward.
4. Prefer the receiver who can arrive behind the ball with the cleanest forward platform angle.
5. Use a small middle-receiver priority only when two candidates are effectively tied.

The decision engine returns:

- expected call: `mine` or `leave`,
- owning receiver,
- confidence level,
- and a human-readable explanation.

## 7. Movement Evaluation

When the correct call is **mine**, movement quality is based on the controlled player's position relative to an ideal receiving point.

The ideal point is slightly behind the projected ball contact point so the ball arrives in front of the body.

Movement score considers:

- lateral distance from the ideal point,
- front/back distance from the ideal point,
- whether the player is still moving away from the ball,
- and whether the player crossed another receiver's lane.

When the correct call is **leave**, the player is rewarded for avoiding unnecessary pursuit into a teammate's lane.

## 8. Scoring

Each round awards up to 100 points:

- 60 points: correct mine/leave decision
- 25 points: movement quality
- 15 points: reaction time

Incorrect ownership decisions receive zero decision points. Dangerous crossing movement may apply a small penalty even if the final call is correct.

Feedback examples:

- “Correct — this serve finished inside your right seam, and you had the cleanest angle.”
- “Leave — the left passer was already centered behind the ball.”
- “Correct call, but you arrived beside the ball instead of behind it.”
- “Late — make the ownership call earlier so teammates can clear the seam.”

## 9. Technical Architecture

### Stack

- Vite
- JavaScript modules
- Three.js
- Vitest for unit tests
- Plain HTML and CSS for HUD and menus

### Modules

- `src/main.js`
  - application bootstrap
  - renderer and root DOM initialization

- `src/game/Game.js`
  - main game loop
  - round state machine
  - coordination between scene, input, serve, scoring, and HUD

- `src/game/Court.js`
  - court floor
  - boundary lines
  - net and posts
  - lighting and background

- `src/game/Player.js`
  - player mesh
  - keyboard-driven movement
  - court-boundary clamping
  - current velocity and facing direction

- `src/game/Teammate.js`
  - teammate mesh
  - simple positioning behavior
  - movement toward assigned receive zones

- `src/game/Ball.js`
  - serve trajectory generation
  - position update by normalized round time
  - projected contact and landing point

- `src/game/ServeGenerator.js`
  - randomized serve scenarios
  - difficulty-dependent speed and drift

- `src/game/DecisionEngine.js`
  - receiver ownership calculation
  - seam and crossing penalties
  - explanation generation

- `src/game/Scoring.js`
  - decision score
  - movement score
  - reaction score

- `src/input/Keyboard.js`
  - key state tracking
  - decision key events

- `src/ui/Hud.js`
  - score and streak display
  - countdown
  - result feedback

- `src/styles.css`
  - full-screen game layout
  - HUD styling
  - responsive desktop sizing

## 10. Data Flow

1. `Game` requests a new scenario from `ServeGenerator`.
2. `Ball` receives the scenario and exposes its position over time.
3. `Keyboard` provides movement state to `Player`.
4. `Game` updates players, teammates, ball, and camera each frame.
5. On `M`, `L`, or deadline, `Game` asks `DecisionEngine` for ownership.
6. `Scoring` compares the user call and player movement against the ownership result.
7. `Hud` displays the result and explanation.
8. `Game` resets the scene for the next round.

## 11. Error Handling

- Show a visible startup error if WebGL is unavailable.
- Clamp movement to the playable court area.
- Prevent duplicate calls within one round.
- Ignore movement and decision input while the round is resetting.
- Fall back to a default serve scenario if random scenario generation produces invalid coordinates.
- Resize the renderer and camera safely when the browser window changes.

## 12. Testing

### Unit tests

- ownership for balls centered on each receiver
- ownership for left and right seam balls
- tie-breaking behavior
- crossing penalties
- movement-quality distance calculations
- reaction-time score boundaries
- serve targets remain inside valid court bounds
- game-state transitions reject duplicate decisions

### Manual acceptance tests

- app starts with `npm run dev`
- player moves smoothly with WASD
- camera follows without obstructing the ball
- every serve remains visible from contact to receiving plane
- `M` and `L` produce one result only
- feedback matches the visible ownership situation
- repeated rounds reset all state correctly
- production build succeeds with `npm run build`

## 13. Definition of Done

Version 1 is complete when a user can open the app, play repeated randomized serve-receive rounds, move with WASD, call mine or leave, and receive consistent scoring and explanations that reflect player and teammate positioning.
