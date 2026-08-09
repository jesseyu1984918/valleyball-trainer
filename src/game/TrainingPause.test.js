import { describe, expect, it, vi } from 'vitest';
import { Game } from './Game.js';

function makeGame(phase = 'move') {
  return {
    phase,
    scenario: { serveType: 'jumpFloat' },
    decisionDone: true,
    hasServeStarted: true,
    attemptRecorded: false,
    roundDecision: { expectedCall: 'mine' },
    pendingCall: 'mine',
    pendingReactionMs: 620,
    roundStart: 100,
    score: 87,
    streak: 3,
    sessionPaused: false,
    ball: { reset: vi.fn() },
    trajectoryGuide: { reset: vi.fn() },
    hud: {
      clearDecisionResult: vi.fn(),
      setTrainingPaused: vi.fn(),
      update: vi.fn()
    }
  };
}

describe('training pause', () => {
  it('cancels an unfinished round without changing session score or streak', () => {
    const game = makeGame('move');
    expect(Game.prototype.pauseTraining.call(game)).toBe(true);
    expect(game.phase).toBe('paused');
    expect(game.scenario).toBeNull();
    expect(game.pendingCall).toBeNull();
    expect(game.pendingReactionMs).toBeNull();
    expect(game.roundDecision).toBeNull();
    expect(game.score).toBe(87);
    expect(game.streak).toBe(3);
    expect(game.ball.reset).toHaveBeenCalled();
    expect(game.trajectoryGuide.reset).toHaveBeenCalled();
    expect(game.hud.setTrainingPaused).toHaveBeenCalledWith(true);
  });

  it('does not interfere with the separate session-summary pause', () => {
    const game = makeGame('serve');
    game.sessionPaused = true;
    expect(Game.prototype.pauseTraining.call(game)).toBe(false);
    expect(game.phase).toBe('serve');
  });

  it('starts a fresh round instead of resuming the canceled scenario', () => {
    const game = makeGame('paused');
    game.resetRound = vi.fn();
    expect(Game.prototype.startNextRound.call(game, 1234)).toBe(true);
    expect(game.hud.setTrainingPaused).toHaveBeenCalledWith(false);
    expect(game.resetRound).toHaveBeenCalledWith(1234);
  });
});
