import { clamp } from '../math/vector2.js';

export function guideRadius(progress) {
  const t = clamp(progress, 0, 1);
  const smooth = t * t * (3 - 2 * t);
  return 1.2 + (0.45 - 1.2) * smooth;
}

export function predictionProgress(progress) {
  const t = clamp(progress, 0, 1);
  const lookAhead = 0.72 - 0.32 * t;
  return clamp(t + (1 - t) * lookAhead, t, 1);
}
