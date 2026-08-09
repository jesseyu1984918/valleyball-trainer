import { describe, expect, it } from 'vitest';
import { Ball } from './Ball.js';
import { guideRadius, predictionProgress } from './TrajectoryGuideModel.js';

describe('trajectory guide integration', () => {
  const scenario = {
    serveType: 'jumpFloat',
    start: { x: 0, y: 3.5, z: -8 },
    landing: { x: 2, z: 8 },
    durationMs: 2400,
    arcHeight: 3,
    floatDrift: 0.3,
    lateFloat: 0.35,
    topspinDrop: 0
  };

  it('uses the canonical ball trajectory for a moving forward prediction', () => {
    const ball = new Ball(null);
    ball.start(scenario);
    const early = ball.getPosition(predictionProgress(0.1));
    const late = ball.getPosition(predictionProgress(0.7));
    expect(early.z).toBeGreaterThan(0);
    expect(late.z).toBeGreaterThan(early.z);
    expect(late.x).not.toBe(early.x);
    expect(guideRadius(0.7)).toBeLessThan(guideRadius(0.1));
  });
});
