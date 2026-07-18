import * as THREE from 'three';
import { COURT } from '../config.js';
import { clamp, normalize } from '../math/vector2.js';

export class Player {
  constructor(scene, { id = 'middle', x = 0, z = 7.2, color = 0x36c2ff } = {}) {
    this.scene = scene;
    this.id = id;
    this.x = x;
    this.z = z;
    this.velocity = { x: 0, z: 0 };
    this.speed = 0;
    this.mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.9, 8, 16),
      new THREE.MeshStandardMaterial({ color })
    );
    this.mesh.position.set(x, 0.75, z);
    this.mesh.castShadow = true;
    scene.add(this.mesh);
  }

  reset({ id = this.id, x, z }) {
    this.id = id;
    this.x = x;
    this.z = z;
    this.velocity = { x: 0, z: 0 };
    this.speed = 0;
    this.sync();
  }

  update(input, dt) {
    const direction = normalize(input);
    const speed = 3.3;
    this.velocity = { x: direction.x * speed, z: direction.z * speed };
    this.speed = Math.hypot(this.velocity.x, this.velocity.z);
    this.x = clamp(this.x + this.velocity.x * dt, COURT.receiveMinX, COURT.receiveMaxX);
    this.z = clamp(this.z + this.velocity.z * dt, COURT.playableMinZ, COURT.playableMaxZ);
    this.sync();
  }

  sync() {
    this.mesh.position.set(this.x, 0.75, this.z);
  }

  snapshot() {
    return { id: this.id, x: this.x, z: this.z, velocity: { ...this.velocity }, speed: this.speed };
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
