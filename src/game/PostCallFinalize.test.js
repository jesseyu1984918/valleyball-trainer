import { describe, expect, it, vi } from 'vitest';
import { Game } from './Game.js';

function makeFinalizer(playerPosition) {
  const recordAttempt = vi.fn();
  return {
    game: {
      phase: 'move',
      roundDecision: { expectedCall: 'mine', ownerId: 'middle', explanation: 'frozen ownership' },
      scenario: { serveType: 'jumpFloat', landing: { x: 0, z: 7 } },
      controlledSlot: 'middle',
      player: { snapshot: () => ({ ...playerPosition }) },
      trajectoryGuide: { hide: vi.fn() },
      sessionTracker: { recordAttempt },
      attemptRecorded: false,
      score: 0,
      streak: 0,
      pendingCall: 'mine',
      pendingReactionMs: 600,
      hud: {
        setActiveServe: vi.fn(),
        showDecisionResult: vi.fn(),
        update: vi.fn()
      }
    },
    recordAttempt
  };
}

describe('post-call finalization', () => {
  it('scores movement from the final player position', () => {
    const close = makeFinalizer({ x: 0, z: 7.65 });
    const far = makeFinalizer({ x: 3, z: 8.5 });

    Game.prototype.finalizeRound.call(close.game, {
      call: 'mine', reactionMs: 600, movementRequired: true, now: 1900
    });
    Game.prototype.finalizeRound.call(far.game, {
      call: 'mine', reactionMs: 600, movementRequired: true, now: 1900
    });

    const closeAttempt = close.recordAttempt.mock.calls[0][0];
    const farAttempt = far.recordAttempt.mock.calls[0][0];
    expect(closeAttempt.movement_points).toBeGreaterThan(farAttempt.movement_points);
  });

  it('records exactly one attempt even if finalization is invoked twice', () => {
    const { game, recordAttempt } = makeFinalizer({ x: 0, z: 7.65 });
    const args = { call: 'mine', reactionMs: 600, movementRequired: true, now: 1900 };

    Game.prototype.finalizeRound.call(game, args);
    Game.prototype.finalizeRound.call(game, args);

    expect(recordAttempt).toHaveBeenCalledTimes(1);
    expect(game.phase).toBe('feedback');
  });
});
