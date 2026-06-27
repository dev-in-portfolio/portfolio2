import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const ROOTS = [
  {
    root: 'about',
    pages: [
      { label: 'ubr', url: '/apps/ubr/' },
      { label: 'aeon', url: '/apps/aeon/' },
      { label: 'agents', url: '/apps/agents/' }
    ]
  },
  {
    root: 'apps',
    pages: [
      { label: 'ubr', url: '/apps/ubr/' },
      { label: 'aeon', url: '/apps/aeon/' },
      { label: 'agents', url: '/apps/agents/' }
    ]
  },
  {
    root: 'contact',
    pages: [
      { label: 'ubr', url: '/apps/ubr/' },
      { label: 'aeon', url: '/apps/aeon/' },
      { label: 'agents', url: '/apps/agents/' }
    ]
  },
  {
    root: 'home',
    pages: [
      { label: 'ubr', url: '/apps/ubr/' },
      { label: 'aeon', url: '/apps/aeon/' },
      { label: 'agents', url: '/apps/agents/' },
      { label: 'althea', url: '/althea/ubr/' }
    ]
  },
  {
    root: 'capabilities',
    pages: [
      { label: 'ubr', url: '/apps/ubr/' },
      { label: 'aeon', url: '/apps/aeon/' },
      { label: 'agents', url: '/apps/agents/' }
    ]
  },
  {
    root: 'utilities',
    pages: [
      { label: 'ubr', url: '/help/ubr/' },
      { label: 'aeon', url: '/help/aeon/' },
      { label: 'agents', url: '/help/agents/' }
    ]
  }
];

const SHARED_HELPERS = ['nexus-topnav-v2.js', 'loader.js'];

function parseArgs(argv) {
  const out = { roots: null, only: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--roots' && argv[i + 1]) {
      out.roots = new Set(
        argv[i + 1]
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean)
      );
      i += 1;
    } else if (arg === '--only' && argv[i + 1]) {
      out.only = argv[i + 1].trim().toLowerCase();
      i += 1;
    }
  }
  return out;
}

function pageFilePath(rootDir, urlPath) {
  const clean = urlPath.split('?')[0];
  const relative = clean.replace(/^\/+/, '');
  if (clean.endsWith('/')) return path.join(rootDir, relative, 'index.html');
  return path.join(rootDir, relative);
}

function buildTargets({ roots, only }) {
  const targets = [];
  for (const rootCfg of ROOTS) {
    if (roots && !roots.has(rootCfg.root)) continue;
    const rootDir = path.join(REPO_ROOT, rootCfg.root);
    for (const page of rootCfg.pages) {
      const label = `${rootCfg.root}:${page.label}`;
      if (only && !label.includes(only) && !page.url.includes(only)) continue;
      const filePath = pageFilePath(rootDir, page.url);
      if (!fs.existsSync(filePath)) continue;
      targets.push({
        root: rootCfg.root,
        rootDir,
        label,
        url: page.url,
        filePath
      });
    }
  }
  return targets;
}

function hasBackendSupport(rootDir) {
  return (
    fs.existsSync(path.join(rootDir, 'netlify.toml')) &&
    fs.existsSync(path.join(rootDir, 'netlify/functions/appdata.js'))
  );
}

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js':
    case '.mjs': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.webmanifest': return 'application/manifest+json; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.md': return 'text/markdown; charset=utf-8';
    default: return 'application/octet-stream';
  }
}

function writeJson(res, statusCode, body) {
  const text = JSON.stringify(body);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS'
  });
  res.end(text);
}

