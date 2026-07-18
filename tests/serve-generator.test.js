import { describe, expect, it } from 'vitest';
import { CONCRETE_SERVE_TYPES } from '../src/config.js';
import { createServeScenario, validateScenario } from '../src/game/ServeGenerator.js';

const midpointRng = () => 0.5;

describe('serve profiles', () => {
  it('resolves random to a concrete profile', () => {
    const scenario = createServeScenario({ rng: midpointRng });
    expect(CONCRETE_SERVE_TYPES).toContain(scenario.serveType);
    expect(scenario.serveType).not.toBe('random');
  });

  it.each(CONCRETE_SERVE_TYPES)('preserves fixed type %s', (serveType) => {
    expect(createServeScenario({ rng: midpointRng, serveType }).serveType).toBe(serveType);
  });

  it('keeps short float in the short region', () => {
    const scenario = createServeScenario({ rng: midpointRng, serveType: 'shortFloat' });
    expect(scenario.landing.z).toBeGreaterThanOrEqual(3.3);
    expect(scenario.landing.z).toBeLessThanOrEqual(5.1);
  });

  it('keeps deep topspin near the baseline', () => {
    const scenario = createServeScenario({ rng: midpointRng, serveType: 'deepTopspin' });
    expect(scenario.landing.z).toBeGreaterThanOrEqual(7.7);
    expect(scenario.landing.z).toBeLessThanOrEqual(8.7);
  });

  it('gives topspin more drop and less float than float serves', () => {
    const floatServe = createServeScenario({ rng: midpointRng, serveType: 'jumpFloat' });
    const topspin = createServeScenario({ rng: midpointRng, serveType: 'jumpTopspin' });
    expect(topspin.topspinDrop).toBeGreaterThan(floatServe.topspinDrop);
    expect(Math.abs(topspin.lateFloat)).toBeLessThan(Math.abs(floatServe.lateFloat));
  });

  it('normalizes invalid types through random selection', () => {
    const scenario = createServeScenario({ rng: midpointRng, serveType: 'invalid' });
    expect(CONCRETE_SERVE_TYPES).toContain(scenario.serveType);
  });

  it.each(CONCRETE_SERVE_TYPES)('creates a valid in-court %s scenario', (serveType) => {
    expect(validateScenario(createServeScenario({ rng: midpointRng, serveType }))).toBe(true);
  });
});