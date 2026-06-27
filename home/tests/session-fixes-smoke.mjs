import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const TARGET_GROUPS = [
  {
    name: 'helper-paths',
    root: 'home',
    pages: [
      {
        label: 'home-about',
        url: '/about/',
        blocked404s: ['/about/shared/nexus-topnav-v2.js']
      },
      {
        label: 'home-404',
        url: '/404.html',
        blocked404s: ['/404/shared/nexus-topnav-v2.js']
      },
      {
        label: 'home-althea-root',
        url: '/althea/',
        blocked404s: [
          '/althea/shared/nexus-topnav-v2.js',
          '/althea/shared/loader.js'
        ]
      },
      {
        label: 'home-althea-ubr',
        url: '/althea/ubr/',
        blocked404s: [
          '/althea/shared/nexus-topnav-v2.js',
          '/althea/shared/loader.js'
        ],
        forbiddenMessages: ['Unexpected token ,', 'SyntaxError: Unexpected token']
      },
      {
        label: 'home-althea-alibi',
        url: '/althea/alibi/',
        blocked404s: [
          '/althea/shared/nexus-topnav-v2.js',
          '/althea/shared/loader.js'
        ],
        forbiddenMessages: ['Unexpected token ,', 'SyntaxError: Unexpected token']
      },
      {
        label: 'home-althea-coverage-compass',
        url: '/althea/coverage-compass/',
        blocked404s: [
          '/althea/shared/nexus-topnav-v2.js',
          '/althea/shared/loader.js'
        ],
        forbiddenMessages: ['Unexpected token ,', 'SyntaxError: Unexpected token']
      }
    ]
  },
  {
    name: 'apps-runtime',
    root: 'apps',
    pages: [
      {
        label: 'apps-aeon',
        url: '/apps/aeon/',
        forbiddenMessages: [
          'ReferenceError: global is not defined',
          'await is only valid in async functions',
          'Cannot use import statement outside a module'
        ]
      },
      {
        label: 'apps-aeon-canvas',
        url: '/apps/aeon/canvas.html',
        forbiddenMessages: [
          'ReferenceError: global is not defined',
          'await is only valid in async functions',
          'Cannot use import statement outside a module'
        ]
      },
      {
        label: 'apps-alibi',
        url: '/apps/alibi/',
        forbiddenMessages: ['ReferenceError: exportZIP is not defined']
      }
    ]
  },
  {
    name: 'about-agents-helper',
    root: 'about',
    pages: [
      {
        label: 'about-agents-overview',
        url: '/apps/agents/overview.html',
        blocked404s: ['/apps/shared/nexus-topnav-v2.js']
      }
    ]
  }
];

const TOOLS_SHELLS = [
  {
    label: 'about-tools',
    path: path.join(REPO_ROOT, 'about/tools/index.html'),
    expectedText: 'external docs site only',
    requiredCategories: ['/help/', '/readme/', '/case-reports/'],
    externalHost: 'https://dev-in-portfolio-home.netlify.app'
  },
  {
    label: 'apps-tools',
    path: path.join(REPO_ROOT, 'apps/tools/index.html'),
    expectedText: 'external docs site only',
    requiredCategories: ['/help/', '/readme/', '/case-reports/'],
    externalHost: 'https://dev-in-portfolio-home.netlify.app'
  },
  {
    label: 'contact-tools',
    path: path.join(REPO_ROOT, 'contact/tools/index.html'),
    expectedText: 'external docs site only',
    requiredCategories: ['/help/', '/readme/', '/case-reports/'],
    externalHost: 'https://dev-in-portfolio-home.netlify.app'
  },
  {
    label: 'home-tools',
    path: path.join(REPO_ROOT, 'home/tools/index.html'),
    expectedText: 'local docs surface',
    localPrefixes: ['../help/', '../readme/', '../case-reports/']
  }
];

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js':
    case '.mjs': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.json': return 'application/json; charset=utf-8';
    default: return 'application/octet-stream';
  }
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

async function startServer(rootDir) {
  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url || '/', 'http://127.0.0.1');
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
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
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
    return { status: 200, contentType: 'application/javascript', body: 'window.tailwind = window.tailwind || {};' };
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

function shortPath(fullUrl) {
  try {
    const url = new URL(fullUrl);
    return `${url.pathname}${url.search}`;
  } catch (_error) {
    return fullUrl;
  }
}

