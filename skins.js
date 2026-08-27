'use strict';

// Temas visuales (skins) para el tablero de Tetris.
// Este archivo se carga ANTES que game.js y expone `getActiveSkin()` y
// `setSkin()` de forma global (script clásico, sin módulos) para que
// game.js pueda delegar su dibujo sin conocer los detalles de cada tema.

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  // Compatibilidad: construir el path a mano con arcTo.
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

const SKINS = {
  retro: {
    label: 'RETRO',
    colors: [
      null,
      '#4dd0e1', // I - cyan
      '#ffd54f', // O - yellow
      '#ba68c8', // T - purple
      '#81c784', // S - green
      '#e57373', // Z - red
      '#90caf9', // J - pale blue
      '#ffb74d', // L - orange
      '#9e9e9e', // N - tuerca (gris metálico)
    ],
    gridColor: null, // usa --grid-line de style.css
    gridGlow: 0,
    drawBlock(ctx, x, y, colorIndex, size, alpha) {
      if (!colorIndex) return;
      const color = this.colors[colorIndex];
      ctx.globalAlpha = alpha ?? 1;
      ctx.fillStyle = color;
      ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      // highlight
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
      ctx.globalAlpha = 1;
    },
  },

  neon: {
    label: 'NEON',
    colors: [
      null,
      '#00f0ff', // I
      '#faff00', // O
      '#ff00e5', // T
      '#00ff6a', // S
      '#ff1744', // Z
      '#2979ff', // J
      '#ff9100', // L
      '#c0c8d8', // N
    ],
    // El color base de la rejilla lo define --grid-line en style.css
    // (body.skin-neon); aquí solo añadimos el resplandor.
    gridColor: null,
    gridGlow: 4,
    drawBlock(ctx, x, y, colorIndex, size, alpha) {
      if (!colorIndex) return;
      const color = this.colors[colorIndex];
      ctx.globalAlpha = alpha ?? 1;
      ctx.fillStyle = color;
      ctx.shadowBlur = 14;
      ctx.shadowColor = color;
      ctx.fillRect(x * size + 2, y * size + 2, size - 4, size - 4);
      // Segunda pasada sin glow para un núcleo brillante definido.
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(x * size + 2, y * size + 2, size - 4, 3);
      ctx.globalAlpha = 1;
    },
  },

  pastel: {
    label: 'PASTEL',
    colors: [
      null,
      '#a8dadc', // I
      '#fff3b0', // O
      '#d9c2e9', // T
      '#c8e6c9', // S
      '#f8c9c9', // Z
      '#c3d9f0', // J
      '#ffdcb0', // L
      '#dcdce4', // N
    ],
    gridColor: null,
    gridGlow: 0,
    drawBlock(ctx, x, y, colorIndex, size, alpha) {
      if (!colorIndex) return;
      const color = this.colors[colorIndex];
      const px = x * size + 1;
      const py = y * size + 1;
      const s = size - 2;
      ctx.globalAlpha = alpha ?? 1;
      ctx.fillStyle = color;
      roundRectPath(ctx, px, py, s, s, size * 0.22);
      ctx.fill();
      // highlight suave
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      roundRectPath(ctx, px + 2, py + 2, s - 4, Math.max(3, s * 0.18), size * 0.16);
      ctx.fill();
      ctx.globalAlpha = 1;
    },
  },

  pixel: {
    label: 'PIXEL ART',
    colors: [
      null,
      '#00e5ff', // I
      '#ffe600', // O
      '#c800e0', // T
      '#00c853', // S
      '#ff1744', // Z
      '#2979ff', // J
      '#ff6d00', // L
      '#78909c', // N
    ],
    gridColor: null,
    gridGlow: 0,
    // Patrón de brillo relativo por sub-celda (rejilla 3x3), simulando dither.
    SHADE_PATTERN: [
      0.18, -0.05, 0.08,
      -0.1, 0.22, -0.08,
      0.05, -0.12, 0.15,
    ],
    drawBlock(ctx, x, y, colorIndex, size, alpha) {
      if (!colorIndex) return;
      const color = this.colors[colorIndex];
      const px = x * size + 1;
      const py = y * size + 1;
      const s = size - 2;
      ctx.globalAlpha = alpha ?? 1;
      ctx.fillStyle = color;
      ctx.fillRect(px, py, s, s);

      // Textura tipo sprite: sub-cuadros 3x3 con variación de brillo.
      const sub = s / 3;
      let i = 0;
      for (let sr = 0; sr < 3; sr++) {
        for (let sc = 0; sc < 3; sc++) {
          const shade = this.SHADE_PATTERN[i++];
          ctx.fillStyle = shade >= 0
            ? `rgba(255,255,255,${shade})`
            : `rgba(0,0,0,${-shade})`;
          ctx.fillRect(
            px + sc * sub,
            py + sr * sub,
            Math.ceil(sub) + 0.5,
            Math.ceil(sub) + 0.5
          );
        }
      }

      // Contorno duro estilo sprite pixelado.
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
      ctx.globalAlpha = 1;
    },
  },
};

const DEFAULT_SKIN = 'retro';
const STORAGE_KEY = 'tetris-skin';
const SKIN_CLASSES = Object.keys(SKINS)
  .filter(name => name !== DEFAULT_SKIN)
  .map(name => `skin-${name}`);

let activeSkinName = DEFAULT_SKIN;

function getActiveSkin() {
  return SKINS[activeSkinName] || SKINS[DEFAULT_SKIN];
}

function applySkinClass(name) {
  document.body.classList.remove(...SKIN_CLASSES);
  if (name !== DEFAULT_SKIN) {
    document.body.classList.add(`skin-${name}`);
  }
}

function forceRedraw() {
  // game.js define draw()/drawNext() de forma global; si aún no se ha
  // cargado (p. ej. esta función se invoca antes de tiempo), no hacemos nada.
  if (typeof draw === 'function') draw();
  if (typeof drawNext === 'function') drawNext();
}

function setSkin(name) {
  if (!SKINS[name]) name = DEFAULT_SKIN;
  activeSkinName = name;
  applySkinClass(name);
  localStorage.setItem(STORAGE_KEY, name);
  const select = document.getElementById('skin-select');
  if (select && select.value !== name) select.value = name;
  forceRedraw();
}

// Precarga de la skin guardada, aplicada antes del primer draw().
(function initSkin() {
  const saved = localStorage.getItem(STORAGE_KEY);
  activeSkinName = SKINS[saved] ? saved : DEFAULT_SKIN;
  applySkinClass(activeSkinName);
})();

const skinSelect = document.getElementById('skin-select');
if (skinSelect) {
  skinSelect.value = activeSkinName;
  skinSelect.addEventListener('change', () => setSkin(skinSelect.value));
  // Evita que las flechas/espacio usadas para elegir una opción del <select>
  // burbujeen hasta el listener global de teclado de game.js y muevan/roten
  // o hagan caer la pieza en juego mientras el jugador usa el selector.
  skinSelect.addEventListener('keydown', e => e.stopPropagation());
}
