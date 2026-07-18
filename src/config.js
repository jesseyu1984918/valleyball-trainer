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

export const POSITION_SHORTCUTS = Object.freeze({ 1: 'left', 2: 'middle', 3: 'right' });

export const SERVE_TYPES = Object.freeze({
  random: { label: 'Random' },
  standingFloat: { label: 'Standing Float' },
  jumpFloat: { label: 'Jump Float' },
  jumpTopspin: { label: 'Jump Topspin' },
  shortFloat: { label: 'Short Float' },
  deepTopspin: { label: 'Deep Topspin' }
});

export const CONCRETE_SERVE_TYPES = Object.freeze([
  'standingFloat',
  'jumpFloat',
  'jumpTopspin',
  'shortFloat',
  'deepTopspin'
]);

export const SERVE_PROFILES = Object.freeze({
  standingFloat: { launchHeight:[2.7,3.1], duration:[2850,3200], arc:[2.2,2.9], drift:[0.16,0.28], lateFloat:[0.12,0.24], topspinDrop:[0,0], depth:[5.8,8.2] },
  jumpFloat: { launchHeight:[3.3,3.8], duration:[2350,2750], arc:[2.8,3.6], drift:[0.18,0.32], lateFloat:[0.2,0.38], topspinDrop:[0,0], depth:[4.5,8.4] },
  jumpTopspin: { launchHeight:[3.5,4.1], duration:[1850,2250], arc:[3.2,4.1], drift:[0.01,0.06], lateFloat:[0,0.03], topspinDrop:[0.55,0.9], depth:[5.3,8.5] },
  shortFloat: { launchHeight:[2.8,3.4], duration:[2250,2700], arc:[2.7,3.5], drift:[0.16,0.3], lateFloat:[0.18,0.34], topspinDrop:[0,0], depth:[3.3,5.1] },
  deepTopspin: { launchHeight:[3.6,4.2], duration:[1750,2150], arc:[3.4,4.3], drift:[0.01,0.05], lateFloat:[0,0.02], topspinDrop:[0.7,1.05], depth:[7.7,8.65] }
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