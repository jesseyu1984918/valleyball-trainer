import * as THREE from 'three';
import { clamp } from '../math/vector2.js';
export class Ball{
 constructor(scene){this.scenario=null;this.mesh=scene?new THREE.Mesh(new THREE.SphereGeometry(.15,24,16),new THREE.MeshStandardMaterial({color:0xffe066})):null;if(this.mesh){this.mesh.castShadow=true;scene.add(this.mesh);}}
 start(s){this.scenario=structuredClone(s);if(this.mesh)this.mesh.visible=true;}
 getPosition(progress){if(!this.scenario)throw new Error('Ball has no active scenario');const t=clamp(progress,0,1),{start,landing,arcHeight,drift,floatOffset}=this.scenario;const envelope=Math.sin(Math.PI*t);return{x:start.x+(landing.x-start.x)*t+drift*Math.sin(3*Math.PI*t)*envelope+floatOffset*Math.max(0,(t-.65)/.35)*envelope,y:start.y+(0.75-start.y)*t+arcHeight*envelope,z:start.z+(landing.z-start.z)*t};}
 update(p){const v=this.getPosition(p);if(this.mesh)this.mesh.position.set(v.x,v.y,v.z);return v;}
 getLandingPoint(){return this.scenario?{...this.scenario.landing}:null;}
 reset(){this.scenario=null;if(this.mesh)this.mesh.visible=false;}
}
