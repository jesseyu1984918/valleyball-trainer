import { COURT, ROUND_TIMING } from '../config.js';
import { clamp } from '../math/vector2.js';
const zones=[[-3,6.8],[-1.5,7],[0,7.2],[1.5,7],[3,6.8],[0,4.4],[0,8.4]];
export function validateScenario(s){return !!s&&Number.isFinite(s.start?.x)&&Number.isFinite(s.start?.y)&&Number.isFinite(s.start?.z)&&s.landing?.x>=COURT.receiveMinX&&s.landing.x<=COURT.receiveMaxX&&s.landing.z>=COURT.playableMinZ&&s.landing.z<=COURT.playableMaxZ&&s.durationMs>500&&s.arcHeight>0;}
export function createServeScenario({rng=Math.random,difficulty='normal'}={}){
 const zone=zones[Math.floor(rng()*zones.length)%zones.length];
 const durationBase={easy:3300,normal:ROUND_TIMING.defaultServeMs,hard:1900}[difficulty]??ROUND_TIMING.defaultServeMs;
 const maxDrift={easy:.08,normal:.2,hard:.38}[difficulty]??.2;
 const s={start:{x:(rng()-.5)*2.4,y:3.2,z:-8},landing:{x:clamp(zone[0]+(rng()-.5)*.7,COURT.receiveMinX,COURT.receiveMaxX),z:clamp(zone[1]+(rng()-.5)*.55,COURT.playableMinZ,COURT.playableMaxZ)},durationMs:durationBase+(rng()-.5)*250,arcHeight:2.4+rng()*1.4,drift:(rng()-.5)*2*maxDrift,floatOffset:(rng()-.5)*maxDrift};
 return validateScenario(s)?s:{start:{x:0,y:3.2,z:-8},landing:{x:0,z:7.2},durationMs:ROUND_TIMING.defaultServeMs,arcHeight:3,drift:0,floatOffset:0};
}
