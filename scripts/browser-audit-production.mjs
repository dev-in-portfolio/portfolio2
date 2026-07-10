import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const args = process.argv.slice(2);
const valueFor = flag => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};
const baseUrl = (valueFor('--base-url') || 'http://127.0.0.1:4173').replace(/\/$/, '');
const outputDir = path.resolve(rootDir, valueFor('--output') || 'reports/reforge/production-browser');
const appsRegistry = JSON.parse(await readFile(path.join(rootDir, 'data/apps.registry.json'), 'utf8'));
const deferredApps = (appsRegistry.applications || []).filter(app => app.reforgeScope === 'deferred');
const localApps = (appsRegistry.applications || []).filter(app => app.deploymentType !== 'external' && app.reforgeScope !== 'deferred');
const routes = [
  { id: 'home', name: 'Home', href: '/', kind: 'section' },
  { id: 'tools', name: 'Utilities', href: '/tools/', kind: 'section' },
  { id: 'about', name: 'About', href: '/about/', kind: 'section' },
  { id: 'contact', name: 'Contact', href: '/contact/', kind: 'section' },
  { id: 'capabilities', name: 'Capabilities', href: '/capabilities/', kind: 'protected-section' },
  { id: 'apps-console', name: 'Apps Console', href: '/apps/', kind: 'section' },
  ...localApps.map(app => ({ id: app.id, name: app.name, href: app.href, kind: 'application' }))
];

await rm(outputDir, { recursive: true, force: true });
await mkdir(path.join(outputDir, 'screenshots'), { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--disable-dev-shm-usage']
});

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  browser: { name: 'chromium', version: browser.version() },
  viewport: { width: 1366, height: 768 },
  deferredApplications: deferredApps.map(app => ({ id: app.id, name: app.name, reason: app.deferReason || 'deferred' })),
  routes: [],
  summary: {}
};

const sameOrigin = candidate => {
  try {
    return new URL(candidate).origin === new URL(baseUrl).origin;
  } catch {
    return false;
  }
};

for (const route of routes) {
  const context = await browser.newContext({ viewport: report.viewport, reducedMotion: 'reduce', colorScheme: 'dark' });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  const badResponses = [];

  page.on('pageerror', error => pageErrors.push(String(error?.message || error)));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', request => {
    failedRequests.push({
      url: request.url(),
      sameOrigin: sameOrigin(request.url()),
      errorText: request.failure()?.errorText || null
    });
  });
  page.on('response', response => {
    if (sameOrigin(response.url()) && response.status() >= 400) badResponses.push({ url: response.url(), status: response.status() });
  });

  let navigation = null;
  let navigationError = null;
  const targetUrl = new URL(route.href, `${baseUrl}/`).toString();
  const startedAt = Date.now();
  try {
    navigation = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1400);
  } catch (error) {
    navigationError = String(error?.message || error);
  }

  const metrics = await page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    const text = body?.innerText?.replace(/\s+/g, ' ').trim() || '';
    const visibleLandmarks = [...document.querySelectorAll('main, canvas, svg, form, button, input, nav, section')]
      .filter(element => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      }).length;
    return {
      title: document.title || null,
      bodyTextLength: text.length,
      bodyChildCount: body?.children?.length || 0,
      visibleLandmarkCount: visibleLandmarks,
      horizontalOverflowPx: Math.max(0, (html?.scrollWidth || 0) - (html?.clientWidth || 0)),
      canonicalHref: document.querySelector('link[rel="canonical"]')?.href || null,
      currentUrl: location.href,
      legacyStandaloneHost: /dev-in-portfolio-(?:home|apps|utilities|capabilities|about|contact)\.netlify\.app/i.test(location.hostname)
    };
  }).catch(error => ({ evaluationError: String(error?.message || error) }));

  const screenshotPath = path.join(outputDir, 'screenshots', `${route.id}.png`);
  let screenshotCaptured = false;
  try {
    await page.screenshot({ path: screenshotPath, fullPage: true });
    screenshotCaptured = true;
  } catch {
    screenshotCaptured = false;
  }

  const findings = [];
  if (navigationError) findings.push(`navigation-error:${navigationError}`);
  if (!navigation || !navigation.ok()) findings.push(`route-status:${navigation?.status?.() ?? 'none'}`);
  if (badResponses.length > 0) findings.push(`same-origin-http-errors:${badResponses.length}`);
  if (failedRequests.some(request => request.sameOrigin)) findings.push(`same-origin-request-failures:${failedRequests.filter(request => request.sameOrigin).length}`);
  if (pageErrors.length > 0) findings.push(`page-errors:${pageErrors.length}`);
  if (consoleErrors.length > 0) findings.push(`console-errors:${consoleErrors.length}`);
  if ('evaluationError' in metrics) findings.push(`evaluation-error:${metrics.evaluationError}`);
  if (!('evaluationError' in metrics) && metrics.bodyChildCount === 0) findings.push('empty-body');
  if (!('evaluationError' in metrics) && metrics.bodyTextLength < 20 && metrics.visibleLandmarkCount === 0) findings.push('minimal-visible-content');
  if (!('evaluationError' in metrics) && metrics.horizontalOverflowPx > 2) findings.push(`horizontal-overflow:${metrics.horizontalOverflowPx}px`);
  if (!('evaluationError' in metrics) && metrics.legacyStandaloneHost) findings.push('legacy-standalone-host');

  const result = findings.length === 0 ? 'passed' : 'failed';
  report.routes.push({
    ...route,
    targetUrl,
    result,
    durationMs: Date.now() - startedAt,
    navigation: navigation ? { status: navigation.status(), ok: navigation.ok(), finalUrl: page.url() } : null,
    navigationError,
    metrics,
    findings,
    pageErrors,
    consoleErrors,
    failedRequests,
    badResponses,
    screenshot: screenshotCaptured ? path.relative(rootDir, screenshotPath).split(path.sep).join('/') : null
  });

  console.log(`${route.id}: ${result} (${navigation?.status?.() ?? 'none'}) ${page.url()}`);
  for (const finding of findings) console.log(`  FAIL: ${finding}`);
  await context.close();
}

await browser.close();
const failedRoutes = report.routes.filter(route => route.result === 'failed');
report.summary = {
  expectedRoutes: routes.length,
  checkedRoutes: report.routes.length,
  passedRoutes: report.routes.length - failedRoutes.length,
  failedRoutes: failedRoutes.length,
  deferredApplicationCount: deferredApps.length
};
await writeFile(path.join(outputDir, 'production-browser-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Production browser audit: ${report.summary.passedRoutes}/${report.summary.checkedRoutes} passed; deferred: ${deferredApps.map(app => app.id).join(', ') || 'none'}.`);
if (failedRoutes.length > 0) process.exit(1);
