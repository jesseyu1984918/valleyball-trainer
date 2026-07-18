import * as THREE from 'three';
import { FORMATION, POSITION_SHORTCUTS, RECEIVER_POSITIONS, ROUND_TIMING, SERVE_TYPES } from '../config.js';
import { createCourt } from './Court.js';
import { Player } from './Player.js';
import { Teammate } from './Teammate.js';
import { Ball } from './Ball.js';
import { createServeScenario } from './ServeGenerator.js';
import { decideOwnership } from './DecisionEngine.js';
import { scoreRound } from './Scoring.js';
import { Keyboard } from '../input/Keyboard.js';
import { Hud } from '../ui/Hud.js';
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
    this.revealServeType = true;
    this.ball = new Ball(this.scene);
    this.keyboard = new Keyboard();
    this.hud = new Hud();
    this.sessionTracker = new SessionTracker();
    this.sessionDialog = new SessionDialog();
    this.sessionPaused = false;
    this.pauseStartedAt = 0;
    this.attemptRecorded = false;

    this.hud.setPosition(this.controlledSlot);
    this.hud.setServeSettings({ selectedServeType: this.selectedServeType, revealServeType: this.revealServeType });
    this.hud.onPositionSelect((slot) => this.setControlledSlot(slot));
    this.hud.onServeTypeSelect((serveType) => {
      if (SERVE_TYPES[serveType]) this.selectedServeType = serveType;
    });
    this.hud.onRevealServeChange((reveal) => {
      this.revealServeType = reveal;
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
    this.player.reset(FORMATION[this.controlledSlot]);
    for (const teammate of this.teammates) teammate.reset(FORMATION[teammate.id]);
    this.scenario = createServeScenario({ difficulty: 'normal', serveType: this.selectedServeType });
    this.ball.start(this.scenario);
    this.ball.mesh.visible = false;
    this.phase = 'countdown';
    this.phaseStart = now;
    this.decisionDone = false;
    this.attemptRecorded = false;
    const serveLabel = this.revealServeType ? SERVE_TYPES[this.scenario.serveType].label : 'Unknown';
    this.hud.setActiveServe(serveLabel);
    this.hud.update({ state: 'Countdown', reaction: '—', feedback: `Serve: ${serveLabel}. Read the server and be ready to move.` });
  }

  beginServe(now) {
    this.phase = 'serve';
    this.hasServeStarted = true;
    this.roundStart = now;
    this.ball.mesh.visible = true;
    this.hud.update({ state: 'Serve', feedback: 'Move with WASD. Call MINE or LEAVE before the ball arrives.' });
  }

  evaluate(call, now) {
    if (this.decisionDone || this.phase !== 'serve') return;
    this.decisionDone = true;
    const reactionMs = now - this.roundStart;
    const decision = decideOwnership({
      landing: this.scenario.landing,
      receivers: this.receiverSnapshots(),
      controlledSlot: this.controlledSlot
    });
    const result = scoreRound({
      call,
      decision,
      player: this.player.snapshot(),
      landing: this.scenario.landing,
      reactionMs
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
    const serveLabel = SERVE_TYPES[this.scenario.serveType].label;
    this.hud.setActiveServe(serveLabel);
    this.hud.update({
      score: this.score,
      streak: this.streak,
      reaction: `${Math.round(reactionMs)} ms`,
      state: 'Feedback',
      feedback: `${result.correct ? 'Correct' : 'Incorrect'} — ${serveLabel}. ${decision.explanation} +${result.total}`
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
      if (action === 'm' || action === 'l') this.evaluate(action === 'm' ? 'mine' : 'leave', now);
      if (progress >= ROUND_TIMING.decisionPlaneProgress && !this.decisionDone) this.evaluate(null, now);
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
