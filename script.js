// ---------- Difficulty Configs ----------
const MODES = {
easy: { GOAL: 15, DURATION: 35, SPAWN_MS: 950, LIFETIME_MS: 1100, BAD_CHANCE: 0.15 },
normal: { GOAL: 25, DURATION: 30, SPAWN_MS: 900, LIFETIME_MS: 950, BAD_CHANCE: 0.22 },
hard: { GOAL: 35, DURATION: 25, SPAWN_MS: 750, LIFETIME_MS: 820, BAD_CHANCE: 0.28 },
// Endless: no timer, rising difficulty; track max streak
endless:{ GOAL: Infinity, DURATION: Infinity, SPAWN_MS: 900, LIFETIME_MS: 900, BAD_CHANCE: 0.22 }
};


// Milestones per mode (score -> message)
const MESSAGES = [
{ at: 5, text: "Milestone: 5 cans! Keep going!" },
{ at: 10, text: "Halfway there!" },
{ at: 20, text: "You're on a roll!" },
{ at: 30, text: "Incredible! Nearly there!" }
];


// ---------- State ----------
let mode = 'normal';
let cfg = { ...MODES[mode] };
let current = 0;
let timeLeft = cfg.DURATION;
let gameActive = false;
let spawnInterval = null;
let timerInterval = null;
let cleanupTimeouts = [];
let muted = false;


// ---------- DOM ----------
const gridEl = document.querySelector('.game-grid');
const scoreEl = document.getElementById('current-cans');
const goalEl = document.getElementById('goal-cans');
const timerEl = document.getElementById('timer');
const milestoneEl = document.getElementById('milestone');
const progressBar = document.getElementById('progress-bar');
const startBtn = document.getElementById('start-game');
const resetBtn = document.getElementById('reset-game');
const difficultySel = document.getElementById('difficulty');
const muteBtn = document.getElementById('mute');
const confettiStage = document.getElementById('confetti');
const bestScoreEl = document.getElementById('best-score');
const bestLabelEl = document.getElementById('best-label');


// Sounds (optional)
const sCollect = document.getElementById('s-collect');
const sBad = document.getElementById('s-bad');
const sWin = document.getElementById('s-win');
const sTick = document.getElementById('s-tick');


// Init
init();


function init(){
goalEl.textContent = cfg.GOAL === Infinity ? '—' : String(cfg.GOAL);
timerEl.textContent = Number.isFinite(cfg.DURATION) ? cfg.DURATION : '—';
createGrid();
wireUI();
loadBest();
updateBestLabel();
}


function createGrid(){
gridEl.innerHTML = '';
for(let i=0;i<9;i++){
const cell = document.createElement('div');
cell.className = 'grid-cell';
gridEl.appendChild(cell);
}
}


function safePlay(a){ try{ if(a && !muted){ a.currentTime = 0; a.play().catch(()=>{}); } }catch(_){} }