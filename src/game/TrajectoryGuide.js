import * as THREE from 'three';

const MINE_COLOR = 0x36c2ff;
const LEAVE_COLOR = 0x9aa7b3;

export class TrajectoryGuide {
  constructor(scene) {
    this.state = { visible: false, x: 0, z: 0, radius: 1, ownership: 'leave' };
    this.mesh = null;
    if (scene) {
      const geometry = new THREE.RingGeometry(0.78, 1, 64);
      const material = new THREE.MeshBasicMaterial({
        color: LEAVE_COLOR,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      this.mesh = new THREE.Mesh(geometry, material);
      this.mesh.rotation.x = -Math.PI / 2;
      this.mesh.position.y = 0.025;
      this.mesh.visible = false;
      this.mesh.renderOrder = 2;
      scene.add(this.mesh);
    }
  }

  update({ position, radius, ownership }) {
    this.state = {
      visible: true,
      x: position.x,
      z: position.z,
      radius,
      ownership
    };
    if (!this.mesh) return;
    this.mesh.visible = true;
    this.mesh.position.x = position.x;
    this.mesh.position.z = position.z;
    this.mesh.scale.set(radius, radius, radius);
    const mine = ownership === 'mine';
    this.mesh.material.color.setHex(mine ? MINE_COLOR : LEAVE_COLOR);
    this.mesh.material.opacity = mine ? 0.68 : 0.24;
  }

  hide() {
    this.state.visible = false;
    if (this.mesh) this.mesh.visible = false;
  }

  reset() {
    this.state = { visible: false, x: 0, z: 0, radius: 1, ownership: 'leave' };
    if (this.mesh) {
      this.mesh.visible = false;
      this.mesh.position.set(0, 0.025, 0);
      this.mesh.scale.set(1, 1, 1);
    }
  }
}
