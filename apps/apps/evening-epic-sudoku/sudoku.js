(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const STORAGE_GAME = 'evening_sudoku_game_v2';
  const STORAGE_STATS = 'evening_sudoku_stats_v2';
  const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];
  const PEERS = buildPeers();

  const app = {
    mode: 'classic',
    difficulty: 'medium',
    game: null,
    grid: Array(81).fill(0),
    given: Array(81).fill(false),
    notes: Array.from({ length: 81 }, () => new Set()),
    active: 0,
    notesMode: false,
    conflictGuard: true,
    correctnessFeedback: false,
    highlight: true,
    elapsed: 0,
    startedAt: Date.now(),
    timer: null,
    undo: [],
    redo: [],
    assistance: { hintsUsed: 0, revealsUsed: 0, checksUsed: 0 },
    generationRequest: null,
    worker: null
  };

  function buildPeers() {
    return Array.from({ length: 81 }, (_, index) => {
      const row = Math.floor(index / 9);
      const column = index % 9;
      const boxRow = Math.floor(row / 3) * 3;
      const boxColumn = Math.floor(column / 3) * 3;
      const peers = new Set();
      for (let i = 0; i < 9; i += 1) {
        peers.add(row * 9 + i);
        peers.add(i * 9 + column);
      }
      for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 3; c += 1) peers.add((boxRow + r) * 9 + boxColumn + c);
      }
      peers.delete(index);
      return [...peers];
    });
  }

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function safeParse(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed == null ? fallback : parsed;
    } catch {
      return fallback;
    }
  }

  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.hidden = true; }, 1800);
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function defaultStats() {
    return {
      schemaVersion: 2,
      cleanSolves: 0,
      assistedSolves: 0,
      streak: 0,
      lastDailySolve: null,
      completedIds: [],
      bestClean: { easy: null, medium: null, hard: null, expert: null }
    };
  }

  function loadStats() {
    const value = safeParse(localStorage.getItem(STORAGE_STATS), defaultStats());
    if (value.schemaVersion !== 2) return defaultStats();
    return { ...defaultStats(), ...value, bestClean: { ...defaultStats().bestClean, ...(value.bestClean || {}) } };
  }

  function saveStats(stats) {
    localStorage.setItem(STORAGE_STATS, JSON.stringify(stats));
  }

  function validArray(values, length = 81) {
    return Array.isArray(values) && values.length === length && values.every((value) => Number.isInteger(value) && value >= 0 && value <= 9);
  }

  function saveGame() {
    if (!app.game) return;
    const payload = {
      schemaVersion: 2,
      game: app.game,
      state: {
        grid: app.grid,
        given: app.given,
        notes: app.notes.map((set) => [...set]),
        active: app.active,
        notesMode: app.notesMode,
        conflictGuard: app.conflictGuard,
        correctnessFeedback: app.correctnessFeedback,
        highlight: app.highlight,
        elapsed: app.elapsed,
        assistance: app.assistance
      },
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_GAME, JSON.stringify(payload));
  }

  function clearSavedGame() {
    localStorage.removeItem(STORAGE_GAME);
  }

  function loadSavedGame() {
    const payload = safeParse(localStorage.getItem(STORAGE_GAME), null);
    if (!payload || payload.schemaVersion !== 2 || !payload.game || !payload.state) return false;
    const game = payload.game;
    const savedState = payload.state;
    if (!validArray(game.puzzle) || !validArray(game.solution) || !validArray(savedState.grid)) return false;
    if (!Array.isArray(savedState.given) || savedState.given.length !== 81) return false;
    if (!Array.isArray(savedState.notes) || savedState.notes.length !== 81) return false;
    if (!DIFFICULTIES.includes(game.difficulty)) return false;
    if (game.mode === 'daily' && game.dateKey !== localDateKey()) return false;

    app.mode = game.mode === 'daily' ? 'daily' : 'classic';
    app.difficulty = game.difficulty;
    app.game = game;
    app.grid = savedState.grid.slice();
    app.given = savedState.given.map(Boolean);
    app.notes = savedState.notes.map((values) => new Set(Array.isArray(values) ? values.filter((value) => value >= 1 && value <= 9) : []));
    app.active = Number.isInteger(savedState.active) && savedState.active >= 0 && savedState.active < 81 ? savedState.active : 0;
    app.notesMode = Boolean(savedState.notesMode);
    app.conflictGuard = savedState.conflictGuard !== false;
    app.correctnessFeedback = Boolean(savedState.correctnessFeedback);
    app.highlight = savedState.highlight !== false;
    app.elapsed = Number.isFinite(savedState.elapsed) ? Math.max(0, Math.floor(savedState.elapsed)) : 0;
    app.assistance = {
      hintsUsed: Number(savedState.assistance?.hintsUsed) || 0,
      revealsUsed: Number(savedState.assistance?.revealsUsed) || 0,
      checksUsed: Number(savedState.assistance?.checksUsed) || 0
    };
    app.startedAt = Date.now() - app.elapsed * 1000;
    return true;
  }

  function createWorker() {
    if (!('Worker' in window)) throw new Error('This browser does not support background puzzle generation.');
    app.worker = new Worker('./sudoku-worker.js');
    app.worker.addEventListener('message', (event) => {
      const message = event.data || {};
      if (!app.generationRequest || message.requestId !== app.generationRequest.requestId) return;
      if (message.type === 'ERROR') {
        finishGeneration();
        showError(message.message || 'Puzzle generation failed.');
        return;
      }
      if (message.type === 'GENERATED') {
        const request = app.generationRequest;
        app.mode = request.mode;
        app.difficulty = request.difficulty;
        app.game = {
          id: request.seed,
          seed: request.seed,
          dateKey: request.dateKey,
          mode: request.mode,
          difficulty: request.difficulty,
          puzzle: message.puzzle,
          solution: message.solution,
          rating: message.rating,
          generationMs: message.generationMs,
          createdAt: new Date().toISOString()
        };
        app.grid = message.puzzle.slice();
        app.given = message.puzzle.map((value) => value !== 0);
        app.notes = Array.from({ length: 81 }, () => new Set());
        app.active = Math.max(0, app.grid.findIndex((value) => value === 0));
        app.elapsed = 0;
        app.startedAt = Date.now();
        app.undo = [];
        app.redo = [];
        app.assistance = { hintsUsed: 0, revealsUsed: 0, checksUsed: 0 };
        finishGeneration();
        startTimer();
        saveGame();
        render();
        toast(`Puzzle ready in ${message.generationMs} ms.`);
      }
    });
    app.worker.addEventListener('error', (event) => {
      finishGeneration();
      showError(event.message || 'Sudoku worker failed.');
    });
  }

  function randomToken() {
    if (crypto?.getRandomValues) {
      const values = new Uint32Array(2);
      crypto.getRandomValues(values);
      return `${values[0]}-${values[1]}`;
    }
    return `${Date.now()}-${Math.random()}`;
  }

  function generatePuzzle(mode = app.mode, difficulty = app.difficulty) {
    if (!app.worker) createWorker();
    const dateKey = mode === 'daily' ? localDateKey() : null;
    const seed = mode === 'daily'
      ? `daily:${dateKey}:${difficulty}`
      : `classic:${Date.now()}:${randomToken()}:${difficulty}`;
    const requestId = `${Date.now()}-${randomToken()}`;
    app.generationRequest = { requestId, mode, difficulty, seed, dateKey };
    $('generationStatus').hidden = false;
    $('generationStatus').textContent = 'Generating a unique puzzle in the background…';
    document.querySelectorAll('[data-new-game]').forEach((button) => { button.disabled = true; });
    app.worker.postMessage({ type: 'GENERATE', requestId, seed, difficulty });
  }

  function finishGeneration() {
    app.generationRequest = null;
    $('generationStatus').hidden = true;
    document.querySelectorAll('[data-new-game]').forEach((button) => { button.disabled = false; });
  }

  function showError(message) {
    $('appError').hidden = false;
    $('appError').textContent = `Epic Sudoku could not continue: ${message}`;
  }

  function snapshot() {
    return {
      grid: app.grid.slice(),
      notes: app.notes.map((set) => [...set]),
      active: app.active,
      assistance: { ...app.assistance }
    };
  }

  function restore(snapshotValue) {
    app.grid = snapshotValue.grid.slice();
    app.notes = snapshotValue.notes.map((values) => new Set(values));
    app.active = snapshotValue.active;
    app.assistance = { ...snapshotValue.assistance };
  }

  function pushHistory(previous) {
    app.undo.push(previous);
    if (app.undo.length > 200) app.undo.shift();
    app.redo = [];
  }

  function hasConflict(index, value, grid = app.grid) {
    if (value === 0) return false;
    return PEERS[index].some((peer) => grid[peer] === value);
  }

  function removePeerNotes(index, value) {
    PEERS[index].forEach((peer) => app.notes[peer].delete(value));
  }

  function applyValue(value) {
    if (!app.game || app.given[app.active]) return;
    const index = app.active;
    const previous = snapshot();

    if (app.notesMode) {
      if (value === 0) return;
      if (app.notes[index].has(value)) app.notes[index].delete(value);
      else app.notes[index].add(value);
      pushHistory(previous);
      saveGame();
      render();
      return;
    }

    if (value === 0) {
      app.grid[index] = 0;
      app.notes[index].clear();
      pushHistory(previous);
      saveGame();
      render();
      return;
    }

    const testGrid = app.grid.slice();
    testGrid[index] = 0;
    if (app.conflictGuard && hasConflict(index, value, testGrid)) {
      toast('Conflict Guard blocked a duplicate in this row, column, or box.');
      return;
    }

    app.grid[index] = value;
    app.notes[index].clear();
    removePeerNotes(index, value);
    pushHistory(previous);
    saveGame();
    render();
    checkWin();
  }

  function clearCell() {
    applyValue(0);
  }

  function moveActive(deltaRow, deltaColumn) {
    let row = Math.floor(app.active / 9);
    let column = app.active % 9;
    row = Math.max(0, Math.min(8, row + deltaRow));
    column = Math.max(0, Math.min(8, column + deltaColumn));
    app.active = row * 9 + column;
    renderBoard();
  }

  function checkPuzzle() {
    if (!app.game) return;
    let wrong = 0;
    let empty = 0;
    app.grid.forEach((value, index) => {
      if (value === 0) empty += 1;
      else if (value !== app.game.solution[index]) wrong += 1;
    });
    app.assistance.checksUsed += 1;
    saveGame();
    if (wrong === 0 && empty === 0) checkWin();
    else if (wrong === 0) toast(`${empty} cell${empty === 1 ? '' : 's'} remaining.`);
    else toast(`${wrong} incorrect cell${wrong === 1 ? '' : 's'}.`);
  }

  function revealActive() {
    if (!app.game || app.given[app.active]) return toast('Select an editable cell.');
    const previous = snapshot();
    app.grid[app.active] = app.game.solution[app.active];
    app.notes[app.active].clear();
    app.assistance.revealsUsed += 1;
    pushHistory(previous);
    saveGame();
    render();
    toast('Selected cell revealed.');
    checkWin();
  }

  function hint() {
    if (!app.game) return;
    const candidates = app.grid
      .map((value, index) => ({ value, index }))
      .filter(({ value, index }) => !app.given[index] && value !== app.game.solution[index]);
    if (!candidates.length) return toast('No hint is needed.');
    const target = candidates[Math.floor(Math.random() * candidates.length)].index;
    const previous = snapshot();
    app.active = target;
    app.grid[target] = app.game.solution[target];
    app.notes[target].clear();
    app.assistance.hintsUsed += 1;
    pushHistory(previous);
    saveGame();
    render();
    toast('Hint applied.');
    checkWin();
  }

  function assistedSolve() {
    return app.assistance.hintsUsed > 0 || app.assistance.revealsUsed > 0 || app.assistance.checksUsed > 0;
  }

  function checkWin() {
    if (!app.game || app.grid.some((value, index) => value !== app.game.solution[index])) return false;
    onWin();
    return true;
  }

  function onWin() {
    clearInterval(app.timer);
    const stats = loadStats();
    if (stats.completedIds.includes(app.game.id)) {
      toast('Puzzle complete.');
      clearSavedGame();
      return;
    }

    const assisted = assistedSolve();
    if (assisted) stats.assistedSolves += 1;
    else {
      stats.cleanSolves += 1;
      const previousBest = stats.bestClean[app.difficulty];
      stats.bestClean[app.difficulty] = previousBest == null ? app.elapsed : Math.min(previousBest, app.elapsed);
    }

    if (app.mode === 'daily') {
      const today = localDateKey();
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = localDateKey(yesterdayDate);
      if (stats.lastDailySolve !== today) {
        stats.streak = stats.lastDailySolve === yesterday ? stats.streak + 1 : 1;
        stats.lastDailySolve = today;
      }
    }

    stats.completedIds.push(app.game.id);
    stats.completedIds = stats.completedIds.slice(-100);
    saveStats(stats);
    clearSavedGame();
    updateStats();
    toast(assisted ? 'Solved with assistance.' : 'Clean solve complete!');
  }

  function undo() {
    if (!app.undo.length) return;
    const current = snapshot();
    const previous = app.undo.pop();
    app.redo.push(current);
    restore(previous);
    saveGame();
    render();
  }

  function redo() {
    if (!app.redo.length) return;
    const current = snapshot();
    const next = app.redo.pop();
    app.undo.push(current);
    restore(next);
    saveGame();
    render();
  }

  function resetPuzzle() {
    if (!app.game) return;
    app.grid = app.game.puzzle.slice();
    app.given = app.game.puzzle.map((value) => value !== 0);
    app.notes = Array.from({ length: 81 }, () => new Set());
    app.active = Math.max(0, app.grid.findIndex((value) => value === 0));
    app.elapsed = 0;
    app.startedAt = Date.now();
    app.undo = [];
    app.redo = [];
    app.assistance = { hintsUsed: 0, revealsUsed: 0, checksUsed: 0 };
    startTimer();
    saveGame();
    render();
    toast('Puzzle reset.');
  }

  function startTimer() {
    clearInterval(app.timer);
    app.startedAt = Date.now() - app.elapsed * 1000;
    app.timer = setInterval(() => {
      app.elapsed = Math.floor((Date.now() - app.startedAt) / 1000);
      $('clock').textContent = formatTime(app.elapsed);
      if (app.elapsed % 10 === 0) saveGame();
    }, 1000);
  }

  function cellLabel(index, value) {
    const row = Math.floor(index / 9) + 1;
    const column = index % 9 + 1;
    const notes = [...app.notes[index]].sort().join(', ');
    const given = app.given[index] ? ', given' : '';
    const noteLabel = value === 0 && notes ? `, notes ${notes}` : '';
    return `Row ${row}, column ${column}, ${value === 0 ? 'empty' : `value ${value}`}${given}${noteLabel}`;
  }

  function renderBoard() {
    const board = $('board');
    board.innerHTML = '';
    const activeValue = app.grid[app.active];
    const activeRow = Math.floor(app.active / 9);
    const activeColumn = app.active % 9;
    const activeBox = Math.floor(activeRow / 3) * 3 + Math.floor(activeColumn / 3);

    app.grid.forEach((value, index) => {
      const row = Math.floor(index / 9);
      const column = index % 9;
      const box = Math.floor(row / 3) * 3 + Math.floor(column / 3);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', cellLabel(index, value));
      cell.setAttribute('aria-rowindex', String(row + 1));
      cell.setAttribute('aria-colindex', String(column + 1));
      cell.tabIndex = index === app.active ? 0 : -1;
      if (app.given[index]) cell.classList.add('given');
      if (index === app.active) {
        cell.classList.add('active');
        cell.setAttribute('aria-selected', 'true');
      }
      if (app.highlight && index !== app.active && (row === activeRow || column === activeColumn || box === activeBox)) cell.classList.add('peer');
      if (app.highlight && activeValue !== 0 && value === activeValue && index !== app.active) cell.classList.add('same');
      if (value !== 0 && hasConflict(index, value)) cell.classList.add('conflict');
      if (app.correctnessFeedback && value !== 0 && value !== app.game?.solution[index]) cell.classList.add('wrong');
      if (column === 2 || column === 5) cell.classList.add('box-right');
      if (row === 2 || row === 5) cell.classList.add('box-bottom');

      if (value !== 0) {
        cell.textContent = String(value);
      } else {
        const notes = document.createElement('span');
        notes.className = 'notes';
        for (let number = 1; number <= 9; number += 1) {
          const note = document.createElement('span');
          note.textContent = app.notes[index].has(number) ? String(number) : '';
          notes.appendChild(note);
        }
        cell.appendChild(notes);
      }

      cell.addEventListener('click', () => {
        app.active = index;
        renderBoard();
      });
      board.appendChild(cell);
    });

    $('undoBtn').disabled = app.undo.length === 0;
    $('redoBtn').disabled = app.redo.length === 0;
    $('clearBtn').disabled = app.given[app.active];
  }

  function updateSwitch(id, enabled) {
    const button = $(id);
    button.setAttribute('aria-pressed', String(enabled));
    button.classList.toggle('on', enabled);
  }

  function updateStats() {
    const stats = loadStats();
    $('cleanSolves').textContent = String(stats.cleanSolves);
    $('assistedSolves').textContent = String(stats.assistedSolves);
    $('streak').textContent = String(stats.streak);
    DIFFICULTIES.forEach((difficulty) => {
      const value = stats.bestClean[difficulty];
      $(`best-${difficulty}`).textContent = value == null ? '—' : formatTime(value);
    });
  }

  function render() {
    if (!app.game) return;
    $('title').textContent = `${app.mode === 'daily' ? 'Daily' : 'Classic'} • ${app.game.rating?.label || app.difficulty}`;
    $('subtitle').textContent = app.mode === 'daily'
      ? `Local daily puzzle for ${app.game.dateKey}. Changes at your local midnight.`
      : 'Fresh unique puzzle generated in a background worker.';
    $('clock').textContent = formatTime(app.elapsed);
    $('progress').textContent = `${app.grid.filter(Boolean).length} / 81`;
    $('assistance').textContent = `Hints ${app.assistance.hintsUsed} • Reveals ${app.assistance.revealsUsed} • Checks ${app.assistance.checksUsed}`;
    document.querySelectorAll('[data-difficulty]').forEach((button) => button.classList.toggle('active', button.dataset.difficulty === app.difficulty));
    document.querySelectorAll('[data-mode]').forEach((button) => button.classList.toggle('active', button.dataset.mode === app.mode));
    updateSwitch('notesSwitch', app.notesMode);
    updateSwitch('conflictSwitch', app.conflictGuard);
    updateSwitch('correctnessSwitch', app.correctnessFeedback);
    updateSwitch('highlightSwitch', app.highlight);
    renderBoard();
    updateStats();
  }

  function toggle(property, label) {
    app[property] = !app[property];
    saveGame();
    render();
    toast(`${label}: ${app[property] ? 'ON' : 'OFF'}`);
  }

  function openDialog(id, opener) {
    const dialog = $(id);
    dialog._opener = opener;
    dialog.showModal();
    dialog.querySelector('[data-close]')?.focus();
  }

  function closeDialog(dialog) {
    dialog.close();
    dialog._opener?.focus();
  }

  function wireUi() {
    document.querySelectorAll('[data-difficulty]').forEach((button) => {
      button.addEventListener('click', () => generatePuzzle(app.mode, button.dataset.difficulty));
    });
    document.querySelectorAll('[data-mode]').forEach((button) => {
      button.addEventListener('click', () => generatePuzzle(button.dataset.mode, app.difficulty));
    });
    document.querySelectorAll('[data-new-game]').forEach((button) => {
      button.addEventListener('click', () => generatePuzzle(app.mode, app.difficulty));
    });

    $('notesSwitch').addEventListener('click', () => toggle('notesMode', 'Notes'));
    $('conflictSwitch').addEventListener('click', () => toggle('conflictGuard', 'Conflict Guard'));
    $('correctnessSwitch').addEventListener('click', () => toggle('correctnessFeedback', 'Correctness Feedback'));
    $('highlightSwitch').addEventListener('click', () => toggle('highlight', 'Highlight'));
    $('undoBtn').addEventListener('click', undo);
    $('redoBtn').addEventListener('click', redo);
    $('clearBtn').addEventListener('click', clearCell);
    $('hintBtn').addEventListener('click', hint);
    $('revealBtn').addEventListener('click', revealActive);
    $('checkBtn').addEventListener('click', checkPuzzle);
    $('resetBtn').addEventListener('click', resetPuzzle);

    document.querySelectorAll('[data-number]').forEach((button) => {
      button.addEventListener('click', () => applyValue(Number(button.dataset.number)));
    });

    $('aboutBtn').addEventListener('click', (event) => openDialog('aboutDialog', event.currentTarget));
    $('statsBtn').addEventListener('click', (event) => {
      updateStats();
      openDialog('statsDialog', event.currentTarget);
    });
    document.querySelectorAll('dialog').forEach((dialog) => {
      dialog.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => closeDialog(dialog)));
      dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        closeDialog(dialog);
      });
    });
    $('resetStatsBtn').addEventListener('click', () => {
      saveStats(defaultStats());
      updateStats();
      toast('Statistics reset.');
    });

    window.addEventListener('keydown', (event) => {
      if (document.querySelector('dialog[open]')) return;
      const tag = document.activeElement?.tagName || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (/^[1-9]$/.test(event.key)) {
        event.preventDefault();
        applyValue(Number(event.key));
        return;
      }
      const actions = {
        ArrowLeft: () => moveActive(0, -1),
        ArrowRight: () => moveActive(0, 1),
        ArrowUp: () => moveActive(-1, 0),
        ArrowDown: () => moveActive(1, 0),
        Backspace: clearCell,
        Delete: clearCell,
        n: () => toggle('notesMode', 'Notes'),
        N: () => toggle('notesMode', 'Notes'),
        u: undo,
        U: undo,
        r: redo,
        R: redo
      };
      if (actions[event.key]) {
        event.preventDefault();
        actions[event.key]();
      }
    });
  }

  function start() {
    wireUi();
    try {
      createWorker();
      if (loadSavedGame()) {
        startTimer();
        render();
        toast('Saved puzzle resumed.');
      } else {
        clearSavedGame();
        generatePuzzle('classic', 'medium');
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : String(error));
    }
  }

  start();
})();
