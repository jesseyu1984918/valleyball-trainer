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

export const RECEIVER_POSITIONS = Object.freeze({
  left: { slot: 'left', label: 'Left Back', shortcut: '1' },
  middle: { slot: 'middle', label: 'Middle Back', shortcut: '2' },
  right: { slot: 'right', label: 'Right Back', shortcut: '3' }
});

export const POSITION_SHORTCUTS = Object.freeze({
  1: 'left',
  2: 'middle',
  3: 'right'
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
