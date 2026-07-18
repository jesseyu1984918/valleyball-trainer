import { describe, expect, it } from 'vitest';
import { decideOwnership } from '../src/game/DecisionEngine.js';

const receivers = [
  { id: 'left', x: -3, z: 6.8 },
  { id: 'middle', x: 0, z: 7.2 },
  { id: 'right', x: 3, z: 6.8 }
];

describe('ownership', () => {
  it('calls mine when middle owns the ball and middle is controlled', () => {
    const decision = decideOwnership({
      landing: { x: 0, z: 7 },
      receivers,
      controlledSlot: 'middle'
    });

    expect(decision.ownerId).toBe('middle');
    expect(decision.expectedCall).toBe('mine');
  });

  it('calls mine when left owns the ball and left is controlled', () => {
    const decision = decideOwnership({
      landing: { x: -3, z: 6.8 },
      receivers,
      controlledSlot: 'left'
    });

    expect(decision.ownerId).toBe('left');
    expect(decision.expectedCall).toBe('mine');
  });

  it('calls leave when left owns the ball but right is controlled', () => {
    const decision = decideOwnership({
      landing: { x: -3, z: 6.8 },
      receivers,
      controlledSlot: 'right'
    });

    expect(decision.ownerId).toBe('left');
    expect(decision.expectedCall).toBe('leave');
  });

  it('calls mine when right owns the ball and right is controlled', () => {
    const decision = decideOwnership({
      landing: { x: 3, z: 6.8 },
      receivers,
      controlledSlot: 'right'
    });

    expect(decision.ownerId).toBe('right');
    expect(decision.expectedCall).toBe('mine');
  });
});