async function runPageCheck(context, baseUrl, pageConfig) {
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const helper404s = [];
  const blocked404s = [];

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
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  page.on('response', (res) => {
    if (!isSameOrigin(res.url(), baseUrl)) return;
    if (res.status() !== 404) return;
    const pathname = shortPath(res.url());
    if (/nexus-topnav-v2\.js|loader\.js/.test(pathname)) helper404s.push(pathname);
    if ((pageConfig.blocked404s || []).includes(pathname)) blocked404s.push(pathname);
  });

  let status = 0;
  let navigationError = null;
  try {
    const response = await page.goto(`${baseUrl}${pageConfig.url}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    status = response?.status() || 0;
    await page.waitForTimeout(900);
  } catch (error) {
    navigationError = String(error);
  }

  await page.close();

  const failures = [];
  if (navigationError) failures.push(`navigation:${navigationError}`);
  if (!status || status >= 400) failures.push(`status:${status || 'error'}`);
  if (helper404s.length) failures.push(`helper404:${helper404s.join(',')}`);
  if (blocked404s.length) failures.push(`blocked404:${blocked404s.join(',')}`);

  for (const entry of [...pageErrors, ...consoleErrors]) {
    const forbidden = (pageConfig.forbiddenMessages || []).find((needle) => entry.includes(needle));
    if (forbidden) failures.push(`runtime:${forbidden}`);
  }

  return {
    label: pageConfig.label,
    url: pageConfig.url,
    ok: failures.length === 0,
    failures
  };
}

function extractHrefs(html) {
  const hrefs = [];
  const hrefRe = /\bhref=["']([^"'#]+)["']/gi;
  let match = hrefRe.exec(html);
  while (match) {
    hrefs.push(match[1]);
    match = hrefRe.exec(html);
  }
  return hrefs;
}

function runShellCheck(shell) {
  const html = fs.readFileSync(shell.path, 'utf8');
  const hrefs = extractHrefs(html);
  const failures = [];

  if (!html.includes(shell.expectedText)) {
    failures.push(`missing-text:${shell.expectedText}`);
  }

  for (const prefix of shell.localPrefixes || []) {
    if (!hrefs.some((href) => href.startsWith(prefix))) {
      failures.push(`missing-link-prefix:${prefix}`);
    }
  }

  if (shell.externalHost) {
    for (const category of shell.requiredCategories || []) {
      const categoryLinks = hrefs.filter((href) => href.includes(category));
      if (!categoryLinks.length) failures.push(`missing-category:${category}`);
    }

    const nonExternal = hrefs.filter((href) => {
      return (
        href.startsWith('/help/') ||
        href.startsWith('/readme/') ||
        href.startsWith('/case-reports/')
      );
    });
    if (nonExternal.length) failures.push(`unexpected-local-doc-link:${nonExternal[0]}`);

    const externalDocs = hrefs.filter((href) => href.includes('/help/') || href.includes('/readme/') || href.includes('/case-reports/'));
    const wrongHost = externalDocs.find((href) => !href.startsWith(shell.externalHost));
    if (wrongHost) failures.push(`unexpected-external-host:${wrongHost}`);
  }

  return {
    label: shell.label,
    ok: failures.length === 0,
    failures
  };
}

function printResult(kind, result) {
  const status = result.ok ? 'PASS' : 'FAIL';
  const suffix = result.failures.length ? ` :: ${result.failures.join(' | ')}` : '';
  console.log(`${status} ${kind} ${result.label}${result.url ? ` ${result.url}` : ''}${suffix}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    serviceWorkers: 'block'
  });

  const pageResults = [];
  for (const group of TARGET_GROUPS) {
    const rootDir = path.join(REPO_ROOT, group.root);
    const { server, baseUrl } = await startServer(rootDir);
    try {
      for (const pageConfig of group.pages) {
        pageResults.push(await runPageCheck(context, baseUrl, pageConfig));
      }
    } finally {
      await closeServer(server);
    }
  }

  await context.close();
  await browser.close();

  const shellResults = TOOLS_SHELLS.map(runShellCheck);
  const failures = [...pageResults, ...shellResults].filter((item) => !item.ok);

  console.log('Session Fixes Smoke');
  console.log('===================');
  for (const result of pageResults) printResult('page', result);
  console.log('-------------------');
  for (const result of shellResults) printResult('shell', result);
  console.log('-------------------');
  console.log(`Checked: ${pageResults.length + shellResults.length}`);
  console.log(`Failed: ${failures.length}`);

  if (failures.length) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 2;
});
