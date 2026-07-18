import { FORMATION, RECEIVER_POSITIONS } from '../config.js';

export const SLOT_ORDER = Object.freeze(['left', 'middle', 'right']);

export function isValidSlot(slot) {
  return Object.hasOwn(RECEIVER_POSITIONS, slot);
}

export function canSelectPosition(phase, hasServeStarted) {
  return !hasServeStarted || phase === 'feedback';
}

export function teammateSlots(controlledSlot) {
  if (!isValidSlot(controlledSlot)) return [];
  return SLOT_ORDER.filter((slot) => slot !== controlledSlot);
}

export function orderedReceiverSnapshots(controlledSlot, playerSnapshot, teammateSnapshots) {
  const teammatesById = new Map(teammateSnapshots.map((snapshot) => [snapshot.id, snapshot]));

  return SLOT_ORDER.map((slot) => {
    if (slot === controlledSlot) {
      return { ...playerSnapshot, id: slot };
    }

    const teammate = teammatesById.get(slot);
    if (!teammate) {
      const formation = FORMATION[slot];
      return { id: slot, x: formation.x, z: formation.z, velocity: { x: 0, z: 0 }, speed: 0 };
    }

    return teammate;
  });
}
