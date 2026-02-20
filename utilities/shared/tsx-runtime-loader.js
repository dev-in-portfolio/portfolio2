// Runtime TS/TSX loader for static hosting (Netlify/GitHub Pages/etc.)
//
// Problem this solves:
// - Many apps point index.html at `./index.tsx`.
// - Browsers cannot execute TSX/TypeScript directly.
// - Result: app "loads" but renders blank + throws a syntax error.
//
// Solution:
// - Use esbuild-wasm in the browser to transpile + bundle the TS/TSX entry.
// - Execute the bundled output via dynamic import (Blob URL).
//
// How to use in an app's index.html:
//   <script type="module" src="../../shared/tsx-runtime-loader.js" data-entry="./index.tsx"></script>
//
// Notes:
// - This is a production practicality hack to avoid build steps when you're
//   upload-limited. It's heavier than a real Vite build, but it *works now*.
// - External deps are expected to be provided by your existing importmap.

// Use a widely-available esbuild-wasm version and multiple CDNs for resilience.
// Some networks block unpkg; jsDelivr often works when unpkg doesn't.
const ESBUILD_VERSION = '0.20.2';
const ESBUILD_MODULE_URLS = [
  `https://cdn.jsdelivr.net/npm/esbuild-wasm@${ESBUILD_VERSION}/esm/browser.min.js`,
  `https://unpkg.com/esbuild-wasm@${ESBUILD_VERSION}/esm/browser.min.js`,
];
const ESBUILD_WASM_URLS = [
  `https://cdn.jsdelivr.net/npm/esbuild-wasm@${ESBUILD_VERSION}/esbuild.wasm`,
  `https://unpkg.com/esbuild-wasm@${ESBUILD_VERSION}/esbuild.wasm`,
];

function showOverlay(msg) {
  try {
    let box = document.getElementById('__tsx_loader_overlay');
    if (!box) {
      box = document.createElement('div');
      box.id = '__tsx_loader_overlay';
      box.style.position = 'fixed';
      box.style.left = '12px';
      box.style.right = '12px';
      box.style.bottom = '12px';
      box.style.zIndex = '999999';
      box.style.padding = '12px 14px';
      box.style.borderRadius = '12px';
      box.style.background = 'rgba(0,0,0,0.78)';
      box.style.color = '#fff';
      box.style.font = '12px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
      box.style.boxShadow = '0 8px 30px rgba(0,0,0,0.45)';
      document.body.appendChild(box);
    }
    box.textContent = msg;
  } catch {
    /* ignore */
  }
}

