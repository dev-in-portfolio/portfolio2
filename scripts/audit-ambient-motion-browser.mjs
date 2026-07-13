import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const valueFor = flag => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};
const baseUrl = (valueFor('--base-url') || 'http://127.0.0.1:4173').replace(/\/$/, '');
const outputDir = path.resolve(root, valueFor('--output') || 'reports/reforge/ambient-motion-browser');
const routes = [
  { id: 'home', href: '/', expected: null },
  { id: 'apps', href: '/apps/', expected: 'circuit' },
  { id: 'capabilities', href: '/capabilities/', expected: 'constellation' },
  { id: 'about', href: '/about/', expected: 'drift' },
  { id: 'contact', href: '/contact/', expected: 'ripple' },
  { id: 'tools', href: '/tools/', expected: 'grid-reveal' }
];

await rm(outputDir, { recursive: true, force: true });
await mkdir(path.join(outputDir, 'screenshots'), { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  browser: { name: 'chromium', version: browser.version() },
  routes: [],
  reducedMotion: [],
  summary: {}
};

const isSameOrigin = candidate => {
  try {
    return new URL(candidate).origin === new URL(baseUrl).origin;
  } catch {
    return false;
  }
};

async function inspectRoute(route) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'no-preference', colorScheme: 'dark' });
  const page = await context.newPage();
  const findings = [];
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  const badResponses = [];

  page.on('pageerror', error => pageErrors.push(String(error?.message || error)));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', request => {
    if (isSameOrigin(request.url()) && !/ERR_ABORTED/i.test(request.failure()?.errorText || '')) {
      failedRequests.push({ url: request.url(), error: request.failure()?.errorText || null });
    }
  });
  page.on('response', response => {
    if (isSameOrigin(response.url()) && response.status() >= 400) badResponses.push({ url: response.url(), status: response.status() });
  });

  const response = await page.goto(new URL(route.href, `${baseUrl}/`).toString(), { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(error => {
    findings.push(`navigation:${String(error?.message || error)}`);
    return null;
  });
  if (!response?.ok()) findings.push(`status:${response?.status() ?? 'none'}`);
  await page.waitForTimeout(1200);

  let evidence = {};
  if (!route.expected) {
    const layerCount = await page.locator('.nx-ambient-layer, .nx-ambient-ripple, .nx-grid-reveal').count();
    if (layerCount !== 0) findings.push(`home-unexpected-motion:${layerCount}`);
    evidence = { layerCount };
  } else if (['circuit', 'constellation', 'drift'].includes(route.expected)) {
    const selector = `.nx-ambient-layer[data-motion="${route.expected}"]`;
    try {
      await page.waitForSelector(selector, { state: 'attached', timeout: 12000 });
    } catch {
      findings.push(`${route.expected}-not-mounted`);
    }
    const state = await page.locator(selector).first().evaluate(element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        width: rect.width,
        height: rect.height,
        bitmapWidth: element.width,
        bitmapHeight: element.height,
        ariaHidden: element.getAttribute('aria-hidden'),
        pointerEvents: style.pointerEvents,
        opacity: Number(style.opacity)
      };
    }).catch(() => null);
    if (!state || state.width < 100 || state.height < 100 || state.bitmapWidth < 100 || state.bitmapHeight < 100) findings.push(`${route.expected}-invalid-canvas`);
    if (state && (state.ariaHidden !== 'true' || state.pointerEvents !== 'none')) findings.push(`${route.expected}-interaction-or-accessibility`);
    evidence = state || {};
  } else if (route.expected === 'ripple') {
    try {
      await page.waitForFunction(() => document.body?.dataset.nxRippleMounted === 'true', null, { timeout: 12000 });
    } catch {
      findings.push('ripple-not-mounted');
    }
    const target = page.locator('.chip, .btn, a[href^="mailto:"], a[href^="tel:"]').first();
    if (await target.count()) {
      await target.focus();
      try {
        await page.waitForSelector('.nx-ambient-ripple', { state: 'attached', timeout: 1500 });
      } catch {
        findings.push('ripple-focus-feedback-missing');
      }
    } else {
      findings.push('ripple-action-target-missing');
    }
    evidence = {
      mounted: await page.evaluate(() => document.body?.dataset.nxRippleMounted === 'true'),
      actionTargets: await page.locator('.chip, .btn, a[href^="mailto:"], a[href^="tel:"]').count()
    };
  } else if (route.expected === 'grid-reveal') {
    try {
      await page.waitForFunction(() => document.querySelectorAll('#node-deck .node-card').length > 0, null, { timeout: 12000 });
    } catch {
      findings.push('utility-cards-did-not-render');
    }
    const cardState = await page.locator('#node-deck .node-card').evaluateAll(cards => cards.map(card => ({
      revealed: card.classList.contains('nx-grid-reveal'),
      delay: getComputedStyle(card).getPropertyValue('--nx-reveal-delay').trim()
    })));
    if (!cardState.length || cardState.some(card => !card.revealed || !card.delay)) findings.push('grid-reveal-contract-missing');
    evidence = { cardCount: cardState.length, firstDelays: cardState.slice(0, 5).map(card => card.delay) };
  }

  if (pageErrors.length) findings.push(`page-errors:${pageErrors.length}`);
  if (consoleErrors.length) findings.push(`console-errors:${consoleErrors.length}`);
  if (failedRequests.length) findings.push(`request-failures:${failedRequests.length}`);
  if (badResponses.length) findings.push(`http-errors:${badResponses.length}`);

  const screenshot = path.join(outputDir, 'screenshots', `${route.id}.png`);
  await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});
  const result = findings.length ? 'failed' : 'passed';
  await context.close();
  return { ...route, result, findings, evidence, pageErrors, consoleErrors, failedRequests, badResponses, screenshot: path.relative(root, screenshot).split(path.sep).join('/') };
}

