# Receiver Position Selection — Design Specification

## 1. Purpose

Allow the user to control any of the three serve-receive positions—left-back, middle-back, or right-back—without changing the core round flow. The unselected positions remain AI-controlled teammates.

## 2. User Experience

The HUD adds a compact **Position** control with three buttons:

- **Left**
- **Middle**
- **Right**

The selected button is visually highlighted and the HUD also shows the active role as one of:

- `Controlled: Left Back`
- `Controlled: Middle Back`
- `Controlled: Right Back`

Keyboard shortcuts provide the same behavior:

- `1` selects left-back
- `2` selects middle-back
- `3` selects right-back

Position changes are accepted only before the first serve or during the feedback phase. Inputs during countdown or active serve are ignored so the player cannot switch ownership roles mid-round.

The default position remains middle-back.

## 3. Switching Behavior

When a valid position change occurs:

1. Store the selected slot as persistent game state.
2. Reset the existing controlled `Player` object to the selected formation coordinates.
3. Remove the current two teammate meshes from the scene.
4. Create two new `Teammate` objects for the remaining formation slots.
5. Update the HUD active-position label and button highlight.
6. Use the new three-receiver ordering for ownership and scoring from the next round onward.
7. Keep the selected slot active for later rounds until the user changes it again.

Changing position during feedback does not immediately start a round. The normal feedback timer or `R` key still controls when the next round begins.

## 4. Architecture

### Position model

Use the existing `FORMATION` object as the source of truth. Add position metadata that maps each slot to its display label and shortcut:

```js
export const RECEIVER_POSITIONS = Object.freeze({
  left: { slot: 'left', label: 'Left Back', shortcut: '1' },
  middle: { slot: 'middle', label: 'Middle Back', shortcut: '2' },
  right: { slot: 'right', label: 'Right Back', shortcut: '3' }
});
```

### Game ownership

`Game` adds:

- `controlledSlot`, initialized to `'middle'`
- `teammates`, an array containing exactly two `Teammate` instances
- `setControlledSlot(slot)` to validate and apply a position change
- `rebuildFormation()` to reset the player and recreate teammates
- `receiverSnapshots()` to return all three receiver snapshots in formation order

The controlled player keeps its existing identity as `Player`; only its formation slot changes. The two teammate objects are recreated when the slot changes, which is the approved minimal-change approach.

### Input

`Keyboard` adds one-shot actions for `1`, `2`, and `3`. Existing movement and `M`, `L`, `R` behavior remains unchanged.

### HUD

`Hud` adds:

- position label element
- references to the three position buttons
- `onPositionSelect(callback)` to expose button clicks
- `setPosition(slot)` to update text and active-button state

`Game` owns the permission rule for when switching is allowed; `Hud` only reports intent.

## 5. Receiver and Scoring Data Flow

The ownership engine must always receive three receiver snapshots with correct slot IDs regardless of which object is controlled.

`receiverSnapshots()` returns snapshots in this stable order:

```js
['left', 'middle', 'right']
```

For each slot:

- if it matches `controlledSlot`, use `player.snapshot()` and ensure the returned `id` is that slot
- otherwise use the matching teammate snapshot

`Scoring` continues receiving the controlled player's snapshot. Therefore mine/leave correctness and movement scoring follow the selected position automatically.

## 6. Scene Lifecycle

`Teammate` must expose `dispose()` or equivalent cleanup that:

- removes its mesh from the scene
- disposes owned geometry
- disposes owned material

`Game.rebuildFormation()` must call cleanup before creating replacement teammates. This prevents hidden meshes and GPU-resource leaks after repeated switches.

The camera requires no new camera mode. It already follows the controlled `Player`, so resetting that object to the selected slot naturally shifts the camera to the new position.

## 7. Input Rules and Error Handling

- Ignore an unknown position value.
- Ignore a selection matching the already active slot.
- Accept position selection only when no serve has started yet or while `phase === 'feedback'`.
- Ignore `1`, `2`, and `3` during countdown and serve.
- Do not reset score or streak when changing position.
- Do not alter the current feedback message except to append or briefly show the newly selected role if needed.
- Button clicks and keyboard shortcuts must call the same `setControlledSlot` path.

## 8. Files to Modify

- `index.html`
  - add active-position text and three buttons
- `src/styles.css`
  - style the position selector and selected button
- `src/config.js`
  - add receiver-position metadata
- `src/input/Keyboard.js`
  - add `1`, `2`, `3` one-shot actions
- `src/ui/Hud.js`
  - bind buttons, expose selection callback, update active state
- `src/game/Teammate.js`
  - add scene/resource cleanup
- `src/game/Player.js`
  - ensure its snapshot ID can reflect the active slot
- `src/game/Game.js`
  - own selected slot, rebuild teammates, enforce timing rules, and construct receiver snapshots

## 9. Testing

### Unit tests

- keyboard emits `1`, `2`, and `3` as one-shot actions
- invalid position values are rejected
- selecting the current slot makes no scene changes
- player resets to left, middle, and right formation coordinates
- teammate slots are exactly the two non-controlled positions
- receiver snapshots remain ordered left, middle, right
- controlled player snapshot uses the selected slot ID
- switching is rejected during countdown and serve
- switching is accepted before the first serve and during feedback
- teammate cleanup is called before replacement
- score and streak remain unchanged after a position switch

### Manual acceptance tests

- default controlled position is middle-back
- clicking Left, Middle, or Right changes the highlighted button
- pressing `1`, `2`, or `3` has the same result as clicking
- player and camera move to the selected formation slot on the next round
- exactly two teammates remain visible after repeated switches
- position cannot change while the serve is active
- mine/leave feedback reflects the selected receiver role
- Docker image still builds and serves the app successfully

## 10. Definition of Done

The feature is complete when the user can select left-back, middle-back, or right-back through either HUD buttons or `1`/`2`/`3`, the remaining two positions become AI teammates, the selection persists across rounds, switching is blocked mid-round, and ownership/scoring remain correct for the selected position.