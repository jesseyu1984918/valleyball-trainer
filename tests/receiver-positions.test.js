import { describe, expect, it } from 'vitest';
import { canSelectPosition, orderedReceiverSnapshots, teammateSlots } from '../src/game/ReceiverPositions.js';

describe('receiver position rules', () => {
  it('allows switching before a serve and during feedback only', () => {
    expect(canSelectPosition('countdown', false)).toBe(true);
    expect(canSelectPosition('feedback', true)).toBe(true);
    expect(canSelectPosition('countdown', true)).toBe(false);
    expect(canSelectPosition('serve', true)).toBe(false);
  });

  it('returns exactly the two non-controlled teammate slots', () => {
    expect(teammateSlots('left')).toEqual(['middle', 'right']);
    expect(teammateSlots('middle')).toEqual(['left', 'right']);
    expect(teammateSlots('right')).toEqual(['left', 'middle']);
    expect(teammateSlots('unknown')).toEqual([]);
  });

  it('orders snapshots left, middle, right and assigns the player slot id', () => {
    const snapshots = orderedReceiverSnapshots(
      'right',
      { id: 'middle', x: 3, z: 6.8, velocity: { x: 0, z: 0 }, speed: 0 },
      [
        { id: 'middle', x: 0, z: 7.2, velocity: { x: 0, z: 0 }, speed: 0 },
        { id: 'left', x: -3, z: 6.8, velocity: { x: 0, z: 0 }, speed: 0 }
      ]
    );

    expect(snapshots.map(({ id }) => id)).toEqual(['left', 'middle', 'right']);
    expect(snapshots[2].x).toBe(3);
  });
});
