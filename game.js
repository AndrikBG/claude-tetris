'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - pale blue
  '#ffb74d', // L - orange
  '#9e9e9e', // N - tuerca (gris metálico)
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // N (tuerca)
];

const LINE_SCORES = [0, 100, 300, 500, 800];
const MAX_HIGH_SCORES = 5;
const HIGH_SCORES_KEY = 'tetris-highscores';
const STATS_KEY = 'tetris-stats';

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const highscoresListEl = document.getElementById('highscores-list');
const bestComboEl = document.getElementById('best-combo');
const bestLinesEl = document.getElementById('best-lines');
const resetScoresBtn = document.getElementById('reset-scores-btn');
const nameEntry = document.getElementById('name-entry');
const nameInput = document.getElementById('name-input');
const saveScoreBtn = document.getElementById('save-score-btn');

const pauseOverlay = document.getElementById('pause-overlay');
const pauseMainView = document.getElementById('pause-main');
const pauseControlsView = document.getElementById('pause-controls');
const resumeBtn = document.getElementById('resume-btn');
const restartPauseBtn = document.getElementById('restart-pause-btn');
const controlsBtn = document.getElementById('controls-btn');
const backBtn = document.getElementById('back-btn');
const startLevelSelect = document.getElementById('start-level-select');

const MAX_START_LEVEL = 15;

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, startLevel;
let combo, comboBest, pendingEntry;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    combo++;
    if (combo > comboBest) comboBest = combo;
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  } else {
    combo = 0;
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function loadHighScores() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HIGH_SCORES_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHighScores(list) {
  localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(list));
}

function loadStats() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STATS_KEY));
    return {
      bestCombo: (parsed && parsed.bestCombo) || 0,
      maxLines: (parsed && parsed.maxLines) || 0,
    };
  } catch {
    return { bestCombo: 0, maxLines: 0 };
  }
}

function saveStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function qualifiesForTop(list, points) {
  if (list.length < MAX_HIGH_SCORES) return true;
  return points > list[list.length - 1].score;
}

function addHighScore(name, points, clearedLines, comboReached) {
  const list = loadHighScores();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  list.push({ id, name, score: points, lines: clearedLines, combo: comboReached });
  list.sort((a, b) => b.score - a.score);
  list.length = Math.min(list.length, MAX_HIGH_SCORES);
  saveHighScores(list);
  return id;
}

function renderHighScores(highlightId) {
  const list = loadHighScores();
  highscoresListEl.innerHTML = '';
  if (!list.length) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = 'Sin records aún';
    highscoresListEl.appendChild(empty);
    return;
  }
  list.forEach((entry, i) => {
    const li = document.createElement('li');
    if (entry.id === highlightId) li.classList.add('highlight');
    const rank = document.createElement('span');
    rank.className = 'rank';
    rank.textContent = `${i + 1}.`;
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = entry.name;
    const points = document.createElement('span');
    points.className = 'score';
    points.textContent = entry.score.toLocaleString();
    li.append(rank, name, points);
    highscoresListEl.appendChild(li);
  });
}

function renderStats() {
  const stats = loadStats();
  bestComboEl.textContent = stats.bestCombo;
  bestLinesEl.textContent = stats.maxLines;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--grid-line').trim();
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()} · Líneas: ${lines} · Combo máx: ${comboBest}`;
  overlay.classList.remove('hidden');

  const stats = loadStats();
  let statsChanged = false;
  if (comboBest > stats.bestCombo) { stats.bestCombo = comboBest; statsChanged = true; }
  if (lines > stats.maxLines) { stats.maxLines = lines; statsChanged = true; }
  if (statsChanged) saveStats(stats);
  renderStats();

  if (qualifiesForTop(loadHighScores(), score)) {
    pendingEntry = { score, lines, combo: comboBest };
    nameEntry.classList.remove('hidden');
    nameInput.value = '';
    nameInput.focus();
  } else {
    pendingEntry = null;
    nameEntry.classList.add('hidden');
  }
  renderHighScores();
}

function submitScore() {
  if (!pendingEntry) return;
  const name = (nameInput.value.trim() || 'Jugador').slice(0, 12);
  const id = addHighScore(name, pendingEntry.score, pendingEntry.lines, pendingEntry.combo);
  pendingEntry = null;
  nameEntry.classList.add('hidden');
  renderHighScores(id);
}

function showPauseMainView() {
  pauseMainView.classList.remove('hidden');
  pauseControlsView.classList.add('hidden');
  resumeBtn.focus();
}

function showPauseControlsView() {
  pauseMainView.classList.add('hidden');
  pauseControlsView.classList.remove('hidden');
  backBtn.focus();
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    pauseOverlay.classList.add('hidden');
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    startLevelSelect.value = String(startLevel);
    pauseOverlay.classList.remove('hidden');
    showPauseMainView();
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  if (gameOver) return;
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = startLevel;
  combo = 0;
  comboBest = 0;
  pendingEntry = null;
  paused = false;
  gameOver = false;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  nameEntry.classList.add('hidden');
  pauseOverlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

saveScoreBtn.addEventListener('click', submitScore);
nameInput.addEventListener('keydown', e => {
  if (e.code === 'Enter') submitScore();
});

resetScoresBtn.addEventListener('click', () => {
  if (!confirm('¿Resetear todos los records?')) return;
  saveHighScores([]);
  saveStats({ bestCombo: 0, maxLines: 0 });
  renderHighScores();
  renderStats();
});

for (let lvl = 1; lvl <= MAX_START_LEVEL; lvl++) {
  const option = document.createElement('option');
  option.value = String(lvl);
  option.textContent = lvl;
  startLevelSelect.appendChild(option);
}

const savedStartLevel = parseInt(localStorage.getItem('tetris-start-level'), 10);
startLevel = savedStartLevel >= 1 && savedStartLevel <= MAX_START_LEVEL ? savedStartLevel : 1;
startLevelSelect.value = String(startLevel);

resumeBtn.addEventListener('click', togglePause);
restartPauseBtn.addEventListener('click', () => {
  paused = false;
  pauseOverlay.classList.add('hidden');
  init();
});
controlsBtn.addEventListener('click', showPauseControlsView);
backBtn.addEventListener('click', showPauseMainView);
startLevelSelect.addEventListener('change', () => {
  startLevel = parseInt(startLevelSelect.value, 10);
  localStorage.setItem('tetris-start-level', String(startLevel));
});

const themeToggle = document.getElementById('theme-toggle');
const toggleIcon = themeToggle.querySelector('.toggle-icon');
const toggleLabel = themeToggle.querySelector('.toggle-label');

function applyTheme(isLight) {
  if (isLight) {
    document.body.classList.add('light-mode');
    toggleIcon.textContent = '☀';
    toggleLabel.textContent = 'DARK';
  } else {
    document.body.classList.remove('light-mode');
    toggleIcon.textContent = '☾';
    toggleLabel.textContent = 'LIGHT';
  }
}

const savedTheme = localStorage.getItem('tetris-theme');
applyTheme(savedTheme === 'light');

themeToggle.addEventListener('click', () => {
  const isLight = !document.body.classList.contains('light-mode');
  applyTheme(isLight);
  localStorage.setItem('tetris-theme', isLight ? 'light' : 'dark');
});

renderHighScores();
renderStats();
init();
