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
  { id: 'capabilities', name: 'Capabilities', href: '/capabilities/', kind: 'section' },
  { id: 'capabilities-mobile', name: 'Capabilities Mobile', href: '/capabilities/', kind: 'responsive-section', viewport: { width: 375, height: 812 } },
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
const parseLeadingCount = text => Number(String(text || '').match(/^\s*(\d+)/)?.[1] ?? Number.NaN);

async function auditCapabilities(page) {
  const findings = [];
  const evidence = {};
  try {
    await page.waitForFunction(() => document.querySelectorAll('.claim-card').length > 0, null, { timeout: 12000 });
  } catch {
    findings.push('capabilities-claims-did-not-render');
    return { findings, evidence };
  }

  const ledger = await page.evaluate(async () => {
    const load = async reference => {
      const response = await fetch(reference, { cache: 'no-store' });
      if (!response.ok) throw new Error(`${reference}:${response.status}`);
      return response.json();
    };
    const manifest = await load('./evidence-ledger.json');
    const projects = await load(manifest.projectFile);
    const claimGroups = await Promise.all(manifest.claimFiles.map(load));
    return { manifest, projects, claims: claimGroups.flat() };
  }).catch(error => ({ error: String(error?.message || error) }));
  if (ledger.error) {
    findings.push(`capabilities-ledger-fetch:${ledger.error}`);
    return { findings, evidence };
  }

  const accepted = ledger.claims.filter(claim => claim.public === true);
  const acceptedProjectIds = new Set(accepted.map(claim => claim.projectId));
  const domains = [...new Set(accepted.map(claim => claim.domain))].sort();
  const queued = ledger.projects.filter(project => ['queued', 'documentation-review'].includes(project.reviewStatus)).length;
  const expectedSummary = [accepted.length, acceptedProjectIds.size, domains.length, queued];

  const pageState = await page.evaluate(() => ({
    summary: [...document.querySelectorAll('#summary-grid dd')].map(node => Number(node.textContent)),
    resultText: document.querySelector('#result-count')?.textContent || '',
    claimCards: document.querySelectorAll('.claim-card').length,
    domainOptions: [...document.querySelectorAll('#domain-filter option')].map(option => option.value),
    evidenceOptions: [...document.querySelectorAll('#evidence-filter option')].map(option => option.value),
    sourceLinks: [...document.querySelectorAll('.sources a')].map(link => ({ href: link.href, target: link.target, rel: link.rel })),
    projectLinks: [...document.querySelectorAll('.project-link')].map(link => ({ href: link.href, target: link.target, rel: link.rel })),
    labels: [...document.querySelectorAll('.controls label')].map(label => ({ text: label.innerText.trim(), control: Boolean(label.querySelector('input,select')) }))
  }));
  evidence.expectedSummary = expectedSummary;
  evidence.pageSummary = pageState.summary;
  evidence.acceptedClaims = accepted.length;
  evidence.renderedClaims = pageState.claimCards;

  if (JSON.stringify(pageState.summary) !== JSON.stringify(expectedSummary)) findings.push(`capabilities-summary-mismatch:${pageState.summary.join(',')}!=${expectedSummary.join(',')}`);
  if (pageState.claimCards !== accepted.length) findings.push(`capabilities-claim-count:${pageState.claimCards}!=${accepted.length}`);
  if (parseLeadingCount(pageState.resultText) !== accepted.length) findings.push(`capabilities-result-count:${pageState.resultText}`);
  if (JSON.stringify(pageState.domainOptions) !== JSON.stringify(['all', ...domains])) findings.push('capabilities-domain-options-mismatch');
  const expectedEvidenceOptions = ['all', ...Object.keys(ledger.manifest.verificationDimensions || {})];
  if (JSON.stringify(pageState.evidenceOptions) !== JSON.stringify(expectedEvidenceOptions)) findings.push('capabilities-evidence-options-mismatch');
  if (pageState.labels.some(label => !label.control || !label.text)) findings.push('capabilities-unlabeled-controls');
  if (pageState.sourceLinks.some(link => !link.href.startsWith('https://github.com/') || link.target !== '_blank' || !/noopener/.test(link.rel) || !/noreferrer/.test(link.rel))) findings.push('capabilities-unsafe-source-link');
  if (pageState.projectLinks.some(link => !/^https?:\/\//.test(link.href))) findings.push('capabilities-unsafe-project-link');

  const search = page.locator('#search');
  await search.fill('WebGPU');
  await page.waitForTimeout(80);
  const webGpuCount = parseLeadingCount(await page.locator('#result-count').textContent());
  if (!(webGpuCount > 0 && webGpuCount < accepted.length)) findings.push(`capabilities-search-webgpu:${webGpuCount}`);
  await search.fill('__no_such_capability_claim__');
  await page.waitForTimeout(80);
  const noMatchCount = parseLeadingCount(await page.locator('#result-count').textContent());
  if (noMatchCount !== 0 || await page.locator('.empty').count() !== 1) findings.push(`capabilities-search-empty:${noMatchCount}`);
  await search.fill('');

  for (const domain of domains) {
    await page.selectOption('#domain-filter', domain);
    await page.waitForTimeout(30);
    const actual = parseLeadingCount(await page.locator('#result-count').textContent());
    const expected = accepted.filter(claim => claim.domain === domain).length;
    if (actual !== expected) findings.push(`capabilities-domain-filter:${domain}:${actual}!=${expected}`);
  }
  await page.selectOption('#domain-filter', 'all');

  for (const dimension of Object.keys(ledger.manifest.verificationDimensions || {})) {
    await page.selectOption('#evidence-filter', dimension);
    await page.waitForTimeout(30);
    const actual = parseLeadingCount(await page.locator('#result-count').textContent());
    const expected = accepted.filter(claim => claim.evidence?.[dimension] === true).length;
    if (actual !== expected) findings.push(`capabilities-evidence-filter:${dimension}:${actual}!=${expected}`);
  }
  await page.selectOption('#evidence-filter', 'all');

  const firstDomain = page.locator('.domain').first();
  const firstSummary = firstDomain.locator(':scope > summary');
  const initiallyOpen = await firstDomain.evaluate(element => element.open);
  await firstSummary.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(30);
  const toggledOpen = await firstDomain.evaluate(element => element.open);
  if (initiallyOpen === toggledOpen) findings.push('capabilities-keyboard-details-did-not-toggle');

  evidence.searchWebGpuCount = webGpuCount;
  evidence.domainFilterCount = domains.length;
  evidence.evidenceFilterCount = expectedEvidenceOptions.length - 1;
  evidence.sourceLinkCount = pageState.sourceLinks.length;
  return { findings, evidence };
}

for (const route of routes) {
  const viewport = route.viewport || report.viewport;
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', colorScheme: 'dark' });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  const badResponses = [];
  const externalBadResponses = [];

  page.on('pageerror', error => pageErrors.push(String(error?.message || error)));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push({ text: message.text(), location: message.location() });
  });
  page.on('requestfailed', request => {
    failedRequests.push({ url: request.url(), sameOrigin: sameOrigin(request.url()), errorText: request.failure()?.errorText || null });
  });
  page.on('response', response => {
    if (response.status() < 400) return;
    const record = { url: response.url(), status: response.status() };
    if (sameOrigin(response.url())) badResponses.push(record);
    else externalBadResponses.push(record);
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

  const capabilityAudit = route.id.startsWith('capabilities') && !navigationError
    ? await auditCapabilities(page)
    : { findings: [], evidence: {} };

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

  const actionableFailedRequests = failedRequests.filter(request => request.sameOrigin && !/net::ERR_ABORTED/i.test(request.errorText || ''));
  const ignoredFailedRequests = failedRequests.filter(request => request.sameOrigin && /net::ERR_ABORTED/i.test(request.errorText || ''));
  const actionableConsoleErrors = consoleErrors.filter(error => {
    const genericResourceError = /^Failed to load resource:/i.test(error.text);
    return !(genericResourceError && badResponses.length === 0 && actionableFailedRequests.length === 0);
  });
  const ignoredConsoleErrors = consoleErrors.filter(error => !actionableConsoleErrors.includes(error));

  const findings = [...capabilityAudit.findings];
  if (navigationError) findings.push(`navigation-error:${navigationError}`);
  if (!navigation || !navigation.ok()) findings.push(`route-status:${navigation?.status?.() ?? 'none'}`);
  if (badResponses.length > 0) findings.push(`same-origin-http-errors:${badResponses.length}`);
  if (actionableFailedRequests.length > 0) findings.push(`same-origin-request-failures:${actionableFailedRequests.length}`);
  if (pageErrors.length > 0) findings.push(`page-errors:${pageErrors.length}`);
  if (actionableConsoleErrors.length > 0) findings.push(`console-errors:${actionableConsoleErrors.length}`);
  if ('evaluationError' in metrics) findings.push(`evaluation-error:${metrics.evaluationError}`);
  if (!('evaluationError' in metrics) && metrics.bodyChildCount === 0) findings.push('empty-body');
  if (!('evaluationError' in metrics) && metrics.bodyTextLength < 20 && metrics.visibleLandmarkCount === 0) findings.push('minimal-visible-content');
  if (!('evaluationError' in metrics) && metrics.horizontalOverflowPx > 2) findings.push(`horizontal-overflow:${metrics.horizontalOverflowPx}px`);
  if (!('evaluationError' in metrics) && metrics.legacyStandaloneHost) findings.push('legacy-standalone-host');

  const result = findings.length === 0 ? 'passed' : 'failed';
  report.routes.push({
    ...route,
    viewport,
    targetUrl,
    result,
    durationMs: Date.now() - startedAt,
    navigation: navigation ? { status: navigation.status(), ok: navigation.ok(), finalUrl: page.url() } : null,
    navigationError,
    metrics,
    capabilityAudit: capabilityAudit.evidence,
    findings,
    pageErrors,
    consoleErrors,
    actionableConsoleErrors,
    ignoredConsoleErrors,
    failedRequests,
    actionableFailedRequests,
    ignoredFailedRequests,
    badResponses,
    externalBadResponses,
    screenshot: screenshotCaptured ? path.relative(rootDir, screenshotPath).split(path.sep).join('/') : null
  });

  console.log(`${route.id}: ${result} (${navigation?.status?.() ?? 'none'}) ${page.url()}`);
  for (const finding of findings) console.log(`  FAIL: ${finding}`);
  if (ignoredFailedRequests.length > 0) console.log(`  ignored canceled requests: ${ignoredFailedRequests.length}`);
  if (ignoredConsoleErrors.length > 0) console.log(`  ignored external resource console errors: ${ignoredConsoleErrors.length}`);
  await context.close();
}

await browser.close();
const failedRoutes = report.routes.filter(route => route.result === 'failed');
report.summary = {
  expectedRoutes: routes.length,
  checkedRoutes: report.routes.length,
  passedRoutes: report.routes.length - failedRoutes.length,
  failedRoutes: failedRoutes.length,
  deferredApplicationCount: deferredApps.length,
  ignoredCanceledRequestCount: report.routes.reduce((sum, route) => sum + route.ignoredFailedRequests.length, 0),
  ignoredExternalResourceErrorCount: report.routes.reduce((sum, route) => sum + route.ignoredConsoleErrors.length, 0)
};
await writeFile(path.join(outputDir, 'production-browser-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Production browser audit: ${report.summary.passedRoutes}/${report.summary.checkedRoutes} passed; deferred: ${deferredApps.map(app => app.id).join(', ') || 'none'}.`);
if (failedRoutes.length > 0) process.exit(1);
