/**************************
 * Water Quest (finalized)
 * - Difficulty modes
 * - DOM add/remove on interactions
 * - Milestones with messages
 * - Sound effects hooks (add audio files in /audio)
 * - Footer with official links
 **************************/

/** Modes configure the game’s rules/pace */
const MODES = {
  easy:   { GOAL: 15, DURATION: 35, SPAWN_MS: 1000, CAN_LIFETIME_MS: 1100, BAD_CHANCE: 0.15 },
  normal: { GOAL: 25, DURATION: 30, SPAWN_MS: 900,  CAN_LIFETIME_MS: 950,  BAD_CHANCE: 0.22 },
  hard:   { GOAL: 35, DURATION: 26, SPAWN_MS: 750,  CAN_LIFETIME_MS: 850,  BAD_CHANCE: 0.30 }
};

/** Milestone thresholds & messages (score-based) */
const MILESTONES = [
  { at: 5,  text: "Great start—5 cans!" },
  { at: 10, text: "Halfway there—keep going!" },
  { at: 20, text: "You’re crushing it—20 cans!" },
];

/** State */
let state = {
  modeKey: "normal",
  goal: MODES.normal.GOAL,
  timeLeft: MODES.normal.DURATION,
  spawnMs: MODES.normal.SPAWN_MS,
  lifetimeMs: MODES.normal.CAN_LIFETIME_MS,
  badChance: MODES.normal.BAD_CHANCE,

  currentCans: 0,
  active: false,
  spawnInterval: null,
  timerInterval: null,
  cleanupTimeouts: []
};

/** DOM */
const gridEl = document.querySelector('.game-grid');
const scoreEl = document.getElementById('current-cans');
const goalEl = document.getElementById('goal-cans');
const timerEl = document.getElementById('timer');
const milestoneEl = document.getElementById('milestone');
const progressBarEl = document.getElementById('progress-bar');
const startBtn = document.getElementById('start-game');
const resetBtn = document.getElementById('reset-game');
const modeSel = document.getElementById('mode');
const confettiStage = document.getElementById('confetti');
const howtoBtn = document.getElementById('howto');
const howtoContent = document.getElementById('howto-content');

/** Audio */
const sfxGood = document.getElementById('sfx-good');
const sfxBad  = document.getElementById('sfx-bad');
const sfxWin  = document.getElementById('sfx-win');

/** Init */
setupGrid();
applyMode("normal");
wireControls();

function setupGrid(){
  gridEl.innerHTML = '';
  for (let i = 0; i < 9; i++){
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    gridEl.appendChild(cell);
  }
}

function applyMode(key){
  state.modeKey = key;
  const cfg = MODES[key];
  state.goal = cfg.GOAL;
  state.timeLeft = cfg.DURATION;
  state.spawnMs = cfg.SPAWN_MS;
  state.lifetimeMs = cfg.CAN_LIFETIME_MS;
  state.badChance = cfg.BAD_CHANCE;

  goalEl.textContent = String(state.goal);
  timerEl.textContent = String(state.timeLeft);
  updateScore(0); // resets progress bar to 0%
}

function wireControls(){
  startBtn.addEventListener('click', startGame);
  resetBtn.addEventListener('click', resetGame);

  modeSel.addEventListener('change', (e) => {
    const switchingWhileActive = state.active;
    if (switchingWhileActive) endGame(false); // gracefully stop current run
    applyMode(e.target.value);
    milestoneEl.textContent = `Mode: ${e.target.value[0].toUpperCase()}${e.target.value.slice(1)}`;
  });

  howtoBtn.addEventListener('click', () => {
    const isHidden = howtoContent.hasAttribute('hidden');
    howtoContent.toggleAttribute('hidden');
    howtoBtn.setAttribute('aria-expanded', String(isHidden));
  });
}

/** Game loop */
function startGame(){
  if (state.active) return;
  resetRunState();
  state.active = true;
  startBtn.disabled = true;
  resetBtn.disabled = false;
  milestoneEl.style.color = '#159A48';
  milestoneEl.textContent = 'Game on! Tap yellow cans, avoid brown ones.';

  state.spawnInterval = setInterval(spawnItem, state.spawnMs);
  state.timerInterval = setInterval(() => {
    state.timeLeft--;
    updateTimer();
    if (state.timeLeft <= 0) endGame(false);
  }, 1000);
}

