import { describe, expect, it } from 'vitest';
import { resolveGeneratorDifficulty } from './GameSettings.js';

describe('resolveGeneratorDifficulty', () => {
  it('maps player-facing difficulty to generator difficulty', () => {
    expect(resolveGeneratorDifficulty('easy')).toBe('easy');
    expect(resolveGeneratorDifficulty('medium')).toBe('normal');
    expect(resolveGeneratorDifficulty('difficult')).toBe('hard');
    expect(resolveGeneratorDifficulty('invalid')).toBe('normal');
  });
});
