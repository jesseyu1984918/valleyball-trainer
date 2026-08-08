import { describe, expect, it } from 'vitest';
import { DIFFICULTIES } from '../config.js';
import { createServeScenario } from './ServeGenerator.js';

function fixedRng() {
  return 0.75;
}

describe('serve difficulty', () => {
  it('exposes the player-facing difficulty mapping', () => {
    expect(DIFFICULTIES).toEqual({
      easy: { label: 'Easy', generatorValue: 'easy' },
      medium: { label: 'Medium', generatorValue: 'normal' },
      difficult: { label: 'Difficult', generatorValue: 'hard' }
    });
  });

  it('orders speed and movement from easy through difficult', () => {
    const easy = createServeScenario({ rng: fixedRng, difficulty: 'easy', serveType: 'jumpFloat' });
    const medium = createServeScenario({ rng: fixedRng, difficulty: 'normal', serveType: 'jumpFloat' });
    const difficult = createServeScenario({ rng: fixedRng, difficulty: 'hard', serveType: 'jumpFloat' });

    expect(easy.durationMs).toBeGreaterThan(medium.durationMs);
    expect(medium.durationMs).toBeGreaterThan(difficult.durationMs);
    expect(Math.abs(easy.floatDrift)).toBeLessThan(Math.abs(medium.floatDrift));
    expect(Math.abs(medium.floatDrift)).toBeLessThan(Math.abs(difficult.floatDrift));
    expect(Math.abs(easy.lateFloat)).toBeLessThan(Math.abs(medium.lateFloat));
    expect(Math.abs(medium.lateFloat)).toBeLessThan(Math.abs(difficult.lateFloat));
  });

  it('scales topspin drop with difficulty', () => {
    const easy = createServeScenario({ rng: fixedRng, difficulty: 'easy', serveType: 'jumpTopspin' });
    const medium = createServeScenario({ rng: fixedRng, difficulty: 'normal', serveType: 'jumpTopspin' });
    const difficult = createServeScenario({ rng: fixedRng, difficulty: 'hard', serveType: 'jumpTopspin' });

    expect(easy.topspinDrop).toBeLessThan(medium.topspinDrop);
    expect(medium.topspinDrop).toBeLessThan(difficult.topspinDrop);
  });
});
