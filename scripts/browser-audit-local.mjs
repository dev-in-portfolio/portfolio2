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
const outputArgument = valueFor('--output') || 'reports/reforge/browser';
const outputDir = path.resolve(rootDir, outputArgument);
const strict = args.includes('--strict');
const appsRegistry = JSON.parse(await readFile(path.join(rootDir, 'data/apps.registry.json'), 'utf8'));
const localApps = (appsRegistry.applications || []).filter(app => app.deploymentType !== 'external');
const routes = [
  { id: 'apps-console', name: 'Apps Console', href: '/apps/', kind: 'section' },
  ...localApps.map(app => ({ id: app.id, name: app.name, href: app.href, kind: 'application' }))
];

await rm(outputDir, { recursive: true, force: true });
await mkdir(path.join(outputDir, 'screenshots'), { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: [
    '--enable-unsafe-webgpu',
    '--enable-features=Vulkan',
    '--ignore-gpu-blocklist',
    '--disable-dev-shm-usage'
  ]
});

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  browser: {
    name: 'chromium',
    version: browser.version(),
    launchArgs: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--ignore-gpu-blocklist']
  },
  viewport: { width: 1366, height: 768 },
  summary: {},
  routes: []
};

const normalizeUrl = href => new URL(href, `${baseUrl}/`).toString();
const sameOrigin = candidate => {
  try {
    return new URL(candidate).origin === new URL(baseUrl).origin;
  } catch {
    return false;
  }
};

for (const route of routes) {
  const context = await browser.newContext({
    viewport: report.viewport,
    reducedMotion: 'reduce',
    colorScheme: 'dark',
    ignoreHTTPSErrors: false
  });
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
      method: request.method(),
      sameOrigin: sameOrigin(request.url()),
      errorText: request.failure()?.errorText || null
    });
  });
  page.on('response', response => {
    if (sameOrigin(response.url()) && response.status() >= 400) {
      badResponses.push({ url: response.url(), status: response.status() });
    }
  });

  const targetUrl = normalizeUrl(route.href);
  let navigation = null;
  let navigationError = null;
  const startedAt = Date.now();
  try {
    navigation = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1200);
  } catch (error) {
    navigationError = String(error?.message || error);
  }

  const metrics = await page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    const text = body?.innerText?.replace(/\s+/g, ' ').trim() || '';
    const visibleElements = [...document.querySelectorAll('main, canvas, svg, form, button, input, nav, section')]
      .filter(element => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      }).length;
    return {
      title: document.title || null,
      bodyTextLength: text.length,
      bodyChildCount: body?.children?.length || 0,
      visibleLandmarkCount: visibleElements,
      horizontalOverflowPx: Math.max(0, (html?.scrollWidth || 0) - (html?.clientWidth || 0)),
      documentHeight: html?.scrollHeight || 0,
      webgpuAvailable: Boolean(navigator.gpu),
      serviceWorkerSupported: 'serviceWorker' in navigator,
      localStorageAvailable: (() => {
        try {
          const key = '__nexus_audit__';
          localStorage.setItem(key, '1');
          localStorage.removeItem(key);
          return true;
        } catch {
          return false;
        }
      })()
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

  const sameOriginFailures = failedRequests.filter(request => request.sameOrigin);
  const structuralFindings = [];
  if (navigationError) structuralFindings.push(`navigation-error:${navigationError}`);
  if (!navigation || !navigation.ok()) structuralFindings.push(`route-status:${navigation?.status?.() ?? 'none'}`);
  if (badResponses.length > 0) structuralFindings.push(`same-origin-http-errors:${badResponses.length}`);
  if (sameOriginFailures.length > 0) structuralFindings.push(`same-origin-request-failures:${sameOriginFailures.length}`);
  if ('evaluationError' in metrics) structuralFindings.push(`evaluation-error:${metrics.evaluationError}`);
  if (!('evaluationError' in metrics) && metrics.bodyChildCount === 0) structuralFindings.push('empty-body');

  const runtimeFindings = [];
  if (pageErrors.length > 0) runtimeFindings.push(`page-errors:${pageErrors.length}`);
  if (consoleErrors.length > 0) runtimeFindings.push(`console-errors:${consoleErrors.length}`);
  if (!('evaluationError' in metrics) && metrics.bodyTextLength < 20 && metrics.visibleLandmarkCount === 0) {
    runtimeFindings.push('minimal-visible-content');
  }
  if (!('evaluationError' in metrics) && metrics.horizontalOverflowPx > 2) {
    runtimeFindings.push(`horizontal-overflow:${metrics.horizontalOverflowPx}px`);
  }

  let result = 'passed';
  if (structuralFindings.length > 0) result = 'failed-structural';
  else if (runtimeFindings.length > 0) result = 'passed-with-runtime-findings';

  report.routes.push({
    id: route.id,
    name: route.name,
    kind: route.kind,
    href: route.href,
    targetUrl,
    result,
    durationMs: Date.now() - startedAt,
    navigation: navigation ? { status: navigation.status(), ok: navigation.ok(), finalUrl: page.url() } : null,
    navigationError,
    metrics,
    structuralFindings,
    runtimeFindings,
    pageErrors,
    consoleErrors,
    failedRequests,
    badResponses,
    screenshot: screenshotCaptured ? path.relative(rootDir, screenshotPath).split(path.sep).join('/') : null
  });

  console.log(`${route.id}: ${result}`);
  console.log(`  status: ${navigation?.status?.() ?? 'none'}; title: ${metrics.title || 'none'}; WebGPU: ${metrics.webgpuAvailable === true ? 'yes' : 'no'}`);
  for (const finding of structuralFindings) console.log(`  STRUCTURAL: ${finding}`);
  for (const finding of runtimeFindings) console.log(`  runtime: ${finding}`);
  await context.close();
}

await browser.close();

const resultCounts = report.routes.reduce((counts, route) => {
  counts[route.result] = (counts[route.result] || 0) + 1;
  return counts;
}, {});
report.summary = {
  expectedRoutes: routes.length,
  checkedRoutes: report.routes.length,
  resultCounts,
  structuralFailureCount: report.routes.filter(route => route.result === 'failed-structural').length,
  runtimeFindingCount: report.routes.filter(route => route.result === 'passed-with-runtime-findings').length,
  cleanPassCount: report.routes.filter(route => route.result === 'passed').length,
  webgpuAvailable: report.routes.some(route => route.metrics?.webgpuAvailable === true)
};

await writeFile(path.join(outputDir, 'local-browser-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`\nBrowser audit summary: ${JSON.stringify(report.summary.resultCounts)}`);
console.log(`Report: ${path.relative(rootDir, path.join(outputDir, 'local-browser-audit.json')).split(path.sep).join('/')}`);

if (report.summary.structuralFailureCount > 0) process.exit(1);
if (strict && report.summary.runtimeFindingCount > 0) process.exit(1);
