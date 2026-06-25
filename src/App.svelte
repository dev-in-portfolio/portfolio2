<script lang="ts">
  import { onMount } from 'svelte';

  const releaseVersion = "repo-pilot-v0.1.9";
  const releasesPage = "https://github.com/dev-in-portfolio/portfolio2/releases";
  
  const downloads = [
    { os: "macOS", label: "Download for macOS", note: "macOS binary tar.gz", href: "https://github.com/dev-in-portfolio/portfolio2/releases/download/repo-pilot-v0.1.9/RepoPilot-macOS.tar.gz" },
    { os: "Windows", label: "Download for Windows", note: "Windows binary zip", href: "https://github.com/dev-in-portfolio/portfolio2/releases/download/repo-pilot-v0.1.9/RepoPilot-Windows-x64.zip" },
    { os: "Linux", label: "Download for Linux", note: "Linux binary tar.gz", href: "https://github.com/dev-in-portfolio/portfolio2/releases/download/repo-pilot-v0.1.9/RepoPilot-Linux-x64.tar.gz" }
  ];

  // Terminal state
  let terminalInput = '';
  let terminalLogs = [
    { type: 'system', text: 'RepoPilot CLI Simulator [Version 0.1.9]' },
    { type: 'system', text: 'Type "/pilot help" to view available audit operations.' },
    { type: 'system', text: 'Ready for connection.' }
  ];
  let terminalConsole: HTMLDivElement;

  // Sandbox state
  let canvasContainer: HTMLDivElement;
  let dragActive = false;
  let activeGithubUrl = '';
  let selectedNodeHud: { name: string; path: string; type: string; size: string } | null = null;
  let is3DActive = false;

  // Three.js instances
  let THREE: any;
  let scene: any;
  let camera: any;
  let renderer: any;
  let animationId: number;
  let nodeObjects: any[] = [];
  let raycaster: any;
  let mouse: any;

  onMount(() => {
    // Dynamically load Three.js from CDN to avoid bundling overhead in dev
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = () => {
      THREE = (window as any).THREE;
      initThreeJS();
    };
    document.head.appendChild(script);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (renderer) renderer.dispose();
    };
  });

  // Auto-scroll terminal
  function scrollTerminal() {
    if (terminalConsole) {
      setTimeout(() => {
        terminalConsole.scrollTop = terminalConsole.scrollHeight;
      }, 50);
    }
  }

  // Handle terminal submit
  function handleTerminalSubmit(e: Event) {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd) return;

    terminalLogs = [...terminalLogs, { type: 'cmd', text: `> ${cmd}` }];
    terminalInput = '';
    scrollTerminal();

    processCommand(cmd);
  }

  function processCommand(cmd: string) {
    const parts = cmd.toLowerCase().split(' ');
    const base = parts[0];

    if (base === 'clear') {
      terminalLogs = [];
      return;
    }

    if (base === '/pilot' && parts[1] === 'help') {
      terminalLogs = [
        ...terminalLogs,
        { type: 'text', text: 'Available commands:' },
        { type: 'text', text: '  /pilot audit  - Run simulated security and telemetry audits.' },
        { type: 'text', text: '  /pilot scan   - Scan codebase file metrics.' },
        { type: 'text', text: '  /pilot trace  - Trace API routes and request flows.' },
        { type: 'text', text: '  clear         - Clear terminal console.' }
      ];
      scrollTerminal();
      return;
    }

    if (base === '/pilot' && parts[1] === 'audit') {
      runSimulatedAudit();
      return;
    }

    if (base === '/pilot' && parts[1] === 'scan') {
      runSimulatedScan();
      return;
    }

    if (base === '/pilot' && parts[1] === 'trace') {
      runSimulatedTrace();
      return;
    }

    terminalLogs = [
      ...terminalLogs,
      { type: 'text', text: `Command not recognized: "${cmd}". Type "/pilot help" for list.` }
    ];
    scrollTerminal();
  }

  // Simulation Routines
  function runSimulatedAudit() {
    const steps = [
      { text: '[Trace] Fetching package lockfiles...', delay: 200 },
      { text: '[Audit] Parsing dependency tree: 486 packages found.', delay: 600 },
      { text: '[Audit] Searching pg-client parameters for injection points...', delay: 1000 },
      { text: '[Audit] Scanning RLS policy declarations: 3 tables secured.', delay: 1400 },
      { text: '[Audit] Status: 0 critical vulnerabilities found.', delay: 1800 },
      { type: 'success', text: '✓ AUDIT PASS: Repository matches safety compliance standards.', delay: 2200 }
    ];

    steps.forEach(step => {
      setTimeout(() => {
        terminalLogs = [...terminalLogs, { type: step.type || 'text', text: step.text }];
        scrollTerminal();
      }, step.delay);
    });
  }

  function runSimulatedScan() {
    const steps = [
      { text: '[Scan] Counting LOC across /src directory...', delay: 200 },
      { text: '[Scan] Found 14 Svelte views (1,480 LOC).', delay: 600 },
      { text: '[Scan] Found 8 Typescript assets (980 LOC).', delay: 1000 },
      { text: '[Scan] Duplicate ratio: 1.2% (Excellent).', delay: 1400 },
      { type: 'success', text: '✓ SCAN COMPLETE: Code quality score is A+.', delay: 1800 }
    ];

    steps.forEach(step => {
      setTimeout(() => {
        terminalLogs = [...terminalLogs, { type: step.type || 'text', text: step.text }];
        scrollTerminal();
      }, step.delay);
    });
  }

  function runSimulatedTrace() {
    const steps = [
      { text: '[Trace] Sniffing connection routes...', delay: 200 },
      { text: '[Trace] API Route GET /api/ledger/entries: OK (200ms)', delay: 600 },
      { text: '[Trace] API Route POST /api/ledger/categories: OK (180ms)', delay: 1000 },
      { text: '[Trace] Websocket connection active on ws://localhost:3013', delay: 1400 },
      { type: 'success', text: '✓ TRACE PASS: API pipelines responding cleanly.', delay: 1800 }
    ];

    steps.forEach(step => {
      setTimeout(() => {
        terminalLogs = [...terminalLogs, { type: step.type || 'text', text: step.text }];
        scrollTerminal();
      }, step.delay);
    });
  }

  // 3D Tree Sandbox logic
  function initThreeJS() {
    if (!canvasContainer || !THREE) return;

    const width = canvasContainer.clientWidth;
    const height = canvasContainer.clientHeight || 380;

    // Create Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040814, 0.03);

    // Create Camera
    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 10, 20);

    // Create Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Clear old canvases
    canvasContainer.innerHTML = '';
    canvasContainer.appendChild(renderer.domElement);
    
    renderer.domElement.className = 'canvas-3d';

    // Add Grid Helper
    const grid = new THREE.GridHelper(40, 40, 0x06b6d4, 0x111827);
    grid.position.y = -5;
    scene.add(grid);

    // Add Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x06b6d4, 1.5, 100);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Event listeners
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    
    // Start loop
    animate();
  }

  function generate3DTree(name: string) {
    if (!THREE) return;
    
    // Clear previous tree objects
    nodeObjects.forEach(obj => scene.remove(obj));
    nodeObjects = [];
    selectedNodeHud = null;
    is3DActive = true;

    // Generate mock hierarchy
    const rootNode = createNodeMesh(0, 0, 0, 1.2, 0x06b6d4, 'root', name, '/');
    scene.add(rootNode);
    nodeObjects.push(rootNode);

    const dirs = ['/src', '/public', '/tests', '/sql'];
    const files = [
      ['App.svelte', '/src/App.svelte', '1.5 KB'],
      ['main.ts', '/src/main.ts', '150 B'],
      ['styles.css', '/src/styles.css', '1.2 KB'],
      ['index.html', '/public/index.html', '5.1 KB'],
      ['dashboard.js', '/public/dashboard.js', '12 KB'],
      ['smoke.test.ts', '/tests/smoke.test.ts', '800 B'],
      ['init.sql', '/sql/init.sql', '4.4 KB']
    ];

    // Create directories
    const dirNodes: any[] = [];
    dirs.forEach((dir, i) => {
      const angle = (i / dirs.length) * Math.PI * 2;
      const r = 6;
      const x = Math.sin(angle) * r;
      const z = Math.cos(angle) * r;
      const y = 2;

      const node = createNodeMesh(x, y, z, 0.75, 0x3b82f6, 'folder', dir.slice(1), dir);
      scene.add(node);
      nodeObjects.push(node);
      dirNodes.push(node);

      // Connect to root
      connectNodes(rootNode.position, node.position);
    });

    // Create files branching out
    files.forEach((file, i) => {
      const parentDirNode = dirNodes[i % dirNodes.length];
      const angle = ((i + 1) / files.length) * Math.PI * 2;
      const r = 3;
      const x = parentDirNode.position.x + Math.sin(angle) * r;
      const z = parentDirNode.position.z + Math.cos(angle) * r;
      const y = parentDirNode.position.y + (Math.sin(i) * 2);

      const node = createNodeMesh(x, y, z, 0.45, 0x10b981, 'file', file[0], file[1], file[2]);
      scene.add(node);
      nodeObjects.push(node);

      // Connect to folder
      connectNodes(parentDirNode.position, node.position);
    });

    // Animate camera entrance
    camera.position.set(0, 8, 16);
  }

  function createNodeMesh(x: number, y: number, z: number, r: number, color: number, type: string, name: string, path: string, size = 'Directory') {
    const geo = new THREE.SphereGeometry(r, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      wireframe: true
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    
    // Attach metadata
    mesh.userData = { type, name, path, size };
    return mesh;
  }

  function connectNodes(pos1: any, pos2: any) {
    const points = [pos1, pos2];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.4 });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    nodeObjects.push(line);
  }

  function onMouseMove(event: MouseEvent) {
    if (!renderer) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function animate() {
    animationId = requestAnimationFrame(animate);

    if (renderer && scene && camera) {
      const time = Date.now() * 0.0004;

      // Slow orbital camera rotation
      if (nodeObjects.length > 0) {
        camera.position.x = Math.sin(time) * 16;
        camera.position.z = Math.cos(time) * 16;
        camera.lookAt(0, 1.5, 0);
      }

      // Check intersections
      if (raycaster && mouse) {
        raycaster.setFromCamera(mouse, camera);
        const meshes = nodeObjects.filter(obj => obj.type === 'Mesh');
        const intersects = raycaster.intersectObjects(meshes);

        if (intersects.length > 0) {
          const hovered = intersects[0].object;
          
          // Animate rotation of hovered node
          hovered.rotation.y += 0.05;
          hovered.rotation.x += 0.02;

          selectedNodeHud = {
            name: hovered.userData.name,
            path: hovered.userData.path,
            type: hovered.userData.type.toUpperCase(),
            size: hovered.userData.size
          };
        }
      }

      renderer.render(scene, camera);
    }
  }

  // Handlers for Sandbox
  function handleDrag(e: DragEvent) {
    e.preventDefault();
    if (e.type === "dragenter" || e.type === "dragover") {
      dragActive = true;
    } else if (e.type === "dragleave") {
      dragActive = false;
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragActive = false;
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      terminalLogs = [...terminalLogs, { type: 'system', text: `[Sandbox] Loaded local archive: ${file.name}` }];
      generate3DTree(file.name);
      scrollTerminal();
    }
  }

  function handleFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      terminalLogs = [...terminalLogs, { type: 'system', text: `[Sandbox] Loaded local archive: ${file.name}` }];
      generate3DTree(file.name);
      scrollTerminal();
    }
  }

  function handleGithubFetch() {
    if (!activeGithubUrl.trim()) return;
    
    // Simulate git cloning/fetching
    let name = activeGithubUrl.replace(/\/$/, '').split('/').pop() || 'Github Repo';
    if (name.includes('.git')) name = name.replace('.git', '');

    terminalLogs = [
      ...terminalLogs,
      { type: 'system', text: `[Sandbox] Cloning Git remote: ${activeGithubUrl}` }
    ];
    scrollTerminal();

    setTimeout(() => {
      terminalLogs = [
        ...terminalLogs,
        { type: 'success', text: `✓ Sandbox remote fetched: successfully cloned "${name}" into memory.` }
      ];
      generate3DTree(name);
      scrollTerminal();
    }, 1200);

    activeGithubUrl = '';
  }
