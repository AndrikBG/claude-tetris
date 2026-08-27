'use strict';

// Tabla de records local (Top 5) + pantalla de inicio.
// Este script se carga ANTES que game.js: no puede usar `init()`,
// `current`, etc. hasta que el usuario pulse "JUGAR" (para ese momento
// game.js ya se ha ejecutado y esas funciones son globales).

const SCORES_KEY = 'tetris-scores';
const MAX_SCORES = 5;

const startScreen = document.getElementById('start-screen');
const playBtn = document.getElementById('play-btn');
const resetScoresBtn = document.getElementById('reset-scores-btn');
const startScoresTable = document.getElementById('start-scores-table');

const overlayStats = document.getElementById('overlay-stats');
const gameoverScoresTable = document.getElementById('gameover-scores-table');
const newRecordForm = document.getElementById('new-record-form');
const playerNameInput = document.getElementById('player-name-input');
const saveScoreBtn = document.getElementById('save-score-btn');

let pendingStats = null;

function loadScores() {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function persistScores(list) {
  localStorage.setItem(SCORES_KEY, JSON.stringify(list));
}

function isTopScore(score) {
  const list = loadScores();
  if (list.length < MAX_SCORES) return true;
  return score > Math.min(...list.map(s => s.score));
}

function addScoreRecord(entry) {
  const list = loadScores();
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  persistScores(list.slice(0, MAX_SCORES));
}

function renderScoresTable(tableEl, list, highlightId) {
  if (!list.length) {
    tableEl.innerHTML = '<tr><td class="no-scores" colspan="6">SIN RECORDS TODAVÍA</td></tr>';
    return;
  }
  const rows = list.map((entry, i) => {
    const highlight = entry.id && entry.id === highlightId ? ' class="score-row-highlight"' : '';
    return `<tr${highlight}>` +
      `<td>${i + 1}</td>` +
      `<td class="score-name">${escapeHtml(entry.name || 'JUGADOR')}</td>` +
      `<td>${entry.score.toLocaleString()}</td>` +
      `<td>${entry.lines}</td>` +
      `<td>${entry.level}</td>` +
      `<td>${entry.combo || 0}</td>` +
      `</tr>`;
  }).join('');
  tableEl.innerHTML =
    '<tr><th>#</th><th>NOMBRE</th><th>PUNTOS</th><th>LÍNEAS</th><th>NIVEL</th><th>COMBO</th></tr>' + rows;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function renderAllTables(highlightId) {
  const list = loadScores();
  renderScoresTable(startScoresTable, list, highlightId);
  renderScoresTable(gameoverScoresTable, list, highlightId);
}

function resetScores() {
  if (!confirm('¿Seguro que quieres borrar todos los records?')) return;
  localStorage.removeItem(SCORES_KEY);
  renderAllTables();
}

function showNewRecordForm() {
  newRecordForm.classList.remove('hidden');
  playerNameInput.value = '';
  playerNameInput.focus();
}

function hideNewRecordForm() {
  newRecordForm.classList.add('hidden');
}

function saveNewRecord() {
  if (!pendingStats) return;
  const name = playerNameInput.value.trim().slice(0, 12) || 'JUGADOR';
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    score: pendingStats.score,
    lines: pendingStats.lines,
    level: pendingStats.level,
    combo: pendingStats.combo,
    maxLines: pendingStats.maxLines,
    date: new Date().toISOString(),
  };
  addScoreRecord(entry);
  hideNewRecordForm();
  pendingStats = null;
  renderAllTables(entry.id);
}

// Llamado por game.js (endGame) al terminar la partida.
function handleGameOver(stats) {
  pendingStats = stats;
  overlayStats.textContent =
    `Combo máximo: ${stats.combo} · Líneas máx. de una vez: ${stats.maxLines}`;
  if (isTopScore(stats.score)) {
    showNewRecordForm();
    renderAllTables();
  } else {
    hideNewRecordForm();
    renderAllTables();
  }
}

playBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  init(); // definida en game.js, ya cargado en el momento del clic
});

resetScoresBtn.addEventListener('click', resetScores);

saveScoreBtn.addEventListener('click', saveNewRecord);
playerNameInput.addEventListener('keydown', e => {
  if (e.code === 'Enter') saveNewRecord();
});

renderAllTables();
