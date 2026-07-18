import { Player } from './Player.js';
export class Teammate extends Player{updateToward(target,dt){const dx=target.x-this.x,dz=target.z-this.z;const m=Math.hypot(dx,dz);super.update(m>.05?{x:dx/m,z:dz/m}:{x:0,z:0},dt);}}
