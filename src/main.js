import './styles.css';
import { Game } from './game/Game.js';
const error=document.querySelector('#startup-error');
try{const canvas=document.querySelector('#game-canvas');const probe=document.createElement('canvas');if(!probe.getContext('webgl2')&&!probe.getContext('webgl'))throw new Error('WebGL is unavailable in this browser.');const game=new Game(canvas);game.start();}catch(e){error.hidden=false;error.textContent=`Unable to start trainer: ${e.message}`;document.querySelector('#round-state').textContent='Error';}
