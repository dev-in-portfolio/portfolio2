    .cell.same{background:rgba(168,85,247,.12); border-color:rgba(168,85,247,.30)}
    .cell.bad{background:rgba(244,63,94,.14); border-color:rgba(244,63,94,.48)}
    .cell.boxEdgeRight{box-shadow: inset -2px 0 0 rgba(255,255,255,.16)}
    .cell.boxEdgeBottom{box-shadow: inset 0 -2px 0 rgba(255,255,255,.16)}

    .notes{
      position:absolute;inset:6px;
      display:grid;grid-template-columns:repeat(3, 1fr);grid-template-rows:repeat(3, 1fr);
      gap:2px;
      font-size:9px;
      font-weight:800;
      color:rgba(255,255,255,.72);
      line-height:1;
      pointer-events:none;
    }
    .notes span{display:flex;align-items:center;justify-content:center;opacity:.0}
    .notes span.on{opacity:1}
    .toast{
      position:fixed;left:50%;bottom:16px;transform:translateX(-50%);
      border-radius:18px;border:1px solid var(--border2);
      background:rgba(0,0,0,.70);
      backdrop-filter:blur(10px);
      padding:10px 14px;
      font-size:13px;color:rgba(255,255,255,.88);
      box-shadow:var(--shadow);
      display:none;z-index:100;
      max-width: calc(100vw - 24px);
      text-align:center;
    }
    .keypad{
      display:grid;
      grid-template-columns: repeat(5, 1fr);
      gap:8px;
      margin-top:10px;
    }
    @media (max-width: 520px){
      .keypad{grid-template-columns: repeat(5, 1fr); gap:7px}
      .key{padding:13px 8px;font-size:15px}
    }
    .key{
      border:1px solid var(--border);
      background:rgba(255,255,255,.06);
      border-radius:16px;
      padding:12px 10px;
      font-weight:900;
      font-size:14px;
      cursor:pointer;
      user-select:none;
      transition:.12s ease;
      color:#fff;
    }
    .key:hover{background:rgba(255,255,255,.12)}
    .key.small{font-size:12px;font-weight:800;color:#fff}
    .key.danger{border-color:rgba(244,63,94,.35); background:rgba(244,63,94,.10)}
    .key.good{border-color:rgba(34,197,94,.35); background:rgba(34,197,94,.10)}
    .key.gold{border-color:rgba(251,191,36,.38); background:rgba(251,191,36,.10)}

    .divider{height:1px;background:var(--border);margin:12px 0}
    .chip{
      display:inline-flex;align-items:center;gap:8px;
      border:1px solid var(--border);
      background:rgba(255,255,255,.05);
      padding:6px 10px;border-radius:999px;font-size:12px;color:rgba(255,255,255,.86)
    }
    .dot{width:8px;height:8px;border-radius:99px;background:rgba(255,255,255,.50)}
    .dot.c{background:var(--a)}
    .dot.m{background:var(--b)}
    .dot.g{background:var(--c)}
    .dot.w{background:var(--warn)}
    .modal{
      position:fixed; inset:0; display:none; z-index:200;
    }
    .modal .overlay{position:absolute;inset:0;background:rgba(0,0,0,.60);backdrop-filter:blur(8px)}
    .modal .box{position:relative;max-width:760px;margin:72px auto;padding:0 16px}
    .modal .boxInner{padding:14px}
    .modal h3{margin:0;font-size:16px}
    .list{margin-top:10px;display:grid;gap:8px}
    .li{border:1px solid var(--border);background:rgba(255,255,255,.05);border-radius:16px;padding:10px 12px}
    .li .t{font-weight:900}
    .li .d{font-size:12px;color:var(--muted);margin-top:2px;line-height:1.35}
  
    
    .boardViewport{
      margin-top:12px;
      border-radius:18px;
      border:1px solid var(--border);
      background:rgba(0,0,0,.18);
      padding:10px;
      overflow:hidden;
      position:relative;
      /* allow gesture pan without page scroll grabbing */
      touch-action:none;
    }
    /* inside viewport, keep the board itself transformable */
    .boardViewport .board{ margin-top:0; border:none; background:transparent; padding:0; }

    .controlsDock{
      position: sticky;
      bottom: 12px;
      z-index: 5;
      padding-bottom: env(safe-area-inset-bottom);
    }
    /* add a subtle backdrop behind dock so it stays readable when overlaying board */
    .controlsDock::before{
      content:"";
      position:absolute;
      inset:-10px -10px -16px -10px;
      border-radius:22px;
      background:rgba(0,0,0,.38);
      backdrop-filter: blur(10px);
      border:1px solid rgba(255,255,255,.08);
      z-index:-1;
    }
    .controlsDock{ position:sticky; }
    @media (min-width: 980px){
      /* on desktop, no need for sticky dock overlay */
      .controlsDock{ position:static; }
      .controlsDock::before{ display:none; }
      .boardViewport{ touch-action:pan-x pan-y; overflow:visible; background:transparent; border:none; padding:0; }
    }


    @media (max-width: 520px){
      .panel.pad{padding:12px}
      .card{padding:10px;border-radius:16px}
      .keypad{grid-template-columns: repeat(5, 1fr); gap:6px}
      .key{padding:11px 8px;border-radius:14px}
      .btn{padding:10px 10px}
      .cell{border-radius:10px}
      .board{padding:8px}
    }

  </style>
  <link rel="stylesheet" href="/shared/tokens.css"/>
  <link rel="stylesheet" href="/shared/nexus-topnav-v2.css"/>
</head>
<body>
    <nav class="nxTopNav"></nav>
<header>
    <div class="wrap">
      <div class="topbar">
        <div class="brand">
          <span class="plus">EVENING+</span>
          <span class="sub">EPIC SUDOKU</span>
        </div>
        <div class="pillrow">
          <div class="chip"><span class="dot c"></span><span id="chipMode">MODE: CLASSIC</span></div>
          <button class="pill" id="aboutBtn" type="button">About</button>
          <button class="pill" id="statsBtn" type="button">Stats</button>
          <button class="pill danger" id="newBtn" type="button">New</button>
        </div>
      </div>
    </div>
  </header>

  <main class="wrap">
    <div class="grid">
      <aside class="panel pad">
        <div class="h">
          <div>
            <div class="kicker">Session</div>
            <h2>Play Settings</h2>
            <div class="small" style="margin-top:6px">Keyboard-first, mobile-friendly. Everything saves automatically.</div>
          </div>
          <div class="time" id="clock">00:00</div>
        </div>

        <div class="divider"></div>

        <div class="card">
          <div class="kicker">Choose</div>
          <div class="row" style="margin-top:8px">
            <button type="button" class="btn primary" data-diff="easy">Easy</button>
            <button type="button" class="btn" data-diff="medium">Medium</button>
            <button type="button" class="btn" data-diff="hard">Hard</button>
            <button type="button" class="btn" data-diff="expert">Expert</button>
          </div>
          <div class="small" style="margin-top:8px">
            Daily is the same puzzle for everyone today. Classic generates fresh puzzles instantly.
          </div>
          <div class="row" style="margin-top:10px">
            <button class="btn gold" id="dailyBtn" type="button">Daily</button>
            <button class="btn" id="classicBtn" type="button">Classic</button>
          </div>
        </div>

        

        

        
      </aside>
    
      <section class="panel boardWrap">
        <div class="boardHead">
          <div class="titleLine">
            <div class="name" id="title">Classic • Medium</div>
            <div class="meta" id="subtitle">Tap a cell. Type 1–9. Notes for candidates. Strict blocks invalids.</div>
          </div>
          <div class="row">
            <div class="chip"><span class="dot g"></span><span id="progressChip">0 / 81</span></div>
            <div class="chip"><span class="dot w"></span><span id="mistakeChip">Mistakes: 0</span></div>
          </div>
        </div>

        <div class="boardViewport" id="boardViewport">
          <div class="board" id="board" aria-label="Sudoku board"></div>
        </div>

        <div class="divider" style="margin-top:14px"></div>

        <!-- Mobile-first control stack -->
        <div class="controlsDock" id="controlsDock">

        <div class="card" style="margin-top:12px">
          <div class="kicker">Keypad</div>
          <div class="keypad" id="keypad"></div>
        </div>

        <div class="card" style="margin-top:12px">
          <div class="kicker">Tools</div>
          <div class="row" style="margin-top:8px">
            <button class="btn" id="undoBtn" type="button">Undo</button>
            <button class="btn" id="redoBtn" type="button">Redo</button>
            <button class="btn" id="checkBtn" type="button">Check</button>
            <button class="btn" id="clearBtn" type="button">Clear</button>
          </div>
          <div class="row" style="margin-top:8px">
            <button class="btn gold" id="hintBtn" type="button">Hint</button>
            <button class="btn" id="revealBtn" type="button">Reveal</button>
            <button class="btn warn" id="resetBtn" type="button">Reset</button>
          </div>
          <div class="small" style="margin-top:8px">
            Shortcuts: <b>1–9</b>, <b>Backspace</b>, <b>Arrows</b>, <b>U</b> undo, <b>R</b> redo, <b>N</b> notes.
          </div>
        </div>

        <div class="card" style="margin-top:12px">
          <div class="kicker">Settings</div>
          <div class="toggle" style="margin-top:10px">
            <div>
              <div style="font-weight:900;font-size:13px">Notes</div>
              <div class="small">Toggle pencil marks (or press <b>N</b>)</div>
            </div>
            <div class="switch" id="notesSwitch" role="switch" aria-label="Notes toggle"><div class="knob"></div></div>
          </div>
          <div class="toggle" style="margin-top:10px">
            <div>
              <div style="font-weight:900;font-size:13px">Strict</div>
              <div class="small">Block invalid moves (toggle with <b>S</b>)</div>
            </div>
            <div class="switch on" id="strictSwitch" role="switch" aria-label="Strict toggle"><div class="knob"></div></div>
          </div>
          <div class="toggle" style="margin-top:10px">
            <div>
              <div style="font-weight:900;font-size:13px">Highlight</div>
              <div class="small">Peers + same numbers</div>
            </div>
            <div class="switch on" id="hlSwitch" role="switch" aria-label="Highlight toggle"><div class="knob"></div></div>
          </div>
        
        </div>

      </div>
      </section>

    </div>
  </main>

  <div class="toast" id="toast"></div>

  <div class="modal" id="aboutModal">
    <div class="overlay" data-close="1"></div>
    <div class="box">
      <div class="panel pad boxInner">
        <div class="h">
          <div>
            <div class="kicker">Evening+</div>
            <h3>Epic Sudoku</h3>
            <div class="small" style="margin-top:6px">
              A premium, portfolio-grade Sudoku: fast generation, uniqueness checks, notes, undo/redo, daily puzzle, and stats.
            </div>
          </div>
          <button class="btn" data-close="1" type="button">Close</button>
        </div>
        <div class="list">
          <div class="li"><div class="t">Real puzzles</div><div class="d">Backtracking generator with uniqueness checking (solution count capped).</div></div>
          <div class="li"><div class="t">Premium UX</div><div class="d">Keyboard-first, touch-friendly keypad, highlighting, strict mode, and smooth interactions.</div></div>
          <div class="li"><div class="t">Retention</div><div class="d">Auto-save/resume + local stats (solves, best times, streak).</div></div>
        </div>
      </div>
    </div>
  </div>

  <div class="modal" id="statsModal">
    <div class="overlay" data-close="1"></div>
    <div class="box">
      <div class="panel pad boxInner">
        <div class="h">
          <div>
            <div class="kicker">Stats</div>
            <h3>Your Local Progress</h3>
            <div class="small" style="margin-top:6px">Stored on this device. Reset anytime.</div>
          </div>
          <button class="btn" data-close="1" type="button">Close</button>
        </div>
        <div class="stats">
          <div class="stat"><div class="l">Solves</div><div class="v" id="stSolves">0</div></div>
          <div class="stat"><div class="l">Streak</div><div class="v" id="stStreak">0</div></div>
          <div class="stat"><div class="l">Best (Easy)</div><div class="v" id="stBestE">—</div></div>
          <div class="stat"><div class="l">Best (Medium)</div><div class="v" id="stBestM">—</div></div>
          <div class="stat"><div class="l">Best (Hard)</div><div class="v" id="stBestH">—</div></div>
          <div class="stat"><div class="l">Best (Expert)</div><div class="v" id="stBestX">—</div></div>
        </div>
        <div class="divider"></div>
        <button class="btn warn" id="resetStatsBtn" style="width:100%" type="button">Reset Stats</button>
      </div>
    </div>
  </div>

  <script>
  (() => {
    // ---------- Utilities ----------
    const $ = (id) => document.getElementById(id);
    const toastEl = $("toast");
    const toast = (msg) => {
      toastEl.textContent = msg;
      toastEl.style.display = "block";
      clearTimeout(toastEl._t);
      toastEl._t = setTimeout(() => toastEl.style.display = "none", 1400);
    };
    const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
    const deepCopy = (x) => JSON.parse(JSON.stringify(x));
    const nowISO = () => new Date().toISOString();
    const todayKey = () => new Date().toISOString().slice(0,10); // YYYY-MM-DD

    // Seeded RNG (mulberry32)
    function seedFromString(str){
      let h = 2166136261 >>> 0;
      for (let i=0;i<str.length;i++){
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    }
    function mulberry32(a){
      return function(){
        a |= 0; a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      }
    }
    function shuffle(arr, rnd){
      for (let i=arr.length-1;i>0;i--){
        const j = Math.floor(rnd()* (i+1));
        [arr[i],arr[j]] = [arr[j],arr[i]];
      }
      return arr;
    }

    // ---------- Sudoku Engine ----------
    const IDX = (r,c)=> r*9+c;
    const RC = (i)=> [Math.floor(i/9), i%9];

    const ROWS = Array.from({length:9}, (_,r)=> Array.from({length:9},(_,c)=> IDX(r,c)));
    const COLS = Array.from({length:9}, (_,c)=> Array.from({length:9},(_,r)=> IDX(r,c)));
    const BOXES = Array.from({length:9}, (_,b)=> {
      const br = Math.floor(b/3)*3;
      const bc = (b%3)*3;
      const a=[];
      for(let r=0;r<3;r++) for(let c=0;c<3;c++) a.push(IDX(br+r, bc+c));
      return a;
    });

    const PEERS = (()=>{
      const peers = Array.from({length:81}, ()=> new Set());
      for(let i=0;i<81;i++){
        const [r,c]=RC(i);
        const b=Math.floor(r/3)*3 + Math.floor(c/3);
        ROWS[r].forEach(j=>peers[i].add(j));
        COLS[c].forEach(j=>peers[i].add(j));
        BOXES[b].forEach(j=>peers[i].add(j));
        peers[i].delete(i);
      }
      return peers.map(s=>Array.from(s));
    })();

    function candidates(grid, i){
      if (grid[i] !== 0) return [];
      const used = new Set();
      PEERS[i].forEach(p => { if(grid[p]!==0) used.add(grid[p]); });
      const out=[];
      for(let n=1;n<=9;n++) if(!used.has(n)) out.push(n);
      return out;
    }

    function isValidPlacement(grid, i, val){
      if (val===0) return true;
      for (const p of PEERS[i]) if (grid[p]===val) return false;
      return true;
    }

    function findBestCell(grid){
      let best=-1, bestCands=null;
      for(let i=0;i<81;i++){
        if(grid[i]!==0) continue;
        const c = candidates(grid, i);
        if(c.length===0) return {i, c:[]};
        if(best===-1 || c.length < bestCands.length){
          best=i; bestCands=c;
          if(c.length===1) break;
        }
      }
      return {i:best, c:bestCands||[]};
    }

    function solveCount(grid, limit=2){
      // returns number of solutions up to limit
      const g = grid.slice();
      let count=0;
      function backtrack(){
        if(count>=limit) return;
        const {i, c} = findBestCell(g);
        if(i===-1){ count++; return; }
        if(c.length===0) return;
        for(const v of c){
          g[i]=v;
          backtrack();
          g[i]=0;
          if(count>=limit) return;
        }
      }
      backtrack();
      return count;
    }

    function solveOne(grid, rnd){
      // randomized solver to generate full solution
      const g = grid.slice();
      function backtrack(){
        const {i, c} = findBestCell(g);
        if(i===-1) return true;
        if(c.length===0) return false;
        shuffle(c, rnd);
        for(const v of c){
          g[i]=v;
          if(backtrack()) return true;
          g[i]=0;
        }
        return false;
      }
      if(backtrack()) return g;
      return null;
    }

    function generateSolved(seedStr){
      const rnd = mulberry32(seedFromString(seedStr));
      const empty = Array(81).fill(0);
      const solved = solveOne(empty, rnd);
      if(!solved) throw new Error("Failed to generate solution");
      return {solved, rnd};
    }

    function makePuzzleFromSolved(solved, rnd, givensTarget){
      // Remove numbers while keeping uniqueness; start from full and dig holes
      const puzzle = solved.slice();
      const indices = shuffle(Array.from({length:81},(_,i)=>i), rnd);
      let givens = 81;
      for(const i of indices){
        if(givens <= givensTarget) break;
        const keep = puzzle[i];
        puzzle[i]=0;
        const sc = solveCount(puzzle, 2);
        if(sc !== 1){
          puzzle[i]=keep; // revert
        } else {
          givens--;
        }
      }
      return puzzle;
    }

    const DIFF = {
      easy:   { label:"Easy",   givens: 40 },
      medium: { label:"Medium", givens: 34 },
      hard:   { label:"Hard",   givens: 28 },
      expert: { label:"Expert", givens: 24 },
    };

    function buildPuzzle({mode, diff}){
      const key = mode==="daily" ? `daily:${todayKey()}:${diff}` : `classic:${Date.now()}:${Math.random()}:${diff}`;
      const {solved, rnd} = generateSolved(key);
      const givensTarget = DIFF[diff].givens;
      const puzzle = makePuzzleFromSolved(solved, rnd, givensTarget);
      return { id: key, mode, diff, puzzle, solved, createdAt: nowISO() };
    }

    // ---------- State & Persistence ----------
    const LS_GAME = "evening_sudoku_game_v1";
    const LS_STATS = "evening_sudoku_stats_v1";

    const defaultStats = () => ({
      solves: 0,
      streak: 0,
      lastSolveDay: null,
      best: { easy:null, medium:null, hard:null, expert:null },
    });

    function loadStats(){
      try{
        const x = JSON.parse(localStorage.getItem(LS_STATS) || "null");
        return x && x.best ? x : defaultStats();
      }catch{ return defaultStats(); }
    }
    function saveStats(s){ localStorage.setItem(LS_STATS, JSON.stringify(s)); }

    function loadGame(){
      try{
        const x = JSON.parse(localStorage.getItem(LS_GAME) || "null");
        return x && x.puzzle ? x : null;
      }catch{ return null; }
    }
    function saveGame(g){ localStorage.setItem(LS_GAME, JSON.stringify(g)); }
    function clearGame(){ localStorage.removeItem(LS_GAME); }

    // ---------- App State ----------
    let app = {
      mode: "classic", // classic | daily
      diff: "medium",
      strict: true,
      notesMode: false,
      highlight: true,
      mistakes: 0,
      startMs: Date.now(),
      elapsed: 0,
      timer: null,

      // puzzle
      game: null, // {id, mode, diff, puzzle, solved, createdAt}
      grid: Array(81).fill(0),        // current values
      given: Array(81).fill(false),   // fixed
      notes: Array.from({length:81}, ()=> new Set()), // notes per cell
      active: 0,

      // history
      undo: [],
      redo: [],
    };

    function fmtTime(sec){
      const m = Math.floor(sec/60);
      const s = String(sec%60).padStart(2,"0");
      return String(m).padStart(2,"0")+":"+s;
    }

    function setSwitch(id, on){
      const el = $(id);
      el.classList.toggle("on", !!on);
    }

    function openModal(id){
      const el = $(id);
      el.style.display = "block";
    }
    function closeModals(){
      ["aboutModal","statsModal"].forEach(id => { const el=$(id); if(el) el.style.display="none"; });
    }

    function updateStatsUI(){
      const st = loadStats();
      $("stSolves").textContent = String(st.solves);
      $("stStreak").textContent = String(st.streak);
      const best = (v)=> v==null ? "—" : fmtTime(v);
      $("stBestE").textContent = best(st.best.easy);
      $("stBestM").textContent = best(st.best.medium);
      $("stBestH").textContent = best(st.best.hard);
      $("stBestX").textContent = best(st.best.expert);
    }

    function progressCount(){
      let filled=0;
      for(let i=0;i<81;i++) if(app.grid[i]!==0) filled++;
      return filled;
    }

    function setHeader(){
      const m = app.mode==="daily" ? "Daily" : "Classic";
      $("chipMode").textContent = `MODE: ${m.toUpperCase()}`;
      $("title").textContent = `${m} • ${DIFF[app.diff].label}`;
      $("subtitle").textContent = app.mode==="daily"
        ? "Same puzzle for everyone today. Solve clean. Track your streak."
        : "Fresh puzzles on demand. Notes, strict mode, undo/redo, and hints.";
      $("progressChip").textContent = `${progressCount()} / 81`;
      $("mistakeChip").textContent = `Mistakes: ${app.mistakes}`;
    }

    function markBoxEdges(cellEl, r, c){
      if(c===2 || c===5) cellEl.classList.add("boxEdgeRight");
      if(r===2 || r===5) cellEl.classList.add("boxEdgeBottom");
    }

    function renderBoard(){
      const b = $("board");
      b.innerHTML = "";
      b.style.gridTemplateColumns = `repeat(9, var(--cell))`;

      const activeVal = app.grid[app.active];
      const activeRC = RC(app.active);
      const activeBox = Math.floor(activeRC[0]/3)*3 + Math.floor(activeRC[1]/3);

      for(let i=0;i<81;i++){
        const [r,c]=RC(i);
        const el = document.createElement("div");
        el.className = "cell";
        markBoxEdges(el, r, c);

        const v = app.grid[i];
        const isGiven = app.given[i];
        if(isGiven) el.classList.add("given");
        if(i===app.active) el.classList.add("active");

        if(app.highlight){
          // peers
          if(i!==app.active){
            const [ar,ac]=activeRC;
            const box = Math.floor(r/3)*3 + Math.floor(c/3);
            if(r===ar || c===ac || box===activeBox) el.classList.add("peer");
          }
          // same numbers
          if(activeVal!==0 && v===activeVal && i!==app.active) el.classList.add("same");
        }

        // conflicts
        if(v!==0 && !isValidPlacement(app.grid, i, v)){
          el.classList.add("bad");
        }

        if(v!==0){
          el.textContent = String(v);
        } else {
          // notes
          const notes = document.createElement("div");
          notes.className = "notes";
          for(let n=1;n<=9;n++){
            const sp=document.createElement("span");
            if(app.notes[i].has(n)) sp.classList.add("on");
            sp.textContent = String(n);
            notes.appendChild(sp);
          }
          el.appendChild(notes);
        }

        el.addEventListener("click", ()=>{
          app.active = i;
          render();
        });

        b.appendChild(el);
      }
      setHeader();
      syncButtons();
    }

    function syncButtons(){
      $("undoBtn").disabled = app.undo.length===0;
      $("redoBtn").disabled = app.redo.length===0;
      // tools availability
      $("clearBtn").disabled = app.given[app.active];
    }

    function pushHistory(prev){
      app.undo.push(prev);
      if(app.undo.length>200) app.undo.shift();
      app.redo = [];
    }

    function snapshot(){
      return {
        grid: app.grid.slice(),
        notes: app.notes.map(s=>Array.from(s)),
        mistakes: app.mistakes,
        elapsed: app.elapsed,
        active: app.active,
      };
    }
    function restore(snap){
      app.grid = snap.grid.slice();
      app.notes = snap.notes.map(a=> new Set(a));
      app.mistakes = snap.mistakes;
      app.elapsed = snap.elapsed;
      app.active = snap.active;
    }

    function save(){
      const payload = {
        ...app.game,
        state: {
          grid: app.grid,
          given: app.given,
          notes: app.notes.map(s=>Array.from(s)),
          mistakes: app.mistakes,
          elapsed: app.elapsed,
          active: app.active,
          strict: app.strict,
          notesMode: app.notesMode,
          highlight: app.highlight,
        }
      };
      saveGame(payload);
    }

    function loadOrNew(){
      const saved = loadGame();
      if(saved && saved.puzzle && saved.solved && saved.state){
        // daily puzzle: if day changed, discard and regenerate
        const isDaily = saved.mode==="daily";
        if(isDaily){
          const wanted = `daily:${todayKey()}:${saved.diff}`;
          if(saved.id !== wanted){
            clearGame();
          } else {
            app.mode = saved.mode;
            app.diff = saved.diff;
            app.game = { id:saved.id, mode:saved.mode, diff:saved.diff, puzzle:saved.puzzle, solved:saved.solved, createdAt:saved.createdAt };
            app.grid = saved.state.grid.slice();
            app.given = saved.state.given.slice();
            app.notes = saved.state.notes.map(a=> new Set(a));
            app.mistakes = saved.state.mistakes || 0;
            app.elapsed = saved.state.elapsed || 0;
            app.active = saved.state.active ?? 0;
            app.strict = saved.state.strict ?? true;
            app.notesMode = saved.state.notesMode ?? false;
            app.highlight = saved.state.highlight ?? true;
            setSwitch("strictSwitch", app.strict);
            setSwitch("notesSwitch", app.notesMode);
            setSwitch("hlSwitch", app.highlight);
            startTimer();
            return toast("Resumed saved game.");
          }
        } else {
          app.mode = saved.mode;
          app.diff = saved.diff;
          app.game = { id:saved.id, mode:saved.mode, diff:saved.diff, puzzle:saved.puzzle, solved:saved.solved, createdAt:saved.createdAt };
          app.grid = saved.state.grid.slice();
          app.given = saved.state.given.slice();
          app.notes = saved.state.notes.map(a=> new Set(a));
          app.mistakes = saved.state.mistakes || 0;
          app.elapsed = saved.state.elapsed || 0;
          app.active = saved.state.active ?? 0;
          app.strict = saved.state.strict ?? true;
          app.notesMode = saved.state.notesMode ?? false;
          app.highlight = saved.state.highlight ?? true;
          setSwitch("strictSwitch", app.strict);
          setSwitch("notesSwitch", app.notesMode);
          setSwitch("hlSwitch", app.highlight);
          startTimer();
          return toast("Resumed saved game.");
        }
      }
      newGame({mode: app.mode, diff: app.diff}, true);
    }

    function newGame({mode, diff}, silent=false){
      app.mode = mode;
      app.diff = diff;
      app.undo=[]; app.redo=[];
      app.mistakes=0;
      app.elapsed=0;
      app.startMs=Date.now();

      const g = buildPuzzle({mode, diff});
      app.game = g;
      app.grid = g.puzzle.slice();
      app.given = g.puzzle.map(v => v!==0);
      app.notes = Array.from({length:81}, ()=> new Set());
      app.active = app.grid.findIndex(v=>v===0);
      if(app.active<0) app.active = 0;

      setHeader();
      startTimer();
      save();
      render();
      if(!silent) toast("New puzzle ready.");
      window.dispatchEvent(new Event("evening:newgame"));
    }

    function startTimer(){
      clearInterval(app.timer);
      app.startMs = Date.now() - app.elapsed*1000;
      app.timer = setInterval(()=>{
        app.elapsed = Math.floor((Date.now() - app.startMs)/1000);
        $("clock").textContent = fmtTime(app.elapsed);
      }, 250);
      $("clock").textContent = fmtTime(app.elapsed);
    }

    function applyValue(val){
      const i = app.active;
      if(app.given[i]) return;
      const prev = snapshot();

      if(app.notesMode){
        if(val===0) return;
        if(app.notes[i].has(val)) app.notes[i].delete(val);
        else app.notes[i].add(val);
        pushHistory(prev);
        save(); render();
        return;
      }

      if(val===0){
        app.grid[i]=0;
        app.notes[i].clear();
        pushHistory(prev);
        save(); render();
        return;
      }

      // strict check
      if(app.strict && !isValidPlacement(app.grid, i, val)){
        toast("Invalid (strict mode).");
        return;
      }

      app.grid[i]=val;
      app.notes[i].clear();

      // mistake count if invalid placed (non-strict)
      if(!app.strict && !isValidPlacement(app.grid, i, val)){
        app.mistakes++;
      }

      // auto-clear notes in peers
      for(const p of PEERS[i]){
        if(app.notes[p].has(val)) app.notes[p].delete(val);
      }

      pushHistory(prev);
      save(); render();
      checkWin();
    }

    function moveActive(dr, dc){
      let [r,c]=RC(app.active);
      for(let step=0; step<50; step++){
        r=clamp(r+dr,0,8);
        c=clamp(c+dc,0,8);
        const ni = IDX(r,c);
        app.active = ni;
        if(true) break;
      }
      render();
    }

    function checkWin(){
      for(let i=0;i<81;i++){
        if(app.grid[i]===0) return false;
      }
      // validate against solved
      for(let i=0;i<81;i++){
        if(app.grid[i] !== app.game.solved[i]) return false;
      }
      onWin();
      return true;
    }

    function onWin(){
      clearInterval(app.timer);
      toast("Solved! ✨");
      // update stats
      const st = loadStats();
      st.solves += 1;
      // streak: only for daily
      if(app.mode==="daily"){
        const today = todayKey();
        if(st.lastSolveDay === today){
          // already counted today, keep streak
        } else {
          // if last solve was yesterday, +1 else reset to 1
          const d = new Date(today);
          const y = new Date(d.getTime()-86400000).toISOString().slice(0,10);
          st.streak = (st.lastSolveDay === y) ? (st.streak+1) : 1;
          st.lastSolveDay = today;
        }
      } else {
        // classic: keep streak as-is (portfolio preference)
        st.lastSolveDay = st.lastSolveDay;
      }
      // best time
      const cur = app.elapsed;
      const k = app.diff;
      const prev = st.best[k];
      st.best[k] = prev==null ? cur : Math.min(prev, cur);
      saveStats(st);
      updateStatsUI();

      // mark solved and clear saved game (so new session starts fresh)
      clearGame();

      // confetti-lite: flash board background quickly
      document.body.animate([
        { filter:"saturate(1) brightness(1)" },
        { filter:"saturate(1.2) brightness(1.08)" },
        { filter:"saturate(1) brightness(1)" },
      ], { duration: 520, easing:"ease-out" });
    }

    function doUndo(){
      if(app.undo.length===0) return;
      const prev = snapshot();
      const s = app.undo.pop();
      app.redo.push(prev);
      restore(s);
      save(); render();
    }
