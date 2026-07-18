import { describe, expect, it } from 'vitest';
import { Ball } from '../src/game/Ball.js';

const base = {
  serveType: 'standingFloat',
  start: { x: 0, y: 3.2, z: -8 },
  landing: { x: 1.5, z: 7 },
  durationMs: 2400,
  arcHeight: 3.5,
  floatDrift: 0,
  lateFloat: 0,
  topspinDrop: 0
};

describe('ball trajectories', () => {
  it('starts and lands exactly at the scenario endpoints', () => {
    const ball = new Ball();
    ball.start(base);
    expect(ball.getPosition(0)).toEqual(base.start);
    const end = ball.getPosition(1);
    expect(end.x).toBeCloseTo(base.landing.x);
    expect(end.y).toBeCloseTo(0.75);
    expect(end.z).toBeCloseTo(base.landing.z);
  });

  it('adds lateral movement for float profiles', () => {
    const ball = new Ball();
    ball.start({ ...base, floatDrift: 0.3, lateFloat: 0.25 });
    const moved = ball.getPosition(0.75);
    const linearX = base.start.x + (base.landing.x - base.start.x) * 0.75;
    expect(Math.abs(moved.x - linearX)).toBeGreaterThan(0.05);
  });

  it('makes topspin descend below the same no-spin arc late in flight', () => {
    const plain = new Ball();
    plain.start(base);
    const topspin = new Ball();
    topspin.start({ ...base, serveType: 'jumpTopspin', topspinDrop: 0.9 });
    expect(topspin.getPosition(0.8).y).toBeLessThan(plain.getPosition(0.8).y);
  });
});