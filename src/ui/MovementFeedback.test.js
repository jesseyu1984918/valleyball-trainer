import { describe, expect, it } from 'vitest';
import { buildMovementFeedback } from './MovementFeedback.js';

describe('buildMovementFeedback', () => {
  it('reports in-position success', () => {
    expect(buildMovementFeedback({ status: 'in-position', outsideDistance: 0 }))
      .toBe('IN POSITION ✓');
  });

  it('reports close distance outside the circle', () => {
    expect(buildMovementFeedback({ status: 'close', outsideDistance: 0.34 }))
      .toBe('CLOSE — 0.3 m OUTSIDE');
  });

  it('reports missed distance outside the circle', () => {
    expect(buildMovementFeedback({ status: 'missed', outsideDistance: 1.08 }))
      .toBe('MISSED POSITION — 1.1 m OUTSIDE');
  });
});
