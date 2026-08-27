'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

// Cada skin define su propia paleta (índice 1-8, igual que PIECES) y su
// propia función de dibujo de bloque. Cambiar de skin sólo cambia qué
// entrada de SKINS se usa; el resto del juego no lo sabe.
const SKINS = {
  retro: {
    label: 'Retro',
    colors: [null, '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784', '#e57373', '#90caf9', '#ffb74d', '#9e9e9e'],
    draw(context, x, y, colorIndex, size, alpha) {
      const color = this.colors[colorIndex];
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
      context.globalAlpha = 1;
    },
  },

  neon: {
    label: 'Neon',
    colors: [null, '#00e5ff', '#ffea00', '#d500f9', '#00e676', '#ff1744', '#2979ff', '#ff9100', '#e0e0e0'],
    draw(context, x, y, colorIndex, size, alpha) {
      const color = this.colors[colorIndex];
      context.save();
      context.globalAlpha = alpha;
      context.shadowColor = color;
      context.shadowBlur = size * 0.4;
      context.fillStyle = color;
      context.fillRect(x * size + 2, y * size + 2, size - 4, size - 4);
      context.shadowBlur = 0;
      context.strokeStyle = 'rgba(255,255,255,0.6)';
      context.lineWidth = 1;
      context.strokeRect(x * size + 2.5, y * size + 2.5, size - 5, size - 5);
      context.restore();
    },
  },

  pastel: {
    label: 'Pastel',
    colors: [null, '#a7e8ef', '#fff2b2', '#dcb8ea', '#bfe6c4', '#f7b9b9', '#bcd8f7', '#ffd7a8', '#d8d8de'],
    draw(context, x, y, colorIndex, size, alpha) {
      const color = this.colors[colorIndex];
      const px = x * size + 2, py = y * size + 2, s = size - 4;
      const r = Math.min(6, s / 2);
      context.save();
      context.globalAlpha = alpha;
      roundedRectPath(context, px, py, s, s, r);
      context.fillStyle = color;
      context.fill();
      context.save();
      context.clip();
      context.fillStyle = 'rgba(255,255,255,0.4)';
      context.fillRect(px, py, s, s * 0.4);
      context.restore();
      context.restore();
    },
  },

  pixel: {
    label: 'Pixel Art',
    colors: [null, '#00d8d8', '#e8c400', '#b800e8', '#00b800', '#d80000', '#0058f8', '#f87800', '#787878'],
    draw(context, x, y, colorIndex, size, alpha) {
      const color = this.colors[colorIndex];
      const px = x * size, py = y * size, s = size - 2;
      context.save();
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.fillRect(px + 1, py + 1, s, s);
      const n = 4;
      const cell = s / n;
      const light = shadeColor(color, 20);
      const dark = shadeColor(color, -20);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if ((i + j) % 2 === 0) continue;
          context.fillStyle = (i === 0 || j === 0) ? light : dark;
          context.fillRect(px + 1 + j * cell, py + 1 + i * cell, cell, cell);
        }
      }
      context.strokeStyle = shadeColor(color, -45);
      context.lineWidth = 1;
      context.strokeRect(px + 1.5, py + 1.5, s - 1, s - 1);
      context.restore();
    },
  },
};

let currentSkin = 'retro';

function roundedRectPath(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function shadeColor(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(255 * (percent / 100));
  const clamp = v => Math.max(0, Math.min(255, v));
  const r = clamp((num >> 16) + amt);
  const g = clamp(((num >> 8) & 0xff) + amt);
  const b = clamp((num & 0xff) + amt);
  return `rgb(${r},${g},${b})`;
}

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

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;

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
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
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

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  SKINS[currentSkin].draw(context, x, y, colorIndex, size, alpha ?? 1);
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
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
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
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
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

const skinSelect = document.getElementById('skin-select');

function applySkin(name) {
  currentSkin = SKINS[name] ? name : 'retro';
  document.body.classList.remove(...Object.keys(SKINS).map(s => `skin-${s}`));
  document.body.classList.add(`skin-${currentSkin}`);
  skinSelect.value = currentSkin;
}

applySkin(localStorage.getItem('tetris-skin') || 'retro');

skinSelect.addEventListener('change', () => {
  applySkin(skinSelect.value);
  localStorage.setItem('tetris-skin', currentSkin);
  draw();
  drawNext();
});

init();
