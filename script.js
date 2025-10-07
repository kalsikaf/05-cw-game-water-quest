// --- Config ---
const GOAL_CANS = 25;
const GAME_DURATION = 30;        // seconds
const SPAWN_MS = 900;            // how often a new item appears
const CAN_LIFETIME_MS = 950;     // how long an item stays on screen
const BAD_CAN_CHANCE = 0.22;     // ~22% chance to spawn a “bad can”

// --- State ---
let currentCans = 0;
let timeLeft = GAME_DURATION;
let gameActive = false;
let spawnInterval = null;
let timerInterval = null;
let cellCleanupTimeouts = []; // track timeouts so we can clear on end/reset

// --- DOM ---
const gridEl = document.querySelector('.game-grid');
const scoreEl = document.getElementById('current-cans');
const goalEl = document.getElementById('goal-cans');
const timerEl = document.getElementById('timer');
const achievementsEl = document.getElementById('achievements');
const progressBarEl = document.getElementById('progress-bar');
const startBtn = document.getElementById('start-game');
const resetBtn = document.getElementById('reset-game');
const confettiStage = document.getElementById('confetti');

// Init
goalEl.textContent = GOAL_CANS;
createGrid();
wireButtons();

// --- Grid ---
function createGrid(){
  gridEl.innerHTML = '';
  for (let i = 0; i < 9; i++){
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    gridEl.appendChild(cell);
  }
}

// --- Game Loop ---
function startGame(){
  if (gameActive) return;
  resetState();
  gameActive = true;
  startBtn.disabled = true;
  resetBtn.disabled = false;
  achievementsEl.textContent = 'Game on! Tap yellow cans, avoid brown ones.';

  spawnInterval = setInterval(spawnItem, SPAWN_MS);
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimer();
    if (timeLeft <= 0) endGame(false);
  }, 1000);
}

function endGame(won){
  if (!gameActive) return;
  gameActive = false;

  // Stop timers/spawns and clear pending timeouts
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  cellCleanupTimeouts.forEach(t => clearTimeout(t));
  cellCleanupTimeouts = [];

  // Clear any items left on grid
  document.querySelectorAll('.grid-cell').forEach(c => (c.innerHTML = ''));

  startBtn.disabled = false;

  if (won){
    achievementsEl.textContent = 'You did it! Clean water unlocked!';
    doConfetti();
  } else {
    achievementsEl.textContent = `Time! You collected ${currentCans}/${GOAL_CANS}. Try again!`;
  }
}

function resetGame(){
  // End if running, then reset UI
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  cellCleanupTimeouts.forEach(t => clearTimeout(t));
  cellCleanupTimeouts = [];
  gameActive = false;
  startBtn.disabled = false;
  resetBtn.disabled = true;

  // UI state
  currentCans = 0;
  timeLeft = GAME_DURATION;
  updateScore();
  updateTimer();
  achievementsEl.textContent = '';
  progressBarEl.style.width = '0%';
  document.querySelectorAll('.grid-cell').forEach(c => (c.innerHTML = ''));
}

function resetState(){
  currentCans = 0;
  timeLeft = GAME_DURATION;
  updateScore();
  updateTimer();
  progressBarEl.style.width = '0%';
  document.querySelectorAll('.grid-cell').forEach(c => (c.innerHTML = ''));
}

function wireButtons(){
  startBtn.addEventListener('click', startGame);
  resetBtn.addEventListener('click', resetGame);
}

// --- Spawning & Interaction ---
function spawnItem(){
  if (!gameActive) return;

  const cells = document.querySelectorAll('.grid-cell');

  // Clear all cells (whack-a-mole style single target)
  cells.forEach(cell => (cell.innerHTML = ''));

  const targetCell = cells[Math.floor(Math.random() * cells.length)];
  const isBad = Math.random() < BAD_CAN_CHANCE;

  const wrapper = document.createElement('div');
  wrapper.className = isBad ? 'bad-can-wrapper' : 'water-can-wrapper';

  const el = document.createElement('div');
  el.className = isBad ? 'bad-can' : 'water-can';

  // Click handler
  el.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (!gameActive) return;

    // Prevent double clicks
    el.style.pointerEvents = 'none';

    if (isBad){
      currentCans = Math.max(0, currentCans - 1);
      flashCell(targetCell, false);
      toast('Uh oh—dirty water! -1', 'bad');
    } else {
      currentCans += 1;
      flashCell(targetCell, true);
      checkMilestones(currentCans);
    }

    updateScore();

    // Remove the element right after click
    targetCell.innerHTML = '';

    if (currentCans >= GOAL_CANS){
      endGame(true);
    }
  }, { once: true });

  wrapper.appendChild(el);
  targetCell.appendChild(wrapper);

  // Auto-remove after lifetime if not clicked
  const to = setTimeout(() => {
    if (targetCell.contains(wrapper)){
      targetCell.innerHTML = '';
    }
  }, CAN_LIFETIME_MS);
  cellCleanupTimeouts.push(to);
}

// --- UI helpers ---
function updateScore(){
  scoreEl.textContent = String(currentCans);
  const pct = Math.min(100, (currentCans / GOAL_CANS) * 100);
  progressBarEl.style.width = `${pct}%`;
}

function updateTimer(){
  timerEl.textContent = String(Math.max(0, timeLeft));
}

function flashCell(cell, good){
  cell.classList.remove('flash-good', 'flash-bad'); // reset
  void cell.offsetWidth; // reflow to restart animation
  cell.classList.add(good ? 'flash-good' : 'flash-bad');
  setTimeout(() => cell.classList.remove('flash-good', 'flash-bad'), 250);
}

function toast(message, type='good'){
  achievementsEl.style.color = (type === 'bad') ? '#F5402C' : '#159A48';
  achievementsEl.textContent = message;
}

function checkMilestones(val){
  if (val === 5) toast('Milestone: 5 cans! Keep going!');
  if (val === 15) toast('Milestone: 15 cans! You’re close!');
  if (val === 20) toast('Bonus time? No—just hustle!'); // fun flavor text
}

// --- Confetti ---
function doConfetti(){
  // Make ~80 pieces from random positions at top
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
  // Clean up
  setTimeout(() => confettiStage.innerHTML = '', 1600);
}