async function importFromAny(urls) {
  let lastErr;
  for (const u of urls) {
    try {
      return await import(u);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Failed to import module from all CDNs');
}

/** @param {string} entry */
function getEntryUrl(entry) {
  // data-entry is relative to the current document URL
  return new URL(entry, window.location.href).toString();
}

/** @param {string} fromUrl */
function dirnameUrl(fromUrl) {
  const u = new URL(fromUrl);
  u.pathname = u.pathname.replace(/\/[^\/]*$/, '/');
  u.search = '';
  u.hash = '';
  return u.toString();
}

/**
 * esbuild plugin that loads relative imports via fetch.
 * @param {string} entryUrl
 */
function fetchPlugin(entryUrl) {
  const entryDir = dirnameUrl(entryUrl);
  return {
    name: 'fetch-plugin',
    setup(build) {
      // Resolve relative imports
      build.onResolve({ filter: /^\.{1,2}\// }, (args) => {
        const importer = args.importer || entryUrl;
        const resolved = new URL(args.path, dirnameUrl(importer)).toString();
        return { path: resolved, namespace: 'http-url' };
      });

      // Resolve absolute-ish root paths ("/shared/x") relative to origin
      build.onResolve({ filter: /^\// }, (args) => {
        const resolved = new URL(args.path, window.location.origin).toString();
        return { path: resolved, namespace: 'http-url' };
      });

      // Everything else (react, react-dom/client, @google/genai, lucide-react, etc.)
      // should be provided by importmap/CDN; mark as external.
      build.onResolve({ filter: /.*/ }, (args) => {
        if (args.path.startsWith('http://') || args.path.startsWith('https://')) {
          return { path: args.path, namespace: 'http-url' };
        }
        return { path: args.path, external: true };
      });

      build.onLoad({ filter: /.*/, namespace: 'http-url' }, async (args) => {
        const res = await fetch(args.path, { cache: 'no-cache' });
        if (!res.ok) {
          throw new Error(`Failed to fetch ${args.path} (${res.status})`);
        }
        const contents = await res.text();

        // Basic loader detection by extension
        const lower = args.path.toLowerCase();
        let loader = 'js';
        if (lower.endsWith('.tsx')) loader = 'tsx';
        else if (lower.endsWith('.ts')) loader = 'ts';
        else if (lower.endsWith('.jsx')) loader = 'jsx';
        else if (lower.endsWith('.css')) loader = 'css';
        else if (lower.endsWith('.json')) loader = 'json';

        // IMPORTANT: resolveDir must be the directory of the *current* loaded file.
        // If it is always the entry directory, relative imports inside nested modules
        // can resolve incorrectly and cause blank-screen failures.
        return { contents, loader, resolveDir: dirnameUrl(args.path) };
      });
    },
  };
}

async function main() {
  // In module scripts, `document.currentScript` can be null in some browsers.
  // So we support multiple robust ways to determine the TSX entry.
  // Priority:
  //  1) data-entry on the current script (when available)
  //  2) data-entry on a matching script tag in the document
  //  3) query param `?entry=...` on the loader script URL
  //  4) global `window.__TSX_ENTRY`
  const current = /** @type {HTMLScriptElement|null} */ (document.currentScript);
  const fromCurrent = current?.dataset?.entry;
  const fromDom = (() => {
    const scripts = Array.from(document.querySelectorAll('script[type="module"][src]'));
    const mine = scripts.find((s) => (s.getAttribute('src') || '').includes('tsx-runtime-loader.js'));
    return /** @type {HTMLScriptElement|undefined} */ (mine)?.dataset?.entry;
  })();
  const fromQuery = (() => {
    try {
      const u = new URL(import.meta.url);
      return u.searchParams.get('entry') || undefined;
    } catch {
      return undefined;
    }
  })();
  const fromGlobal = /** @type {any} */ (window).__TSX_ENTRY;

  const entry = fromCurrent || fromDom || fromQuery || fromGlobal;
  if (!entry) {
    console.error('[tsx-runtime-loader] Missing entry (data-entry, ?entry=, or window.__TSX_ENTRY)');
    return;
  }

  const entryUrl = getEntryUrl(entry);

  showOverlay(`[tsx-loader] Loading compiler…`);

  // Load esbuild runtime
  const esbuild = await importFromAny(ESBUILD_MODULE_URLS);
  if (!window.__esbuildWasmInitialized) {
    let initErr;
    for (const wasmURL of ESBUILD_WASM_URLS) {
      try {
        await esbuild.initialize({ wasmURL });
        window.__esbuildWasmInitialized = true;
        initErr = null;
        break;
      } catch (e) {
        initErr = e;
      }
    }
    if (initErr) throw initErr;
  }

  showOverlay(`[tsx-loader] Bundling ${entry}…`);

  // Bundle entry
  const result = await esbuild.build({
    entryPoints: [entryUrl],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2020'],
    sourcemap: 'inline',
    write: false,
    plugins: [fetchPlugin(entryUrl)],
    // Keep React + other deps external (provided by importmap/CDN)
    external: [
      'react',
      'react-dom',
      'react-dom/client',
      '@google/genai',
      'lucide-react',
    ],
  });

  const js = result.outputFiles?.[0]?.text;
  if (!js) {
    console.error('[tsx-runtime-loader] Build produced no output');
    return;
  }

  const blob = new Blob([js], { type: 'text/javascript' });
  const blobUrl = URL.createObjectURL(blob);
  try {
    showOverlay(`[tsx-loader] Executing bundle…`);
    await import(blobUrl);
    showOverlay(`[tsx-loader] Done ✅`);
    // hide after a moment
    setTimeout(() => {
      const box = document.getElementById('__tsx_loader_overlay');
      if (box) box.remove();
    }, 800);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

main().catch((err) => {
  console.error('[tsx-runtime-loader] Fatal error:', err);
  showOverlay(`[tsx-loader] FAILED ❌  (see error box)`);
  const pre = document.createElement('pre');
  pre.style.whiteSpace = 'pre-wrap';
  pre.style.padding = '16px';
  pre.style.background = 'rgba(0,0,0,0.85)';
  pre.style.color = '#fff';
  pre.style.borderRadius = '12px';
  pre.style.margin = '16px';
  pre.textContent = `TSX loader failed:\n\n${String(err?.stack || err)}`;
  document.body.appendChild(pre);
});
