import { describe, expect, it } from 'vitest';
import { SCORING } from '../config.js';
import { scoreRound } from './Scoring.js';

const mineDecision = { expectedCall: 'mine' };
const leaveDecision = { expectedCall: 'leave' };
const landing = { x: 0, z: 7 };

describe('scoreRound movement requirements', () => {
  it('does not penalize a correct LEAVE when movement is not required', () => {
    const result = scoreRound({
      call: 'leave',
      decision: leaveDecision,
      player: { x: 0, z: 7 },
      landing,
      reactionMs: 800,
      movementRequired: false
    });
    expect(result.correct).toBe(true);
    expect(result.movementPoints).toBe(SCORING.movementMax);
  });

  it('still scores correct MINE from the final player position', () => {
    const close = scoreRound({
      call: 'mine',
      decision: mineDecision,
      player: { x: 0, z: 7.65 },
      landing,
      reactionMs: 800
    });
    const far = scoreRound({
      call: 'mine',
      decision: mineDecision,
      player: { x: 3, z: 8.5 },
      landing,
      reactionMs: 800
    });
    expect(close.movementPoints).toBeGreaterThan(far.movementPoints);
  });

  it('uses an explicit movement score from circle assessment', () => {
    const result = scoreRound({
      call: 'mine',
      decision: mineDecision,
      player: { x: 4, z: 8 },
      landing,
      reactionMs: 800,
      movementPointsOverride: 17
    });
    expect(result.movementPoints).toBe(17);
  });
});
