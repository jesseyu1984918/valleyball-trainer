import { clamp } from '../math/vector2.js';

export function netCrossingProgress(scenario) {
  const startZ = scenario?.start?.z ?? 0;
  const landingZ = scenario?.landing?.z ?? startZ;
  const span = landingZ - startZ;
  if (Math.abs(span) < 1e-9) return 1;
  return clamp((0 - startZ) / span, 0, 1);
}

export function shouldShowGuide({ mode, progress, scenario }) {
  if (mode === 'guided') return true;
  if (mode === 'readFirst') return clamp(progress, 0, 1) >= netCrossingProgress(scenario);
  return true;
}

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
