# Training Pause Design

## Goal

Add a training-oriented Pause control that cancels the current round without recording it, lets the player change drill settings, and starts a completely fresh round when the player is ready.

## User Flow

Normal play becomes:

**Playing → Pause → adjust settings → Start Next Round → fresh countdown**

Pause is deliberately not a traditional resume/freeze control. It is a reconfiguration state between drill attempts.

## Pause Behavior

A `Pause` button is visible in the HUD during normal play.

Pressing Pause during countdown, serve, movement, or feedback:

- immediately cancels the current attempt;
- does not record a new attempt for the canceled round;
- does not change score, streak, reaction statistics, or session attempt count because of the cancellation;
- hides the ball;
- hides/resets the trajectory guide;
- clears any pending MINE/LEAVE call, reaction time, frozen ownership decision, and per-round recording flag;
- enters a dedicated `paused` game phase;
- displays a prominent message: `PAUSED — adjust settings, then start next round`;
- changes the HUD button label/action from `Pause` to `Start Next Round`.

If Pause is pressed during feedback after an attempt has already been finalized and recorded, that already-completed attempt remains recorded. Pause only prevents unfinished/canceled work from being added.

## Settings While Paused

The paused phase explicitly allows changes to:

- controlled position: Left / Middle / Right;
- serve type;
- difficulty;
- reveal-serve setting;
- trajectory guide On / Off.

Changing controlled position while paused immediately updates the displayed formation so the player can see the selected setup before starting the next round.

Settings changes made while paused apply to the next generated scenario. They do not resurrect or modify the canceled scenario.

## Start Next Round

Pressing `Start Next Round` while paused:

1. clears the paused message;
2. resets the player and teammates to the currently selected formation;
3. discards the canceled scenario and creates a new serve scenario from the current serve type/difficulty settings;
4. resets ball and trajectory-guide state;
5. clears pending decision/movement state;
6. enters a fresh countdown using the existing countdown duration;
7. restores the HUD button to `Pause`.

There is no Resume Current Round action.

## State Model

Add `paused` as a first-class game phase.

`paused` is distinct from the existing session-summary pause (`sessionPaused`). The session summary continues to freeze/resume the existing game state as it does today; the new training Pause cancels a round and prepares a new one.

The game loop does not advance ball physics, countdown timers, player movement, automatic feedback transitions, or decision evaluation while `phase === 'paused'`.

Position-selection gating must explicitly permit `paused`, regardless of whether the canceled round had already started its serve.

## Session/Data Semantics

A canceled unfinished attempt produces no CSV attempt row and no summary-stat changes.

A round already finalized before Pause remains part of the session; Pause does not roll back completed history.

Starting the next round does not reset the overall session. `End Session` remains the only existing workflow for session summary/export/new-session behavior.

## UI

Add a primary HUD control with two states:

- normal phases: `Pause`;
- paused phase: `Start Next Round`.

While paused, show a prominent center overlay separate from correctness feedback so the user cannot confuse pause state with a scored result.

The existing settings remain in their current HUD location; no separate settings modal is required.

## Testing

Add focused tests for:

- pausing an unfinished serve cancels it without recording;
- pausing during the post-MINE movement phase clears pending call/reaction/guide state;
- paused state permits position changes even if the canceled serve had started;
- serve/difficulty/reveal/guide selections can be changed while paused and are used by the next round;
- Start Next Round generates a new scenario and starts a fresh countdown;
- score/streak/session attempts remain unchanged when an unfinished round is canceled;
- a previously finalized attempt is not removed when Pause is pressed during feedback;
- game physics/timers do not advance while training-paused;
- session-summary pause behavior remains independent.