for (const route of routes) report.routes.push(await inspectRoute(route));

for (const route of [routes.find(item => item.id === 'contact'), routes.find(item => item.id === 'tools')]) {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce', colorScheme: 'dark' });
  const page = await context.newPage();
  const findings = [];
  const response = await page.goto(new URL(route.href, `${baseUrl}/`).toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (!response.ok()) findings.push(`status:${response.status()}`);
  await page.waitForTimeout(1200);
  if (route.id === 'contact') {
    const target = page.locator('.chip, .btn, a[href^="mailto:"], a[href^="tel:"]').first();
    if (await target.count()) await target.focus();
    await page.waitForTimeout(80);
    const rippleCount = await page.locator('.nx-ambient-ripple').count();
    if (rippleCount !== 0) findings.push(`reduced-motion-ripple:${rippleCount}`);
  } else {
    const states = await page.locator('#node-deck .node-card').evaluateAll(cards => cards.map(card => {
      const style = getComputedStyle(card);
      return { opacity: style.opacity, transform: style.transform, animation: style.animationName };
    }));
    if (!states.length || states.some(state => state.opacity !== '1' || state.transform !== 'none' || state.animation !== 'none')) findings.push('reduced-motion-grid-animation-active');
  }
  report.reducedMotion.push({ id: route.id, result: findings.length ? 'failed' : 'passed', findings });
  await context.close();
}

await browser.close();
const failures = [...report.routes, ...report.reducedMotion].filter(item => item.result === 'failed');
report.summary = {
  routeChecks: report.routes.length,
  routePasses: report.routes.length - report.routes.filter(item => item.result === 'failed').length,
  reducedMotionChecks: report.reducedMotion.length,
  reducedMotionPasses: report.reducedMotion.length - report.reducedMotion.filter(item => item.result === 'failed').length,
  failures: failures.length
};
await writeFile(path.join(outputDir, 'ambient-motion-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`Ambient motion browser audit: ${report.summary.routePasses}/${report.summary.routeChecks} routes and ${report.summary.reducedMotionPasses}/${report.summary.reducedMotionChecks} reduced-motion checks passed.`);
for (const failure of failures) console.error(`${failure.id}: ${failure.findings.join(', ')}`);
if (failures.length) process.exit(1);
