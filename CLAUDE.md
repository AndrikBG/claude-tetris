# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A classic Tetris implementation in vanilla JavaScript with HTML5 Canvas — no dependencies, no build step, no package manager. The entire game lives in three files: `index.html`, `style.css`, `game.js`.

## Running the game

There is no build/test/lint tooling. Just open or serve the static files:

```bash
xdg-open index.html    # open directly
# or serve locally (needed if testing anything that requires an HTTP origin)
python3 -m http.server 8000
npx serve .
```

## Architecture

All game logic lives in `game.js` as a single flat script with module-level `let` state (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropAccum`, `dropInterval`, `animId`) — there are no classes, modules, or build-time imports. Key pieces:

- **Board model**: `board` is a `ROWS × COLS` matrix; each cell is `0` (empty) or a piece-color index `1–7`.
- **Pieces**: `PIECES` defines the 7 tetrominoes as square matrices. `rotateCW` rotates by transpose + row-reverse. `tryRotate` applies wall-kick offsets `[0, -1, 1, -2, 2]` and takes the first that doesn't collide.
- **Collision**: `collide(shape, ox, oy)` is the single source of truth for both movement and rotation legality checks.
- **Game loop**: `loop(ts)`, driven by `requestAnimationFrame`, accumulates elapsed time into `dropAccum` and drops the piece one row once it exceeds `dropInterval`; otherwise it just redraws.
- **Locking a piece**: `lockPiece()` → `merge()` (bakes the piece into `board`) → `clearLines()` → `spawn()` (promotes `next` to `current`, generates a new `next`; if the new piece immediately collides, calls `endGame()`).
- **Scoring/leveling**: `LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by `level`; level increases every 10 lines, which recomputes `dropInterval = max(100, 1000 - (level-1)*90)`.
- **Rendering**: `draw()` clears and redraws the grid, locked board, ghost piece (`ghostY()` projects the drop position, drawn at `globalAlpha 0.2`), and the current piece, all via `drawBlock`. `drawNext()` renders the preview piece to a separate `next-canvas`.
- **Input**: a single `keydown` listener switches on `e.code` for movement/rotation/soft-drop/hard-drop; `KeyP` toggles pause independent of the game-over/paused guard at the top of the handler.

If you change `COLS`, `ROWS`, or `BLOCK` in `game.js`, also update the `<canvas id="board">` `width`/`height` in `index.html` to match (`COLS × BLOCK`, `ROWS × BLOCK`).
