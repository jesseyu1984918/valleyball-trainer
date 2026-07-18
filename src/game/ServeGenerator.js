import { CONCRETE_SERVE_TYPES, COURT, ROUND_TIMING, SERVE_PROFILES } from '../config.js';
import { clamp } from '../math/vector2.js';

const difficultyScale = Object.freeze({
  easy: { duration: 1.15, movement: 0.75 },
  normal: { duration: 1, movement: 1 },
  hard: { duration: 0.82, movement: 1.25 }
});

function sample(rng, [min, max]) {
  return min + (max - min) * rng();
}

function signedSample(rng, range, scale = 1) {
  return (rng() < 0.5 ? -1 : 1) * sample(rng, range) * scale;
}

function resolveServeType(requested, rng) {
  if (requested !== 'random' && CONCRETE_SERVE_TYPES.includes(requested)) return requested;
  const index = Math.min(CONCRETE_SERVE_TYPES.length - 1, Math.floor(rng() * CONCRETE_SERVE_TYPES.length));
  return CONCRETE_SERVE_TYPES[index];
}

export function validateScenario(s) {
  return !!s &&
    CONCRETE_SERVE_TYPES.includes(s.serveType) &&
    Number.isFinite(s.start?.x) && Number.isFinite(s.start?.y) && Number.isFinite(s.start?.z) &&
    s.landing?.x >= COURT.receiveMinX && s.landing.x <= COURT.receiveMaxX &&
    s.landing.z >= COURT.playableMinZ && s.landing.z <= COURT.playableMaxZ &&
    s.durationMs > 500 && s.arcHeight > 0 &&
    Number.isFinite(s.floatDrift) && Number.isFinite(s.lateFloat) && Number.isFinite(s.topspinDrop);
}

export function createServeScenario({ rng = Math.random, difficulty = 'normal', serveType = 'random' } = {}) {
  const concreteType = resolveServeType(serveType, rng);
  const profile = SERVE_PROFILES[concreteType];
  const scale = difficultyScale[difficulty] ?? difficultyScale.normal;
  const depth = sample(rng, profile.depth);
  const scenario = {
    serveType: concreteType,
    start: { x: (rng() - 0.5) * 2.6, y: sample(rng, profile.launchHeight), z: -8 },
    landing: {
      x: clamp((rng() - 0.5) * 7.6, COURT.receiveMinX, COURT.receiveMaxX),
      z: clamp(depth, COURT.playableMinZ, COURT.playableMaxZ)
    },
    durationMs: sample(rng, profile.duration) * scale.duration,
    arcHeight: sample(rng, profile.arc),
    floatDrift: signedSample(rng, profile.drift, scale.movement),
    lateFloat: signedSample(rng, profile.lateFloat, scale.movement),
    topspinDrop: sample(rng, profile.topspinDrop) * scale.movement
  };

  if (validateScenario(scenario)) return scenario;

  return {
    serveType: 'standingFloat',
    start: { x: 0, y: 2.9, z: -8 },
    landing: { x: 0, z: 7.2 },
    durationMs: ROUND_TIMING.defaultServeMs,
    arcHeight: 2.7,
    floatDrift: 0.2,
    lateFloat: 0.15,
    topspinDrop: 0
  };
}