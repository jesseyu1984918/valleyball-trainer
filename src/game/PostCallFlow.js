import { ROUND_TIMING } from '../config.js';

export function classifyCall({ call, decision }) {
  return call === 'mine' && decision?.expectedCall === 'mine' ? 'move' : 'feedback';
}

export function shouldFinalizeMove(progress) {
  return progress >= ROUND_TIMING.decisionPlaneProgress;
}