function normalizeFsPath(rootDir, reqPath) {
  let pathname = decodeURIComponent(reqPath.split('?')[0] || '/');
  if (pathname === '/') pathname = '/index.html';
  const relative = pathname.replace(/^\/+/, '');
  let fullPath = path.join(rootDir, relative);
  if (pathname.endsWith('/')) fullPath = path.join(rootDir, relative, 'index.html');
  if (!path.extname(fullPath) && fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    fullPath = path.join(fullPath, 'index.html');
  }
  return fullPath;
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

async function startRootServer(rootDir, hasBackend) {
  const store = new Map();

  const server = http.createServer(async (req, res) => {
    const reqUrl = new URL(req.url || '/', 'http://127.0.0.1');
    if (reqUrl.pathname === '/api/appdata') {
      if (!hasBackend) {
        writeJson(res, 404, { ok: false, error: 'Not found' });
        return;
      }

      if (req.method === 'OPTIONS') {
        writeJson(res, 200, { ok: true, method: 'OPTIONS' });
        return;
      }

      if (req.method === 'GET') {
        const app = (reqUrl.searchParams.get('app') || '').trim();
        const clientId = (reqUrl.searchParams.get('clientId') || '').trim();
        if (!app || !clientId) {
          writeJson(res, 400, { ok: false, error: 'Missing app/clientId' });
          return;
        }
        const key = `${app}::${clientId}`;
        const payload = store.get(key) || null;
        writeJson(res, 200, {
          ok: true,
          method: 'GET',
          app,
          clientId,
          payload,
          updatedAt: payload ? new Date().toISOString() : null
        });
        return;
      }

      if (req.method === 'POST') {
        const body = await readJsonBody(req);
        if (!body || typeof body !== 'object') {
          writeJson(res, 400, { ok: false, error: 'Invalid JSON body' });
          return;
        }
        const app = String(body.app || '').trim();
        const clientId = String(body.clientId || '').trim();
        const payload = body.payload ?? {};
        if (!app || !clientId) {
          writeJson(res, 400, { ok: false, error: 'Missing app/clientId' });
          return;
        }
        store.set(`${app}::${clientId}`, payload);
        writeJson(res, 200, {
          ok: true,
          method: 'POST',
          app,
          clientId,
          payload,
          updatedAt: new Date().toISOString()
        });
        return;
      }

      writeJson(res, 405, { ok: false, error: 'Method not allowed', method: req.method });
      return;
    }

    const fullPath = normalizeFsPath(rootDir, reqUrl.pathname);
    const relative = path.relative(rootDir, fullPath);
    if (
      !relative ||
      relative.startsWith('..') ||
      path.isAbsolute(relative) ||
      !fs.existsSync(fullPath) ||
      !fs.statSync(fullPath).isFile()
    ) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, { 'content-type': mimeType(fullPath) });
    fs.createReadStream(fullPath).pipe(res);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return { server, baseUrl };
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function htmlRefs(htmlText) {
  const refs = [];
  const attrRe = /\b(?:src|href)=["']([^"'#]+)["']/gi;
  let match = attrRe.exec(htmlText);
  while (match) {
    refs.push(match[1]);
    match = attrRe.exec(htmlText);
  }
  return refs;
}

function localPathFromRef(ref, baseUrl, pageUrl) {
  try {
    const url = new URL(ref, `${baseUrl}${pageUrl}`);
    if (url.origin !== baseUrl) return null;
    return url.pathname;
  } catch (_error) {
    return null;
  }
}

function makeLeafletStub() {
  return `
    (() => {
      const noop = () => {};
      const chain = () => ({
        addTo(){ return this; },
        bindPopup(){ return this; },
        openPopup(){ return this; },
        setLatLngs(){ return this; },
        setView(){ return this; },
        fitBounds(){ return this; },
        invalidateSize(){ return this; },
        clearLayers(){ return this; },
        addLayer(){ return this; },
        removeLayer(){ return this; },
        on(){ return this; },
        off(){ return this; },
        eachLayer(){ return this; },
        remove(){ return this; },
        getBounds(){ return { isValid(){ return false; } }; }
      });
      window.L = {
        map(){ return chain(); },
        tileLayer(){ return chain(); },
        marker(){ return chain(); },
        polyline(){ return chain(); },
        layerGroup(){ return chain(); },
        featureGroup(){ return chain(); },
        icon(){ return {}; },
        latLngBounds(){ return { extend: noop, isValid(){ return false; } }; }
      };
    })();
  `;
}

function externalStub(url) {
  if (/tailwindcss\.com/.test(url)) {
    return { status: 200, contentType: 'application/javascript', body: 'window.tailwind = window.tailwind || {};'}; 
  }
  if (/cropper/i.test(url)) {
    if (/\.css($|\?)/i.test(url)) return { status: 200, contentType: 'text/css', body: '' };
    return { status: 200, contentType: 'application/javascript', body: 'window.Cropper = window.Cropper || function Cropper(){ return {}; };' };
  }
  if (/tesseract/i.test(url)) {
    return {
      status: 200,
      contentType: 'application/javascript',
      body: `
        window.Tesseract = {
          createWorker: async () => ({
            loadLanguage: async () => {},
            initialize: async () => {},
            recognize: async () => ({ data: { text: '' } }),
            terminate: async () => {}
          })
        };
      `
    };
  }
  if (/leaflet/i.test(url)) {
    if (/\.css($|\?)/i.test(url)) return { status: 200, contentType: 'text/css', body: '' };
    return { status: 200, contentType: 'application/javascript', body: makeLeafletStub() };
  }
  if (/\.css($|\?)/i.test(url)) return { status: 200, contentType: 'text/css', body: '' };
  if (/\.js($|\?)/i.test(url)) return { status: 200, contentType: 'application/javascript', body: '' };
  return { status: 204, contentType: 'text/plain', body: '' };
}

function isSameOrigin(url, baseUrl) {
  try {
    return new URL(url).origin === baseUrl;
  } catch (_error) {
    return false;
  }
}

async function requestStatus(url) {
  const response = await fetch(url, { redirect: 'manual' });
  return {
    status: response.status,
    contentType: response.headers.get('content-type') || '',
    body: await response.text()
  };
}

function shortPath(fullUrl) {
  try {
    const url = new URL(fullUrl);
    return `${url.pathname}${url.search}`;
  } catch (_error) {
    return fullUrl;
  }
}

function rootAssetRefs(rootDir, refs, baseUrl, pageUrl) {
  const findings = [];
  const hasManifestFile = fs.existsSync(path.join(rootDir, 'manifest.webmanifest'));
  const hasRuntimeGuardFile = fs.existsSync(path.join(rootDir, 'runtime-guard.js'));
  const hasIcon192File = fs.existsSync(path.join(rootDir, 'icon-192.png'));
  const hasIcon512File = fs.existsSync(path.join(rootDir, 'icon-512.png'));

  const manifestRefs = refs.filter((ref) => /manifest\.webmanifest(?:$|\?)/.test(ref));
  const runtimeRefs = refs.filter((ref) => /runtime-guard\.js(?:$|\?)/.test(ref));
  const iconRefs = refs.filter((ref) => /icon-(?:192|512)\.png(?:$|\?)/.test(ref));

  if (hasManifestFile && manifestRefs.length === 0) findings.push('missing-ref:manifest.webmanifest');
  if (hasRuntimeGuardFile && runtimeRefs.length === 0) findings.push('missing-ref:runtime-guard.js');
  if ((hasIcon192File || hasIcon512File) && iconRefs.length === 0) findings.push('missing-ref:icon');

  const checked = [];
  for (const ref of [...manifestRefs, ...runtimeRefs, ...iconRefs]) {
    const localPath = localPathFromRef(ref, baseUrl, pageUrl);
    if (!localPath) continue;
    checked.push(localPath);
  }

  return { findings, checked };
}

async function inspectPage(target, baseUrl, browser, hasBackend) {
  const htmlText = fs.readFileSync(target.filePath, 'utf8');
  const refs = htmlRefs(htmlText);

  const helperChecks = [];
  for (const helper of SHARED_HELPERS) {
    const helperRef = refs.find((ref) => ref.includes(helper));
    if (!helperRef) continue;
    const helperPath = localPathFromRef(helperRef, baseUrl, target.url);
    if (!helperPath) continue;
    const helperRes = await requestStatus(`${baseUrl}${helperPath}`);
    helperChecks.push({
      helper,
      path: helperPath,
      ok: helperRes.status === 200,
      status: helperRes.status
    });
  }

  const rootAssets = rootAssetRefs(target.rootDir, refs, baseUrl, target.url);
  const rootAssetChecks = [];
  for (const assetPath of rootAssets.checked) {
    const assetRes = await requestStatus(`${baseUrl}${assetPath}`);
    rootAssetChecks.push({
      path: assetPath,
      ok: assetRes.status === 200,
      status: assetRes.status
    });
  }

  const page = await browser.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const badResponses = [];
  const requestFailures = [];

  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (isSameOrigin(url, baseUrl)) {
      await route.continue();
      return;
    }
    const stub = externalStub(url);
    await route.fulfill({
      status: stub.status,
      contentType: stub.contentType,
      body: stub.body
    });
  });

  page.on('pageerror', (error) => {
    pageErrors.push(String(error));
  });

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    consoleErrors.push(msg.text());
  });

  page.on('requestfailed', (req) => {
    const url = req.url();
    if (!isSameOrigin(url, baseUrl)) return;
    requestFailures.push({
      url: shortPath(url),
      errorText: req.failure()?.errorText || 'unknown'
    });
  });

  page.on('response', (res) => {
    const url = res.url();
    if (!isSameOrigin(url, baseUrl)) return;
    if (res.status() < 400) return;
    const pathname = shortPath(url);
    if (!hasBackend && pathname.startsWith('/api/appdata')) return;
    badResponses.push({ url: pathname, status: res.status() });
  });

  let navigationStatus = 0;
  let navigationError = null;
  try {
    const response = await page.goto(`${baseUrl}${target.url}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    navigationStatus = response?.status() || 0;
    await page.waitForTimeout(900);
  } catch (error) {
    navigationError = String(error);
  }

  await page.close();

  const failures = [];
  for (const helper of helperChecks) {
    if (!helper.ok) failures.push(`helper:${helper.helper}:${helper.status}`);
  }
  for (const finding of rootAssets.findings) failures.push(`asset:${finding}`);
  for (const asset of rootAssetChecks) {
    if (!asset.ok) failures.push(`asset:${asset.path}:${asset.status}`);
  }
  if (navigationError) failures.push(`page:navigation:${navigationError}`);
  if (navigationStatus >= 400 || navigationStatus === 0) failures.push(`page:status:${navigationStatus || 'error'}`);
  for (const item of pageErrors) failures.push(`pageerror:${item}`);
  for (const item of consoleErrors) failures.push(`console:${item}`);
  for (const item of requestFailures) failures.push(`requestfailed:${item.url}:${item.errorText}`);
  for (const item of badResponses) failures.push(`response:${item.url}:${item.status}`);

  return {
    label: target.label,
    root: target.root,
    url: target.url,
    ok: failures.length === 0,
    failures,
    helperChecks,
    rootAssetChecks,
    rootAssetFindings: rootAssets.findings
  };
}

async function inspectAppData(root, baseUrl, hasBackend) {
  const optionsRes = await fetch(`${baseUrl}/api/appdata`, { method: 'OPTIONS' });
  if (!hasBackend) {
    return {
      root,
      ok: optionsRes.status === 404,
      details: [`OPTIONS:${optionsRes.status}`]
    };
  }

  const getMissingRes = await fetch(`${baseUrl}/api/appdata`, { method: 'GET' });
  const postRes = await fetch(`${baseUrl}/api/appdata`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      app: 'surface-smoke',
      clientId: 'smoke-client',
      payload: { check: true, root }
    })
  });
  const postBody = await postRes.json().catch(() => null);

  const ok =
    optionsRes.status === 200 &&
    getMissingRes.status === 400 &&
    postRes.status === 200 &&
    postBody &&
    postBody.ok === true;

  return {
    root,
    ok,
    details: [
      `OPTIONS:${optionsRes.status}`,
      `GET-missing:${getMissingRes.status}`,
      `POST-valid:${postRes.status}`
    ]
  };
}

function formatCheck(result) {
  const status = result.ok ? 'PASS' : 'FAIL';
  const detail = result.failures.length ? ` :: ${result.failures.join(' | ')}` : '';
  return `${status} ${result.label} ${result.url}${detail}`;
}

function formatApi(result) {
  const status = result.ok ? 'PASS' : 'FAIL';
  return `${status} api:${result.root} :: ${result.details.join(' | ')}`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const targets = buildTargets(options);
  if (!targets.length) {
    console.error('No matching surface targets found.');
    process.exitCode = 2;
    return;
  }

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    serviceWorkers: 'block'
  });

  const grouped = new Map();
  for (const target of targets) {
    if (!grouped.has(target.root)) grouped.set(target.root, []);
    grouped.get(target.root).push(target);
  }

  const pageResults = [];
  const apiResults = [];

  for (const [root, rootTargets] of grouped.entries()) {
    const rootDir = path.join(REPO_ROOT, root);
    const backend = hasBackendSupport(rootDir);
    const { server, baseUrl } = await startRootServer(rootDir, backend);
    try {
      for (const target of rootTargets) {
        pageResults.push(await inspectPage(target, baseUrl, context, backend));
      }
      apiResults.push(await inspectAppData(root, baseUrl, backend));
    } finally {
      await closeServer(server);
    }
  }

  await context.close();
  await browser.close();

  const allFailures = pageResults.filter((result) => !result.ok).length;
  const apiFailures = apiResults.filter((result) => !result.ok).length;

  console.log('Surface Smoke Summary');
  console.log('=====================');
  for (const result of pageResults) console.log(formatCheck(result));
  console.log('---------------------');
  for (const result of apiResults) console.log(formatApi(result));
  console.log('---------------------');
  console.log(`Pages: ${pageResults.length}, failed: ${allFailures}`);
  console.log(`API checks: ${apiResults.length}, failed: ${apiFailures}`);

  if (allFailures || apiFailures) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 2;
});
