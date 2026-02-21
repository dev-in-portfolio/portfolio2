const { test, expect } = require('playwright/test');
const fs = require('fs');
const path = require('path');

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
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) {
    const dir = rel.slice(0, -'/index.html'.length);
    return `/${dir}/`;
  }
  return `/${rel}`;
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

test.setTimeout(10 * 60 * 1000);

test('Runtime console + network sweep (all HTML entrypoints)', async ({ browser }) => {
  const htmlFiles = walkHtmlFiles(ROOT).filter(fp => !fp.includes('/__MACOSX/'));
  htmlFiles.sort();

  const urlPaths = uniq(htmlFiles.map(toUrl));

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const results = [];

  for (const urlPath of urlPaths) {
    const page = await context.newPage();
    const fullUrl = `${BASE_URL}${urlPath}`;

    const errors = [];
    const warnings = [];
    const pageErrors = [];
    const requestFailures = [];
    const badResponses = [];

    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') errors.push(text);
      else if (type === 'warning') warnings.push(text);
    });

    page.on('pageerror', err => {
      pageErrors.push(String(err));
    });

    page.on('requestfailed', req => {
      const failure = req.failure();
      requestFailures.push({
        url: req.url(),
        method: req.method(),
        errorText: failure && failure.errorText ? failure.errorText : 'unknown'
      });
    });

    page.on('response', res => {
      const status = res.status();
      if (status >= 400) {
        badResponses.push({ url: res.url(), status });
      }
    });

    let status = 0;
    let ok = true;
    let finalUrl = fullUrl;

    try {
      const resp = await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      status = resp ? resp.status() : 0;
      finalUrl = page.url();
      await page.waitForTimeout(900);
      await page.mouse.move(200, 200);
      await page.waitForTimeout(100);
    } catch (e) {
      ok = false;
      pageErrors.push(`NavigationError: ${String(e)}`);
    }

    if (status >= 400 || status === 0) ok = false;
    if (errors.length || pageErrors.length || requestFailures.length) {
      ok = ok && errors.length === 0 && pageErrors.length === 0 && requestFailures.length === 0;
    }

    results.push({
      url: urlPath,
      status,
      ok,
      fullUrl,
      finalUrl,
      errors,
      warnings,
      pageErrors,
      requestFailures,
      badResponses
    });

    await page.close();
  }

  await context.close();

  const reportPath = path.join(ROOT, 'tests', 'runtime-sweep-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({ baseUrl: BASE_URL, scanned: results.length, results }, null, 2));

  const failing = results.filter(r => !r.ok);

  // Attach summary to test output
  if (failing.length) {
    const summary = failing.map(r => ({
      url: r.url,
      status: r.status,
      pageError: r.pageErrors[0] || null,
      consoleError: r.errors[0] || null,
      requestFailed: r.requestFailures[0] || null,
      badResponse: r.badResponses[0] || null,
    }));
    fs.writeFileSync(path.join(ROOT, 'tests', 'runtime-sweep-failing.json'), JSON.stringify(summary, null, 2));
  }

  expect(failing, `Runtime sweep found ${failing.length} failing page(s). See tests/runtime-sweep-report.json`).toEqual([]);
});
