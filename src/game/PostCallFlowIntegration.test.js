import { describe, expect, it, vi } from 'vitest';
import { Game } from './Game.js';

function baseGame(expectedCall = 'mine') {
  return {
    phase: 'serve',
    decisionDone: false,
    roundStart: 100,
    roundDecision: {
      expectedCall,
      ownerId: expectedCall === 'mine' ? 'middle' : 'left',
      explanation: 'frozen ownership'
    },
    scenario: {
      serveType: 'jumpFloat',
      durationMs: 2000,
      landing: { x: 0, z: 7 }
    },
    selectedGuidanceMode: 'on',
    pendingCall: null,
    pendingReactionMs: null,
    trajectoryGuide: { hide: vi.fn() },
    hud: { update: vi.fn() },
    updateTrajectoryGuide: vi.fn(),
    finalizeRound: vi.fn()
  };
}

describe('Game post-call flow integration', () => {
  it('defers a correct MINE into move and records reaction state without finalizing', () => {
    const game = baseGame('mine');
    Game.prototype.evaluate.call(game, 'mine', 700);

    expect(game.phase).toBe('move');
    expect(game.pendingCall).toBe('mine');
    expect(game.pendingReactionMs).toBe(600);
    expect(game.finalizeRound).not.toHaveBeenCalled();
    expect(game.updateTrajectoryGuide).toHaveBeenCalled();
  });

  it('keeps guide hidden for a correct MINE when assistance is off', () => {
    const game = baseGame('mine');
    game.selectedGuidanceMode = 'off';
    Game.prototype.evaluate.call(game, 'mine', 700);

    expect(game.phase).toBe('move');
    expect(game.updateTrajectoryGuide).not.toHaveBeenCalled();
    expect(game.trajectoryGuide.hide).toHaveBeenCalled();
  });

  it('finalizes a correct LEAVE immediately without requiring movement', () => {
    const game = baseGame('leave');
    Game.prototype.evaluate.call(game, 'leave', 700);

    expect(game.phase).toBe('serve');
    expect(game.finalizeRound).toHaveBeenCalledWith({
      call: 'leave',
      reactionMs: 600,
      movementRequired: false,
      now: 700
    });
    expect(game.updateTrajectoryGuide).not.toHaveBeenCalled();
  });

  it('finalizes a wrong call immediately and never shows the guide', () => {
    const game = baseGame('mine');
    Game.prototype.evaluate.call(game, 'leave', 700);

    expect(game.finalizeRound).toHaveBeenCalledWith({
      call: 'leave',
      reactionMs: 600,
      movementRequired: true,
      now: 700
    });
    expect(game.updateTrajectoryGuide).not.toHaveBeenCalled();
  });
});