</script>

<div class="page">
  <header class="hero">
    <p class="eyebrow">Desktop App Sandbox</p>
    <h1>RepoPilot</h1>
    <p class="subtitle">Secure local-first code telemetry audits. Upload a folder or query Git to map your codebase structure in real-time.</p>
    <p class="meta">Current release: {releaseVersion} <a class="release-link" href={releasesPage} target="_blank" rel="noopener noreferrer">Browse all releases</a></p>
  </header>

  <div class="split-layout">
    <!-- Left Column (Downloads & Terminal) -->
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <!-- Binary downloads grid -->
      <section class="downloads" aria-label="Downloads">
        {#each downloads as item}
          <article class="download-card">
            <h2>{item.os}</h2>
            <p>{item.note}</p>
            <a class="download-btn" href={item.href} target="_blank" rel="noopener noreferrer">{item.label}</a>
          </article>
        {/each}
      </section>

      <!-- Mock AI Audit Terminal -->
      <section class="mock-terminal">
        <div class="terminal-header">
          <span>Hologram Terminal Console</span>
          <div class="terminal-header-right">
            <div class="terminal-dots">
              <span class="terminal-dot"></span>
              <span class="terminal-dot yellow"></span>
              <span class="terminal-dot green"></span>
            </div>
          </div>
        </div>
        
        <div class="terminal-console" bind:this={terminalConsole}>
          {#each terminalLogs as log}
            <div class="terminal-line {log.type}">
              {log.text}
            </div>
          {/each}
        </div>

        <form class="terminal-input-row" on:submit={handleTerminalSubmit}>
          <span class="terminal-prompt">$</span>
          <input 
            type="text" 
            class="terminal-input" 
            placeholder="Type /pilot help..."
            bind:value={terminalInput}
          />
        </form>
      </section>
    </div>

    <!-- Right Column (3D Visualizer Sandbox) -->
    <section class="sandbox-card">
      <h2>3D Interactive Tree Sandbox</h2>
      <p class="muted" style="font-size: 0.85rem; margin-bottom: 8px;">Upload a codebase ZIP file or input a public GitHub repository URL to render the active structure.</p>

      <div class="sandbox-controls">
        <input 
          type="text" 
          class="input-field" 
          placeholder="GitHub Repo URL (https://github.com/...)" 
          style="flex: 1"
          bind:value={activeGithubUrl}
        />
        <button class="btn" on:click={handleGithubFetch}>Analyze</button>
      </div>

      <div 
        class="canvas-container" 
        bind:this={canvasContainer}
        on:dragenter={handleDrag}
        on:dragover={handleDrag}
        on:dragleave={handleDrag}
        on:drop={handleDrop}
        role="region"
        aria-label="3D Codebase sandbox visualizer and dropzone"
      >
        {#if !is3DActive}
          <div class="canvas-overlay">
            <div class="dropzone">
              <input type="file" id="sandbox-zip-upload" class="hidden-file-input" accept=".zip" on:change={handleFileInput} />
              <label for="sandbox-zip-upload" style="cursor: pointer;">
                <span class="dropzone-icon">📁</span>
                <p>Drag & drop code archive here, or <strong>browse files</strong></p>
              </label>
            </div>
          </div>
        {/if}

        {#if selectedNodeHud}
          <div class="node-info-hud">
            <div>
              <span style="color: var(--cyan); font-weight: 700; text-transform: uppercase;">[{selectedNodeHud.type}]</span>
              <strong style="margin-left: 6px;">{selectedNodeHud.name}</strong>
              <div class="muted" style="font-size: 0.72rem; margin-top: 2px;">{selectedNodeHud.path}</div>
            </div>
            <span style="font-size: 0.75rem; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">{selectedNodeHud.size}</span>
          </div>
        {/if}
      </div>
    </section>
  </div>
</div>
