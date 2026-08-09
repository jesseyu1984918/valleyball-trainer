import { describe, expect, it } from 'vitest';
import { guideRadius, predictionProgress } from './TrajectoryGuideModel.js';

describe('trajectory guide model', () => {
  it('shrinks monotonically from 1.2m to 0.45m radius', () => {
    const samples = [0, 0.25, 0.5, 0.75, 1].map(guideRadius);
    expect(samples[0]).toBeCloseTo(1.2);
    expect(samples[4]).toBeCloseTo(0.45);
    for (let i = 1; i < samples.length; i += 1) expect(samples[i]).toBeLessThan(samples[i - 1]);
  });

  it('predicts ahead and converges to contact', () => {
    for (const t of [0, 0.2, 0.5, 0.8]) {
      const p = predictionProgress(t);
      expect(p).toBeGreaterThan(t);
      expect(p).toBeLessThanOrEqual(1);
    }
    expect(predictionProgress(1)).toBe(1);
  });
});