function endGame(won){
  if (!state.active) return;
  state.active = false;

  clearInterval(state.spawnInterval);
  clearInterval(state.timerInterval);
  state.cleanupTimeouts.forEach(t => clearTimeout(t));
  state.cleanupTimeouts = [];

  document.querySelectorAll('.grid-cell').forEach(c => (c.innerHTML = ''));

  startBtn.disabled = false;

  if (won){
    milestoneEl.style.color = '#159A48';
    milestoneEl.textContent = 'You did it! Clean water unlocked!';
    try { sfxWin && sfxWin.play(); } catch(_) {}
    confetti();
  } else {
    milestoneEl.style.color = '#F5402C';
    milestoneEl.textContent = `Time! You collected ${state.currentCans}/${state.goal}. Try again!`;
  }
}

function resetGame(){
  clearInterval(state.spawnInterval);
  clearInterval(state.timerInterval);
  state.cleanupTimeouts.forEach(t => clearTimeout(t));
  state.cleanupTimeouts = [];
  state.active = false;
  startBtn.disabled = false;
  resetBtn.disabled = true;

  applyMode(state.modeKey); // keep current mode but reset its values
  milestoneEl.textContent = '';
  progressBarEl.style.width = '0%';
  document.querySelectorAll('.grid-cell').forEach(c => (c.innerHTML = ''));
}

function resetRunState(){
  state.currentCans = 0;
  state.timeLeft = MODES[state.modeKey].DURATION;
  updateScore(0);
  updateTimer();
  progressBarEl.style.width = '0%';
  document.querySelectorAll('.grid-cell').forEach(c => (c.innerHTML = ''));
}

/** Spawning & interaction */
function spawnItem(){
  if (!state.active) return;

  const cells = document.querySelectorAll('.grid-cell');
  // single target at a time (whack-a-mole style)
  cells.forEach(cell => (cell.innerHTML = ''));

  const target = cells[Math.floor(Math.random() * cells.length)];
  const isBad = Math.random() < state.badChance;

  const wrapper = document.createElement('div');
  wrapper.className = isBad ? 'bad-can-wrapper' : 'water-can-wrapper';

  const el = document.createElement('div');
  el.className = isBad ? 'bad-can' : 'water-can';

  el.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (!state.active) return;
    el.style.pointerEvents = 'none'; // prevent double taps

    if (isBad){
      state.currentCans = Math.max(0, state.currentCans - 1);
      flashCell(target, false);
      toast('Uh oh—dirty water! -1', 'bad');
      try { sfxBad && sfxBad.play(); } catch(_) {}
    } else {
      state.currentCans += 1;
      flashCell(target, true);
      checkMilestones(state.currentCans);
      try { sfxGood && sfxGood.play(); } catch(_) {}
    }

    updateScore(state.currentCans);
    target.innerHTML = '';

    if (state.currentCans >= state.goal){
      endGame(true);
    }
  }, { once: true });

  wrapper.appendChild(el);
  target.appendChild(wrapper);

  // Auto-remove if not clicked
  const to = setTimeout(() => {
    if (target.contains(wrapper)){
      target.innerHTML = '';
    }
  }, state.lifetimeMs);
  state.cleanupTimeouts.push(to);
}

/** UI helpers */
function updateScore(val){
  scoreEl.textContent = String(val);
  const pct = Math.min(100, (val / state.goal) * 100);
  progressBarEl.style.width = `${pct}%`;
  progressBarEl.setAttribute('aria-valuenow', String(Math.round(pct)));
}
function updateTimer(){ timerEl.textContent = String(Math.max(0, state.timeLeft)); }

function flashCell(cell, good){
  cell.classList.remove('flash-good', 'flash-bad');
  void cell.offsetWidth; // reflow to restart animation
  cell.classList.add(good ? 'flash-good' : 'flash-bad');
  setTimeout(() => cell.classList.remove('flash-good', 'flash-bad'), 250);
}

function toast(message, type='good'){
  milestoneEl.style.color = (type === 'bad') ? '#F5402C' : '#159A48';
  milestoneEl.textContent = message;
}

function checkMilestones(val){
  // Find the highest milestone just reached
  const hit = MILESTONES.find(m => m.at === val);
  if (hit){
    toast(hit.text, 'good');
  } else if (val === Math.ceil(state.goal/2)){
    toast("Halfway to your goal!", 'good');
  }
}

/** Confetti */
function confetti(){
  const colors = ['#FFC907', '#2E9DF7', '#8BD1CB', '#4FCB53', '#FF902A', '#F5402C', '#159A48', '#F16061'];
  for (let i = 0; i < 80; i++){
    const piece = document.createElement('div');
    piece.className = 'confetti';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.top = '-10vh';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.transform = `translateY(0) rotate(${Math.random()*360}deg)`;
    piece.style.animationDelay = (Math.random()*0.25) + 's';
    confettiStage.appendChild(piece);
  }
  setTimeout(() => confettiStage.innerHTML = '', 1600);
}