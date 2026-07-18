export const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
export const subtract=(a,b)=>({x:a.x-b.x,z:a.z-b.z});
export const length=v=>Math.hypot(v.x,v.z);
export const distance=(a,b)=>length(subtract(a,b));
export function normalize(v){const m=length(v);return m===0?{x:0,z:0}:{x:v.x/m,z:v.z/m};}
export const dot=(a,b)=>a.x*b.x+a.z*b.z;
