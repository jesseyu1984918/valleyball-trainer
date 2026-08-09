import { describe, expect, it } from 'vitest';
import { TrajectoryGuide } from './TrajectoryGuide.js';

describe('TrajectoryGuide', () => {
  it('tracks guide state without a Three.js scene', () => {
    const guide = new TrajectoryGuide(null);
    guide.update({ position: { x: 1.2, z: 6.5 }, radius: 0.8, ownership: 'mine' });
    expect(guide.state).toEqual({ visible: true, x: 1.2, z: 6.5, radius: 0.8, ownership: 'mine' });
    guide.hide();
    expect(guide.state.visible).toBe(false);
    guide.reset();
    expect(guide.state).toEqual({ visible: false, x: 0, z: 0, radius: 1, ownership: 'leave' });
  });
});
