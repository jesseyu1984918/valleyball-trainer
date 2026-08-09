import { describe, expect, it } from 'vitest';
import { SCORING } from '../config.js';
import { assessMovement } from './MovementAssessment.js';

const target = { x: 0, z: 7, radius: 0.45 };

describe('assessMovement', () => {
  it('counts body overlap with the target circle as in position', () => {
    const result = assessMovement({ player: { x: 0.72, z: 7 }, target });
    expect(result.status).toBe('in-position');
    expect(result.movementPoints).toBe(SCORING.movementMax);
    expect(result.outsideDistance).toBe(0);
  });

  it('classifies up to 0.5m outside the overlap boundary as close', () => {
    const result = assessMovement({ player: { x: 0.98, z: 7 }, target });
    expect(result.status).toBe('close');
    expect(result.outsideDistance).toBeCloseTo(0.25);
    expect(result.movementPoints).toBeGreaterThan(0);
    expect(result.movementPoints).toBeLessThan(SCORING.movementMax);
  });

  it('classifies beyond the close band as missed', () => {
    const result = assessMovement({ player: { x: 1.3, z: 7 }, target });
    expect(result.status).toBe('missed');
    expect(result.outsideDistance).toBeCloseTo(0.57);
    expect(result.movementPoints).toBe(0);
  });
});
