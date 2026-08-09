import * as THREE from 'three';
import { DIFFICULTIES, FORMATION, POSITION_SHORTCUTS, RECEIVER_POSITIONS, ROUND_TIMING, SERVE_TYPES } from '../config.js';
import { createCourt } from './Court.js';
import { Player } from './Player.js';
import { Teammate } from './Teammate.js';
import { Ball } from './Ball.js';
import { TrajectoryGuide } from './TrajectoryGuide.js';
import { guideRadius, predictionProgress } from './TrajectoryGuideModel.js';
import { createServeScenario } from './ServeGenerator.js';
import { decideOwnership } from './DecisionEngine.js';
import { scoreRound } from './Scoring.js';
import { classifyCall, shouldFinalizeMove } from './PostCallFlow.js';
import { resolveGeneratorDifficulty } from './GameSettings.js';
import { Keyboard } from '../input/Keyboard.js';
import { Hud } from '../ui/Hud.js';
import { buildDecisionFeedback } from '../ui/DecisionFeedback.js';
import { SessionDialog } from '../ui/SessionDialog.js';
import { SessionTracker } from '../session/SessionTracker.js';
import {
  attemptsToCsv,
  buildExportFilenames,
  downloadCsv,
  summaryToCsv
} from '../session/CsvExport.js';
import { buildAttemptRecord, recordAttemptOnce } from '../session/GameSessionBridge.js';
import { canSelectPosition, isValidSlot, orderedReceiverSnapshots, teammateSlots } from './ReceiverPositions.js';

export class Game {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    createCourt(this.scene);

    this.controlledSlot = 'middle';
    this.player = new Player(this.scene, FORMATION[this.controlledSlot]);
    this.teammates = [];
    this.rebuildFormation();

    this.selectedServeType = 'random';
    this.selectedDifficulty = 'medium';
    this.selectedGuidanceMode = 'on';
    this.revealServeType = true;
    this.ball = new Ball(this.scene);
    this.trajectoryGuide = new TrajectoryGuide(this.scene);
    this.keyboard = new Keyboard();
    this.hud = new Hud();
    this.sessionTracker = new SessionTracker();
    this.sessionDialog = new SessionDialog();
    this.sessionPaused = false;
    this.pauseStartedAt = 0;
    this.attemptRecorded = false;
    this.roundDecision = null;
    this.pendingCall = null;
    this.pendingReactionMs = null;

    this.hud.setPosition(this.controlledSlot);
    this.hud.setServeSettings({ selectedServeType: this.selectedServeType, revealServeType: this.revealServeType });
    this.hud.setDifficulty(this.selectedDifficulty);
    this.hud.setGuidanceMode(this.selectedGuidanceMode);
    this.hud.onPositionSelect((slot) => this.setControlledSlot(slot));
    this.hud.onServeTypeSelect((serveType) => {
      if (SERVE_TYPES[serveType]) this.selectedServeType = serveType;
    });
    this.hud.onRevealServeChange((reveal) => {
      this.revealServeType = reveal;
    });
    this.hud.onDifficultyChange((key) => {
      if (DIFFICULTIES[key]) this.selectedDifficulty = key;
    });
    this.hud.onGuidanceModeChange((mode) => {
      if (mode === 'on' || mode === 'off') {
        this.selectedGuidanceMode = mode;
        if (mode === 'off') this.trajectoryGuide.hide();
      }
    });
    this.hud.onEndSession(() => this.openSessionSummary());

    this.sessionDialog.onDownloadAttempts((username) => this.downloadSessionData(username, 'attempts'));
    this.sessionDialog.onDownloadSession((username) => this.downloadSessionData(username, 'session'));
    this.sessionDialog.onDownloadBoth((username) => this.downloadSessionData(username, 'both'));
    this.sessionDialog.onReturnToSession(() => this.resumeSession());
    this.sessionDialog.onStartNewSession(() => this.startNewSession());

    this.score = 0;
    this.streak = 0;
    this.phase = 'countdown';
    this.phaseStart = performance.now();
    this.roundStart = 0;
    this.scenario = null;
    this.decisionDone = false;
    this.hasServeStarted = false;
    this.last = performance.now();

