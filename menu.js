'use strict';

// ---- Menú de pausa (Unidad 1) ----
// Toda la lógica de la UI del menú de pausa: reanudar, reiniciar,
// ver controles y elegir el nivel inicial (persistido en localStorage).
//
// Contrato de carga (ver index.html): este script se carga ANTES que
// game.js, y ambos se ejecutan al final del <body> (el DOM ya está
// disponible, no hace falta esperar a DOMContentLoaded). Por eso:
//   - game.js puede llamar a `window.TetrisMenu.*` sin comprobar que
//     exista: este script ya se ejecutó y lo definió.
//   - este script puede llamar a `togglePause()` / `init()` (funciones
//     de nivel superior de game.js) sin comprobar que existan: sus
//     manejadores de clic solo se disparan tras la interacción del
//     usuario, muy después de que game.js haya terminado de ejecutarse.
// window.TetrisMenu es el único punto de contacto entre ambos scripts.

const START_LEVEL_KEY = 'tetris-start-level';
const MIN_START_LEVEL = 1;
const MAX_START_LEVEL = 15;

let controlsView = false;

function clampStartLevel(value) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return 1;
  return Math.min(MAX_START_LEVEL, Math.max(MIN_START_LEVEL, n));
}

function getStartLevel() {
  const raw = localStorage.getItem(START_LEVEL_KEY);
  return raw === null ? 1 : clampStartLevel(raw);
}

function setStartLevel(value) {
  const clamped = clampStartLevel(value);
  localStorage.setItem(START_LEVEL_KEY, String(clamped));
  return clamped;
}

const pmOverlay = document.getElementById('overlay');
const pmOverlayTitle = document.getElementById('overlay-title');
const pmOverlayScore = document.getElementById('overlay-score');
// Contenido exclusivo de GAME OVER (records, formulario de nuevo récord,
// reiniciar): se oculta como bloque mientras el menú de pausa está abierto,
// ya que ambos comparten el mismo #overlay.
const gameoverContent = document.getElementById('gameover-content');

const pauseMenu = document.getElementById('pause-menu');
const pauseMain = document.getElementById('pause-main');
const pauseControls = document.getElementById('pause-controls');
const resumeBtn = document.getElementById('pm-resume-btn');
const menuRestartBtn = document.getElementById('pm-restart-btn');
const controlsBtn = document.getElementById('pm-controls-btn');
const backBtn = document.getElementById('pm-back-btn');
const levelSelect = document.getElementById('pm-level-input');

// Rellena el selector de nivel inicial (1-15) en un solo mutation del DOM.
const levelOptions = document.createDocumentFragment();
for (let i = MIN_START_LEVEL; i <= MAX_START_LEVEL; i++) {
  const opt = document.createElement('option');
  opt.value = String(i);
  opt.textContent = String(i);
  levelOptions.appendChild(opt);
}
levelSelect.appendChild(levelOptions);
levelSelect.value = String(getStartLevel());

function showMainView() {
  controlsView = false;
  pauseControls.classList.add('hidden');
  pauseMain.classList.remove('hidden');
}

function showControlsView() {
  controlsView = true;
  pauseMain.classList.add('hidden');
  pauseControls.classList.remove('hidden');
}

function openPauseMenu() {
  showMainView();
  levelSelect.value = String(getStartLevel());
  pmOverlayTitle.textContent = 'PAUSA';
  pmOverlayScore.textContent = '';
  gameoverContent.classList.add('hidden');
  pauseMenu.classList.remove('hidden');
  pmOverlay.classList.remove('hidden');
}

function closePauseMenu() {
  pauseMenu.classList.add('hidden');
  gameoverContent.classList.remove('hidden');
  pmOverlay.classList.add('hidden');
}

// Nota: togglePause()/init() son declaraciones de función de nivel superior
// en game.js, cargado justo después de este script — por el contrato de
// carga documentado en index.html están disponibles como globals aquí
// (los manejadores de clic solo se disparan tras la interacción del
// usuario, mucho después de que game.js haya terminado de ejecutarse).
resumeBtn.addEventListener('click', () => togglePause());

menuRestartBtn.addEventListener('click', () => {
  closePauseMenu();
  init();
});

controlsBtn.addEventListener('click', showControlsView);
backBtn.addEventListener('click', showMainView);

levelSelect.addEventListener('change', () => {
  setStartLevel(levelSelect.value);
});

window.TetrisMenu = {
  openPauseMenu,
  closePauseMenu,
  isControlsView: () => controlsView,
  showMainView,
  getStartLevel,
  setStartLevel,
};
