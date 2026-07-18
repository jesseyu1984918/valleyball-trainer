import * as THREE from 'three';
import { clamp } from '../math/vector2.js';

export class Ball {
  constructor(scene) {
    this.scenario = null;
    this.mesh = scene
      ? new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 24, 16),
          new THREE.MeshStandardMaterial({ color: 0xffe066 })
        )
      : null;
    if (this.mesh) {
      this.mesh.castShadow = true;
      scene.add(this.mesh);
    }
  }

  start(scenario) {
    this.scenario = structuredClone(scenario);
    if (this.mesh) this.mesh.visible = true;
  }

  getPosition(progress) {
    if (!this.scenario) throw new Error('Ball has no active scenario');

    const t = clamp(progress, 0, 1);
    const {
      start,
      landing,
      arcHeight,
      floatDrift = 0,
      lateFloat = 0,
      topspinDrop = 0
    } = this.scenario;
    const envelope = Math.sin(Math.PI * t);
    const lateEnvelope = Math.sin(Math.PI * Math.max(0, (t - 0.55) / 0.45));
    const floatX = floatDrift * Math.sin(3 * Math.PI * t) * envelope + lateFloat * lateEnvelope;
    const drop = topspinDrop * Math.pow(t, 3) * (1 - t);

    return {
      x: start.x + (landing.x - start.x) * t + floatX,
      y: start.y + (0.75 - start.y) * t + arcHeight * envelope - drop,
      z: start.z + (landing.z - start.z) * t
    };
  }

  update(progress) {
    const position = this.getPosition(progress);
    if (this.mesh) this.mesh.position.set(position.x, position.y, position.z);
    return position;
  }

  getLandingPoint() {
    return this.scenario ? { ...this.scenario.landing } : null;
  }

  reset() {
    this.scenario = null;
    if (this.mesh) this.mesh.visible = false;
  }
}