    addEventListener('resize', () => this.resize());
    this.resize();
  }

  start() { requestAnimationFrame((time) => this.loop(time)); }

  rebuildFormation() {
    this.player.reset(FORMATION[this.controlledSlot]);
    for (const teammate of this.teammates) teammate.dispose();
    this.teammates = teammateSlots(this.controlledSlot).map(
      (slot) => new Teammate(this.scene, { ...FORMATION[slot], color: 0xff8a65 })
    );
  }

  setControlledSlot(slot) {
    if (!isValidSlot(slot) || slot === this.controlledSlot) return false;
    if (!canSelectPosition(this.phase, this.hasServeStarted)) return false;
    this.controlledSlot = slot;
    this.rebuildFormation();
    this.hud.setPosition(slot);
    if (this.phase === 'feedback') {
      this.hud.update({ feedback: `Position changed — next round: ${RECEIVER_POSITIONS[slot].label}.` });
    }
    return true;
  }

  receiverSnapshots() {
    return orderedReceiverSnapshots(
      this.controlledSlot,
      this.player.snapshot(),
      this.teammates.map((teammate) => teammate.snapshot())
    );
  }

  resetRound(now) {
    this.hud.clearDecisionResult();
    this.trajectoryGuide.reset();
    this.player.reset(FORMATION[this.controlledSlot]);
    for (const teammate of this.teammates) teammate.reset(FORMATION[teammate.id]);
    this.scenario = createServeScenario({
      difficulty: resolveGeneratorDifficulty(this.selectedDifficulty),
      serveType: this.selectedServeType
    });
    this.ball.start(this.scenario);
    this.ball.mesh.visible = false;
    this.phase = 'countdown';
    this.phaseStart = now;
    this.decisionDone = false;
    this.attemptRecorded = false;
    this.roundDecision = null;
    this.pendingCall = null;
    this.pendingReactionMs = null;
    const serveLabel = this.revealServeType ? SERVE_TYPES[this.scenario.serveType].label : 'Unknown';
    this.hud.setActiveServe(serveLabel);
    this.hud.update({ state: 'Countdown', reaction: '—', feedback: `Serve: ${serveLabel}. Read the server and be ready to move.` });
  }

  beginServe(now) {
    this.phase = 'serve';
    this.hasServeStarted = true;
    this.roundStart = now;
    this.ball.mesh.visible = true;
    this.trajectoryGuide.hide();
    this.roundDecision = decideOwnership({
      landing: this.scenario.landing,
      receivers: this.receiverSnapshots(),
      controlledSlot: this.controlledSlot
    });
    this.hud.update({ state: 'Serve', feedback: 'Move with WASD. Call MINE or LEAVE before the ball arrives.' });
  }

  updateTrajectoryGuide(progress) {
    if (this.phase !== 'move' || this.selectedGuidanceMode !== 'on') {
      this.trajectoryGuide.hide();
      return;
    }
    const predicted = this.ball.getPosition(predictionProgress(progress));
    this.trajectoryGuide.update({
      position: { x: predicted.x, z: predicted.z },
      radius: guideRadius(progress),
      ownership: 'mine'
    });
  }

  evaluate(call, now) {
    if (this.decisionDone || this.phase !== 'serve') return;

    const reactionMs = now - this.roundStart;
    const decision = this.roundDecision ?? decideOwnership({
      landing: this.scenario.landing,
      receivers: this.receiverSnapshots(),
      controlledSlot: this.controlledSlot
    });
    this.roundDecision = decision;

    if (classifyCall({ call, decision }) === 'move') {
      this.decisionDone = true;
      this.pendingCall = call;
      this.pendingReactionMs = reactionMs;
      this.phase = 'move';
      this.phaseStart = now;
      const progress = reactionMs / this.scenario.durationMs;
      if (this.selectedGuidanceMode === 'on') this.updateTrajectoryGuide(progress);
      else this.trajectoryGuide.hide();
      this.hud.update({
        reaction: `${Math.round(reactionMs)} ms`,
        state: 'Move',
        feedback: 'MINE confirmed — move into the target zone.'
      });
      if (shouldFinalizeMove(progress)) {
        this.finalizeRound({ call, reactionMs, movementRequired: true, now });
      }
      return;
    }

    const correctLeave = call === 'leave' && decision.expectedCall === 'leave';
    this.finalizeRound({
      call,
      reactionMs,
      movementRequired: !correctLeave,
      now
    });
  }

  finalizeRound({ call, reactionMs, movementRequired, now }) {
    if (this.phase === 'feedback') return;
    const decision = this.roundDecision ?? decideOwnership({
      landing: this.scenario.landing,
      receivers: this.receiverSnapshots(),
      controlledSlot: this.controlledSlot
    });
    this.roundDecision = decision;
    this.decisionDone = true;
    this.trajectoryGuide.hide();

    const result = scoreRound({
      call,
      decision,
      player: this.player.snapshot(),
      landing: this.scenario.landing,
      reactionMs,
      movementRequired
    });

    const attempt = buildAttemptRecord({
      scenario: this.scenario,
      controlledSlot: this.controlledSlot,
      decision,
      call,
      result,
      reactionMs,
      timestamp: new Date()
    });
    if (recordAttemptOnce({ tracker: this.sessionTracker, attempt, alreadyRecorded: this.attemptRecorded })) {
      this.attemptRecorded = true;
    }

    this.score += result.total;
    this.streak = result.correct ? this.streak + 1 : 0;
    this.phase = 'feedback';
    this.phaseStart = now;
    this.pendingCall = null;
    this.pendingReactionMs = null;
    const serveLabel = SERVE_TYPES[this.scenario.serveType].label;
    this.hud.setActiveServe(serveLabel);
    this.hud.showDecisionResult(buildDecisionFeedback({
      correct: result.correct,
      expectedCall: decision.expectedCall
    }));
    this.hud.update({
      score: this.score,
      streak: this.streak,
      reaction: `${Math.round(reactionMs)} ms`,
      state: 'Feedback',
      feedback: `${result.correct ? 'Correct' : 'Incorrect'} — ${serveLabel}. ${decision.explanation} Movement ${result.movementPoints}. +${result.total}`
    });
  }

  openSessionSummary() {
    if (this.sessionPaused) return;
    this.sessionPaused = true;
    this.pauseStartedAt = performance.now();
    this.sessionDialog.open({ summary: this.sessionTracker.getSummary({ username: '' }) });
  }

  resumeSession() {
    if (!this.sessionPaused) return;
    const pausedFor = performance.now() - this.pauseStartedAt;
    this.phaseStart += pausedFor;
    if (this.roundStart) this.roundStart += pausedFor;
    this.sessionPaused = false;
    this.sessionDialog.close();
    this.last = performance.now();
  }

  downloadSessionData(username, type) {
    const endedAt = new Date();
    const summary = this.sessionTracker.getSummary({ username, endedAt });
    const attempts = this.sessionTracker.getAttempts();
    const filenames = buildExportFilenames(username, endedAt);
    if (type === 'attempts' || type === 'both') {
      downloadCsv(filenames.attempts, attemptsToCsv(attempts, username));
    }
    if (type === 'session' || type === 'both') {
      downloadCsv(filenames.session, summaryToCsv(summary));
    }
  }

  startNewSession() {
    this.sessionTracker.reset();
    this.score = 0;
    this.streak = 0;
    this.scenario = null;
    this.decisionDone = false;
    this.attemptRecorded = false;
    this.hasServeStarted = false;
    this.sessionPaused = false;
    this.roundDecision = null;
    this.pendingCall = null;
    this.pendingReactionMs = null;
    this.trajectoryGuide.reset();
    this.hud.clearDecisionResult();
    this.hud.update({ score: 0, streak: 0, reaction: '—', state: 'Countdown', feedback: 'New session started.' });
    this.sessionDialog.close();
    this.last = performance.now();
  }

  render() {
    const desired = new THREE.Vector3(this.player.x, 4.8, this.player.z + 7.2);
    this.camera.position.lerp(desired, 0.08);
    this.camera.lookAt(this.player.x, 1.2, 0);
    this.renderer.render(this.scene, this.camera);
  }

  loop(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;

    if (this.sessionPaused) {
      this.render();
      requestAnimationFrame((time) => this.loop(time));
      return;
    }

    const action = this.keyboard.consume();
    if (!this.scenario) this.resetRound(now);
    if (POSITION_SHORTCUTS[action]) this.setControlledSlot(POSITION_SHORTCUTS[action]);
    if (this.phase === 'countdown' && now - this.phaseStart >= ROUND_TIMING.countdownMs) this.beginServe(now);

    if (this.phase === 'serve') {
      this.player.update(this.keyboard.movement(), dt);
      const progress = (now - this.roundStart) / this.scenario.durationMs;
      this.ball.update(progress);
      this.trajectoryGuide.hide();
      if (action === 'm' || action === 'l') this.evaluate(action === 'm' ? 'mine' : 'leave', now);
      if (this.phase === 'serve' && progress >= ROUND_TIMING.decisionPlaneProgress && !this.decisionDone) {
        this.evaluate(null, now);
      }
    } else if (this.phase === 'move') {
      this.player.update(this.keyboard.movement(), dt);
      const progress = (now - this.roundStart) / this.scenario.durationMs;
      this.ball.update(progress);
      this.updateTrajectoryGuide(progress);
      if (shouldFinalizeMove(progress)) {
        this.finalizeRound({
          call: this.pendingCall,
          reactionMs: this.pendingReactionMs,
          movementRequired: true,
          now
        });
      }
    } else if (this.phase === 'feedback') {
      if (action === 'r' || now - this.phaseStart >= ROUND_TIMING.feedbackMs) this.resetRound(now);
    }

    for (const teammate of this.teammates) teammate.updateToward(FORMATION[teammate.id], dt);
    this.render();
    requestAnimationFrame((time) => this.loop(time));
  }

  resize() {
    const width = innerWidth;
    const height = innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
