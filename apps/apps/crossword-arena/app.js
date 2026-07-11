(() => {
  'use strict';

  const DATA = {
    "version": 1,
    "license": "Original puzzle pack created for Arcade Hub. Redistribution follows the repository content license.",
    "weekly": [
      {
        "id": "weekly-01",
        "title": "Weekly 1 — Opening Round",
        "grid": [
          "LEAST",
          "ERROR",
          "ARENA",
          "SONGS",
          "TRASH"
        ],
        "clues": {
          "LEAST": "Smallest in amount",
          "ERROR": "A mistake",
          "ARENA": "Place for a competition",
          "SONGS": "Musical compositions",
          "TRASH": "Waste material"
        }
      },
      {
        "id": "weekly-02",
        "title": "Weekly 2 — First Principles",
        "grid": [
          "CAUSE",
          "ALPHA",
          "UPPER",
          "SHEET",
          "EARTH"
        ],
        "clues": {
          "CAUSE": "Reason something happens",
          "ALPHA": "First Greek letter",
          "UPPER": "Higher in position",
          "SHEET": "Flat piece of paper",
          "EARTH": "Our home planet"
        }
      },
      {
        "id": "weekly-03",
        "title": "Weekly 3 — Follow the Path",
        "grid": [
          "HEART",
          "ERROR",
          "ARGUE",
          "ROUTE",
          "TREES"
        ],
        "clues": {
          "HEART": "Organ that pumps blood",
          "ERROR": "A mistake",
          "ARGUE": "Disagree verbally",
          "ROUTE": "Path from place to place",
          "TREES": "Tall woody plants"
        }
      },
      {
        "id": "weekly-04",
        "title": "Weekly 4 — Stripe and Style",
        "grid": [
          "STAND",
          "TIGER",
          "AGREE",
          "NEEDS",
          "DRESS"
        ],
        "clues": {
          "STAND": "Rise to your feet",
          "TIGER": "Striped big cat",
          "AGREE": "Share the same opinion",
          "NEEDS": "Requires",
          "DRESS": "One-piece garment"
        }
      },
      {
        "id": "weekly-05",
        "title": "Weekly 5 — Signal and Sound",
        "grid": [
          "PARTS",
          "ALARM",
          "RADIO",
          "TRICK",
          "SMOKE"
        ],
        "clues": {
          "PARTS": "Components",
          "ALARM": "Warning signal",
          "RADIO": "Audio broadcast device",
          "TRICK": "Clever deceptive act",
          "SMOKE": "What rises from a fire"
        }
      }
    ],
    "library": [
      {
        "id": "library-01",
        "title": "Library — Fresh Start",
        "grid": [
          "STAFF",
          "TIGER",
          "AGREE",
          "FEELS",
          "FRESH"
        ],
        "clues": {
          "STAFF": "A group of employees",
          "TIGER": "Striped big cat",
          "AGREE": "Reach the same opinion",
          "FEELS": "Experiences an emotion",
          "FRESH": "New or recently made"
        }
      },
      {
        "id": "library-02",
        "title": "Library — Essay Mode",
        "grid": [
          "ISSUE",
          "SOULS",
          "SUITS",
          "ULTRA",
          "ESSAY"
        ],
        "clues": {
          "ISSUE": "A topic or problem",
          "SOULS": "Spiritual selves",
          "SUITS": "Matches or formal outfits",
          "ULTRA": "Beyond the usual limit",
          "ESSAY": "A short written composition"
        }
      }
    ],
    "meta": {
      "id": "weekly-meta-01",
      "title": "Meta — Final Round",
      "grid": [
        "COSTS",
        "OPERA",
        "SEVEN",
        "TREAT",
        "SANTA"
      ],
      "clues": {
        "COSTS": "Prices",
        "OPERA": "Drama sung on stage",
        "SEVEN": "Number after six",
        "TREAT": "Something special",
        "SANTA": "Holiday gift giver"
      }
    }
  };

  const KEYS = {
    progress: 'cw_arena_progress_v4',
    stats: 'cw_arena_stats_v4',
    weekly: 'cw_arena_weekly_v4'
  };
  const $ = (id) => document.getElementById(id);
  const puzzles = [...DATA.weekly, ...DATA.library, DATA.meta];
  const state = {
    currentId: DATA.weekly[0].id,
    active: { r: 0, c: 0 },
    dir: 'across',
    filled: {},
    elapsed: 0,
    startedAt: Date.now(),
    tab: 'play',
    assistance: { checksUsed: 0, lettersRevealed: 0 },
    solvedThisSession: false,
    lastTap: null
  };

  const parse = (value, fallback) => {
    try { return JSON.parse(value) ?? fallback; } catch { return fallback; }
  };
  const load = (key, fallback) => parse(localStorage.getItem(key), fallback);
  const save = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (error) { console.warn(`Unable to save ${key}`, error); }
  };
  const cellKey = (r, c) => `${r},${c}`;
  const currentPuzzle = () => puzzles.find((puzzle) => puzzle.id === state.currentId) || puzzles[0];
  const isOpen = (puzzle, r, c) => r >= 0 && c >= 0 && r < puzzle.grid.length && c < puzzle.grid.length && puzzle.grid[r][c] !== '#';
  const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.hidden = true; }, 1800);
  }

  function entriesFor(puzzle) {
    const size = puzzle.grid.length;
    const numbers = Array.from({ length: size }, () => Array(size).fill(null));
    const across = [];
    const down = [];
    let number = 1;

    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (!isOpen(puzzle, r, c)) continue;
        const beginsAcross = (c === 0 || !isOpen(puzzle, r, c - 1)) && isOpen(puzzle, r, c + 1);
        const beginsDown = (r === 0 || !isOpen(puzzle, r - 1, c)) && isOpen(puzzle, r + 1, c);
        if (beginsAcross || beginsDown) numbers[r][c] = number++;

        if (beginsAcross) {
          const cells = [];
          let answer = '';
          for (let x = c; x < size && isOpen(puzzle, r, x); x += 1) {
            cells.push({ r, c: x });
            answer += puzzle.grid[r][x];
          }
          across.push({ number: numbers[r][c], answer, cells, clue: puzzle.clues[answer] || `${answer.length} letters` });
        }
        if (beginsDown) {
          const cells = [];
          let answer = '';
          for (let y = r; y < size && isOpen(puzzle, y, c); y += 1) {
            cells.push({ r: y, c });
            answer += puzzle.grid[y][c];
          }
          down.push({ number: numbers[r][c], answer, cells, clue: puzzle.clues[answer] || `${answer.length} letters` });
        }
      }
    }
    return { numbers, across, down };
  }

  function activeEntry() {
    const entries = entriesFor(currentPuzzle())[state.dir];
    return entries.find((entry) => entry.cells.some((cell) => cell.r === state.active.r && cell.c === state.active.c)) || entries[0];
  }

  function progressStore() {
    const fallback = { schemaVersion: 4, puzzles: {} };
    const value = load(KEYS.progress, fallback);
    return value?.schemaVersion === 4 && value.puzzles && typeof value.puzzles === 'object' ? value : fallback;
  }

  function weeklyStore() {
    const fallback = { schemaVersion: 4, solved: [] };
    const value = load(KEYS.weekly, fallback);
    return value?.schemaVersion === 4 && Array.isArray(value.solved) ? value : fallback;
  }

  function statsStore() {
    const fallback = { schemaVersion: 4, cleanSolves: 0, assistedSolves: 0, bestCleanSeconds: null, completedIds: [] };
    const value = load(KEYS.stats, fallback);
    if (value?.schemaVersion !== 4) return fallback;
    return { ...fallback, ...value, completedIds: Array.isArray(value.completedIds) ? value.completedIds : [] };
  }

  function saveProgress() {
    const store = progressStore();
    store.puzzles[state.currentId] = {
      filled: { ...state.filled },
      active: { ...state.active },
      direction: state.dir,
      elapsed: state.elapsed,
      assistance: { ...state.assistance },
      savedAt: new Date().toISOString()
    };
    save(KEYS.progress, store);
  }

  function loadProgress(puzzle) {
    const saved = progressStore().puzzles[puzzle.id];
    state.filled = saved?.filled && typeof saved.filled === 'object' ? { ...saved.filled } : {};
    state.active = saved?.active && Number.isInteger(saved.active.r) && Number.isInteger(saved.active.c)
      ? { ...saved.active }
      : { r: 0, c: 0 };
    if (!isOpen(puzzle, state.active.r, state.active.c)) state.active = { r: 0, c: 0 };
    state.dir = saved?.direction === 'down' ? 'down' : 'across';
    state.elapsed = Number.isFinite(saved?.elapsed) ? Math.max(0, Math.floor(saved.elapsed)) : 0;
    state.assistance = {
      checksUsed: Number(saved?.assistance?.checksUsed) || 0,
      lettersRevealed: Number(saved?.assistance?.lettersRevealed) || 0
    };
    state.solvedThisSession = false;
    state.startedAt = Date.now() - state.elapsed * 1000;
  }

  function metaUnlocked() {
    const solved = new Set(weeklyStore().solved);
    return DATA.weekly.every((puzzle) => solved.has(puzzle.id));
  }

  function groupFor(puzzle) {
    if (DATA.weekly.some((item) => item.id === puzzle.id)) return 'Weekly';
    if (puzzle.id === DATA.meta.id) return 'Meta';
    return 'Library';
  }

  function setPuzzle(id) {
    const puzzle = puzzles.find((item) => item.id === id);
    if (!puzzle) return;
    if (id === DATA.meta.id && !metaUnlocked()) return toast('Solve all five weekly puzzles to unlock the Meta.');
    state.currentId = id;
    loadProgress(puzzle);
    $('tab-play').classList.remove('show-library');
    $('libraryBtn').textContent = 'Library';
    render();
    focusInput();
  }

  function focusInput() {
    const input = $('crosswordInput');
    input.value = '';
    input.focus({ preventScroll: true });
  }

  function setDirection(direction) {
    state.dir = direction === 'down' ? 'down' : 'across';
    render();
    focusInput();
  }

  function advance(delta) {
    const all = entriesFor(currentPuzzle())[state.dir];
    const entry = activeEntry();
    if (!entry || !all.length) return;
    const entryIndex = Math.max(0, all.findIndex((item) => item.number === entry.number));
    const cellIndex = entry.cells.findIndex((cell) => cell.r === state.active.r && cell.c === state.active.c);
    const desired = cellIndex + delta;
    if (desired >= 0 && desired < entry.cells.length) {
      state.active = entry.cells[desired];
    } else {
      const nextEntry = all[(entryIndex + (delta > 0 ? 1 : -1) + all.length) % all.length];
      state.active = delta > 0 ? nextEntry.cells[0] : nextEntry.cells[nextEntry.cells.length - 1];
    }
    render();
  }

  function moveActive(dr, dc) {
    const puzzle = currentPuzzle();
    let { r, c } = state.active;
    for (let attempts = 0; attempts < puzzle.grid.length * puzzle.grid.length; attempts += 1) {
      const nextR = Math.max(0, Math.min(puzzle.grid.length - 1, r + dr));
      const nextC = Math.max(0, Math.min(puzzle.grid.length - 1, c + dc));
      if (nextR === r && nextC === c) break;
      r = nextR;
      c = nextC;
      if (isOpen(puzzle, r, c)) {
        state.active = { r, c };
        break;
      }
    }
    render();
  }

  function isSolved() {
    const puzzle = currentPuzzle();
    for (let r = 0; r < puzzle.grid.length; r += 1) {
      for (let c = 0; c < puzzle.grid.length; c += 1) {
        if (isOpen(puzzle, r, c) && (state.filled[cellKey(r, c)] || '').toUpperCase() !== puzzle.grid[r][c]) return false;
      }
    }
    return true;
  }

  function insertLetter(letter) {
    const puzzle = currentPuzzle();
    if (!isOpen(puzzle, state.active.r, state.active.c)) return;
    state.filled[cellKey(state.active.r, state.active.c)] = letter.toUpperCase();
    saveProgress();
    if (isSolved()) onSolved();
    else advance(1);
  }

  function clearLetter() {
    const key = cellKey(state.active.r, state.active.c);
    if (state.filled[key]) {
      delete state.filled[key];
      saveProgress();
      render();
      return;
    }
    advance(-1);
    delete state.filled[cellKey(state.active.r, state.active.c)];
    saveProgress();
    render();
  }

  function checkPuzzle() {
    const puzzle = currentPuzzle();
    let wrong = 0;
    let empty = 0;
    for (let r = 0; r < puzzle.grid.length; r += 1) {
      for (let c = 0; c < puzzle.grid.length; c += 1) {
        if (!isOpen(puzzle, r, c)) continue;
        const value = (state.filled[cellKey(r, c)] || '').toUpperCase();
        if (!value) empty += 1;
        else if (value !== puzzle.grid[r][c]) wrong += 1;
      }
    }
    state.assistance.checksUsed += 1;
    saveProgress();
    if (!wrong && !empty) onSolved();
    else if (!wrong) toast(`${empty} cell${empty === 1 ? '' : 's'} remaining.`);
    else toast(`${wrong} incorrect cell${wrong === 1 ? '' : 's'}.`);
  }

  function revealLetter() {
    const puzzle = currentPuzzle();
    const key = cellKey(state.active.r, state.active.c);
    if ((state.filled[key] || '').toUpperCase() !== puzzle.grid[state.active.r][state.active.c]) {
      state.filled[key] = puzzle.grid[state.active.r][state.active.c];
      state.assistance.lettersRevealed += 1;
      saveProgress();
    }
    render();
    if (isSolved()) onSolved();
    else toast('Letter revealed.');
    focusInput();
  }

  function onSolved() {
    if (state.solvedThisSession) return;
    state.solvedThisSession = true;
    const stats = statsStore();
    const firstCompletion = !stats.completedIds.includes(state.currentId);
    const assisted = state.assistance.checksUsed > 0 || state.assistance.lettersRevealed > 0;
    if (firstCompletion) {
      if (assisted) stats.assistedSolves += 1;
      else {
        stats.cleanSolves += 1;
        stats.bestCleanSeconds = stats.bestCleanSeconds == null ? state.elapsed : Math.min(stats.bestCleanSeconds, state.elapsed);
      }
      stats.completedIds.push(state.currentId);
      stats.completedIds = stats.completedIds.slice(-100);
      save(KEYS.stats, stats);
    }
    if (DATA.weekly.some((puzzle) => puzzle.id === state.currentId)) {
      const weekly = weeklyStore();
      if (!weekly.solved.includes(state.currentId)) weekly.solved.push(state.currentId);
      save(KEYS.weekly, weekly);
    }
    saveProgress();
    render();
    toast(firstCompletion ? (assisted ? 'Solved with assistance.' : 'Clean solve complete!') : 'Puzzle complete.');
  }

  function selectCell(r, c) {
    const now = Date.now();
    const same = state.active.r === r && state.active.c === c;
    if (same && state.lastTap?.r === r && state.lastTap?.c === c && now - state.lastTap.time < 350) {
      state.dir = state.dir === 'across' ? 'down' : 'across';
    }
    state.active = { r, c };
    state.lastTap = { r, c, time: now };
    render();
    focusInput();
  }

  function renderBoard() {
    const puzzle = currentPuzzle();
    const entryData = entriesFor(puzzle);
    const active = activeEntry();
    const activeCells = new Set((active?.cells || []).map((cell) => cellKey(cell.r, cell.c)));
    const board = $('board');
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${puzzle.grid.length}, minmax(30px, 42px))`;
    board.setAttribute('aria-rowcount', String(puzzle.grid.length));
    board.setAttribute('aria-colcount', String(puzzle.grid.length));

    for (let r = 0; r < puzzle.grid.length; r += 1) {
      for (let c = 0; c < puzzle.grid.length; c += 1) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cell';
        button.setAttribute('role', 'gridcell');
        button.setAttribute('aria-rowindex', String(r + 1));
        button.setAttribute('aria-colindex', String(c + 1));
        if (!isOpen(puzzle, r, c)) {
          button.classList.add('black');
          button.disabled = true;
          button.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}, blocked`);
        } else {
          const key = cellKey(r, c);
          const value = (state.filled[key] || '').toUpperCase();
          if (activeCells.has(key)) button.classList.add('inword');
          if (state.active.r === r && state.active.c === c) {
            button.classList.add('active');
            button.setAttribute('aria-selected', 'true');
          }
          button.tabIndex = state.active.r === r && state.active.c === c ? 0 : -1;
          button.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}${entryData.numbers[r][c] ? `, clue ${entryData.numbers[r][c]}` : ''}, ${value ? `letter ${value}` : 'empty'}`);
          if (entryData.numbers[r][c]) {
            const number = document.createElement('span');
            number.className = 'num';
            number.textContent = String(entryData.numbers[r][c]);
            button.appendChild(number);
          }
          const letter = document.createElement('span');
          letter.className = 'letter';
          letter.textContent = value;
          button.appendChild(letter);
          button.addEventListener('click', () => selectCell(r, c));
        }
        board.appendChild(button);
      }
    }
  }

  function renderClues() {
    const data = entriesFor(currentPuzzle());
    const active = activeEntry();
    $('clueNum').textContent = active ? String(active.number) : '—';
    $('clueTxt').textContent = active?.clue || '—';
    $('dirLbl').textContent = state.dir.toUpperCase();
    for (const direction of ['across', 'down']) {
      const container = $(direction === 'across' ? 'acrossList' : 'downList');
      container.innerHTML = '';
      data[direction].forEach((entry) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'clueBtn';
        if (state.dir === direction && active?.number === entry.number) button.classList.add('active');
        button.textContent = `${entry.number}. ${entry.clue}`;
        button.addEventListener('click', () => {
          state.dir = direction;
          state.active = entry.cells[0];
          render();
          focusInput();
        });
        container.appendChild(button);
      });
    }
  }

  function renderList() {
    const list = $('puzzleList');
    list.innerHTML = '';
    const solved = new Set(weeklyStore().solved);
    puzzles.forEach((puzzle) => {
      if (puzzle.id === DATA.meta.id && !metaUnlocked()) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `item${puzzle.id === state.currentId ? ' active' : ''}`;
      button.innerHTML = `<span class="name">${puzzle.title}</span><span class="meta">${groupFor(puzzle)}${solved.has(puzzle.id) ? ' • Solved' : ''}</span>`;
      button.addEventListener('click', () => setPuzzle(puzzle.id));
      list.appendChild(button);
    });
  }

  function renderProgress() {
    const solved = new Set(weeklyStore().solved);
    $('bars').innerHTML = '';
    DATA.weekly.forEach((puzzle, index) => {
      const bar = document.createElement('span');
      bar.className = `bar${solved.has(puzzle.id) ? ' done' : ''}`;
      bar.title = `Weekly puzzle ${index + 1}${solved.has(puzzle.id) ? ' solved' : ' unsolved'}`;
      $('bars').appendChild(bar);
    });
    $('metaBtn').disabled = !metaUnlocked();
    const stats = statsStore();
    $('solvesLbl').textContent = String(stats.cleanSolves);
    $('assistedLbl').textContent = String(stats.assistedSolves);
    $('bestLbl').textContent = stats.bestCleanSeconds == null ? '—' : formatTime(stats.bestCleanSeconds);
  }

  function render() {
    const puzzle = currentPuzzle();
    $('pTitle').textContent = puzzle.title;
    $('modeBadge').textContent = `SESSION: ${groupFor(puzzle).toUpperCase()}`;
    $('timeLbl').textContent = formatTime(state.elapsed);
    document.querySelectorAll('[data-tab]').forEach((button) => {
      const selected = button.dataset.tab === state.tab;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', String(selected));
    });
    $('tab-play').hidden = state.tab !== 'play';
    $('tab-progress').hidden = state.tab !== 'progress';
    renderProgress();
    renderList();
    renderBoard();
    renderClues();
  }

  function navigateClue(offset) {
    const entries = entriesFor(currentPuzzle())[state.dir];
    const active = activeEntry();
    let index = Math.max(0, entries.findIndex((entry) => entry.number === active?.number));
    index = (index + offset + entries.length) % entries.length;
    state.active = entries[index].cells[0];
    render();
    focusInput();
  }

  function handleControl(event) {
    const handlers = {
      ArrowLeft: () => moveActive(0, -1),
      ArrowRight: () => moveActive(0, 1),
      ArrowUp: () => moveActive(-1, 0),
      ArrowDown: () => moveActive(1, 0),
      Backspace: clearLetter,
      Delete: clearLetter,
      Tab: () => setDirection(state.dir === 'across' ? 'down' : 'across')
    };
    if (!handlers[event.key]) return false;
    event.preventDefault();
    handlers[event.key]();
    return true;
  }

  function wire() {
    const input = $('crosswordInput');
    input.addEventListener('keydown', handleControl);
    input.addEventListener('input', () => {
      const letters = input.value.toUpperCase().match(/[A-Z]/g) || [];
      input.value = '';
      letters.forEach(insertLetter);
    });
    window.addEventListener('keydown', (event) => {
      if (state.tab !== 'play' || document.activeElement === input) return;
      const tag = document.activeElement?.tagName || '';
      if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return;
      if (handleControl(event)) return;
      if (/^[A-Za-z]$/.test(event.key)) {
        event.preventDefault();
        insertLetter(event.key);
      }
    });
    document.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => { state.tab = button.dataset.tab; render(); }));
    $('acrossBtn').addEventListener('click', () => setDirection('across'));
    $('downBtn').addEventListener('click', () => setDirection('down'));
    $('checkBtn').addEventListener('click', checkPuzzle);
    $('revealBtn').addEventListener('click', revealLetter);
    $('prevClueBtn').addEventListener('click', () => navigateClue(-1));
    $('nextClueBtn').addEventListener('click', () => navigateClue(1));
    $('metaBtn').addEventListener('click', () => setPuzzle(DATA.meta.id));
    $('libraryBtn').addEventListener('click', () => {
      $('tab-play').classList.toggle('show-library');
      $('libraryBtn').textContent = $('tab-play').classList.contains('show-library') ? 'Back to puzzle' : 'Library';
    });
    $('resetStatsBtn').addEventListener('click', () => {
      save(KEYS.stats, { schemaVersion: 4, cleanSolves: 0, assistedSolves: 0, bestCleanSeconds: null, completedIds: [] });
      renderProgress();
      toast('Statistics reset.');
    });
    $('resetWeeklyBtn').addEventListener('click', () => {
      save(KEYS.weekly, { schemaVersion: 4, solved: [] });
      render();
      toast('Weekly progress reset.');
    });
    const about = $('aboutModal');
    $('aboutBtn').addEventListener('click', () => about.showModal());
    const closeAbout = () => { about.close(); $('aboutBtn').focus(); };
    $('aboutCloseBtn').addEventListener('click', closeAbout);
    about.addEventListener('cancel', (event) => { event.preventDefault(); closeAbout(); });
  }

  function init() {
    loadProgress(currentPuzzle());
    wire();
    setInterval(() => {
      state.elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
      $('timeLbl').textContent = formatTime(state.elapsed);
      if (state.elapsed % 5 === 0) saveProgress();
    }, 1000);
    render();
  }

  try { init(); }
  catch (error) {
    console.error(error);
    $('appError').hidden = false;
    $('appError').textContent = `Crossword Arena could not start: ${error.message}`;
  }
})();
