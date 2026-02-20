import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ROOT = process.env.ROOT_DIR || '/mnt/data/v31F_work';
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173';

function walkHtmlFiles(dir) {
  const out = [];
  const stack = [dir];

  while (stack.length) {
    const cur = stack.pop();
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.name.startsWith('.')) continue;
      const full = path.join(cur, ent.name);
      if (ent.isDirectory()) {
        // Skip known non-site folders if present
        if (ent.name === 'node_modules') continue;
        stack.push(full);
      } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.html')) {
        out.push(full);
      }
    }
  }

  return out;
}

function toUrl(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  // Root index
  if (rel === 'index.html') return '/';

  // Directory indexes
  if (rel.endsWith('/index.html')) {
    const dir = rel.slice(0, -'/index.html'.length);
    return `/${dir}/`;
  }

  return `/${rel}`;
}

function isProbablyAppShell(urlPath) {
  // Skip internal template-only or test pages if desired
  return true;
}

function summarizeFailures(failures) {
  const byUrl = new Map();
  for (const f of failures) {
    if (!byUrl.has(f.url)) byUrl.set(f.url, []);
    byUrl.get(f.url).push(f);
  }
  return byUrl;
}

(async () => {
  const htmlFiles = walkHtmlFiles(ROOT)
    // Keep only project pages; exclude any old backups if they exist.
    .filter(fp => !fp.includes('/__MACOSX/'));

  // Stable ordering for diffing.
  htmlFiles.sort();

  const urls = htmlFiles.map(toUrl).filter(isProbablyAppShell);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    javaScriptEnabled: true
  });

  const results = [];

  for (const urlPath of urls) {
    const fullUrl = `${BASE_URL}${urlPath}`;
    const page = await ctx.newPage();

    const errors = [];
    const warnings = [];
    const pageErrors = [];
    const requestFailures = [];
    const badResponses = [];

    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') errors.push(text);
      else if (type === 'warning') warnings.push(text);
    });

    page.on('pageerror', (err) => {
      pageErrors.push(String(err));
    });

    page.on('requestfailed', (req) => {
      const failure = req.failure();
      requestFailures.push({
        url: req.url(),
        method: req.method(),
        errorText: failure?.errorText || 'unknown'
      });
    });

    page.on('response', (res) => {
      const status = res.status();
      if (status >= 400) {
        badResponses.push({ url: res.url(), status });
      }
    });

    let ok = true;
    let status = 0;
    let finalUrl = fullUrl;

    try {
      const resp = await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      status = resp?.status() || 0;
      finalUrl = page.url();

      // Give apps a moment for deferred module loads.
      await page.waitForTimeout(900);

      // Try a small interaction to catch pointer handlers errors
      await page.mouse.move(200, 200);
      await page.waitForTimeout(100);
    } catch (e) {
      ok = false;
      pageErrors.push(`NavigationError: ${String(e)}`);
    }

    // If main doc failed, mark it
    if (status >= 400 || status === 0) ok = false;
    if (errors.length || pageErrors.length || requestFailures.length) {
      // console warnings are not fatal; keep separate
      ok = ok && errors.length === 0 && pageErrors.length === 0 && requestFailures.length === 0;
    }

    results.push({
      url: urlPath,
      fullUrl,
      finalUrl,
      status,
      ok,
      errors,
      warnings,
      pageErrors,
      requestFailures,
      badResponses
    });

    await page.close();
  }

  await browser.close();

  const outPath = path.join(ROOT, 'tests', 'runtime-sweep-report.json');
  fs.writeFileSync(outPath, JSON.stringify({ baseUrl: BASE_URL, scanned: results.length, results }, null, 2));

  const failing = results.filter(r => !r.ok);
  console.log(`Scanned: ${results.length}`);
  console.log(`Failing: ${failing.length}`);

  // Print a brief summary
  for (const r of failing.slice(0, 60)) {
    console.log(`\n--- ${r.url} (${r.status})`);
    if (r.pageErrors.length) console.log('pageErrors:', r.pageErrors[0]);
    if (r.errors.length) console.log('consoleErrors:', r.errors[0]);
    if (r.requestFailures.length) console.log('requestFailed:', r.requestFailures[0].url, r.requestFailures[0].errorText);
    if (r.badResponses.length) console.log('badResponses:', r.badResponses[0].url, r.badResponses[0].status);
  }

  if (failing.length) process.exitCode = 2;
})();
