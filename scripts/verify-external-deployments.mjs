import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const registry = JSON.parse(await readFile(path.join(rootDir, 'data/apps.registry.json'), 'utf8'));
const shouldWrite = process.argv.includes('--write');
const strict = process.argv.includes('--strict');
const timeoutMs = Number(process.env.NEXUS_EXTERNAL_TIMEOUT_MS || 15000);
const concurrency = Math.max(1, Number(process.env.NEXUS_EXTERNAL_CONCURRENCY || 4));
const structuralErrors = [];

const targets = (registry.applications || []).filter(app => app.deploymentType === 'external');
const report = {
  generatedAt: new Date().toISOString(),
  timeoutMs,
  concurrency,
  summary: {},
  results: []
};

function extractTitle(html) {
  const match = String(html || '').match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  return match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 240) || null;
}

function looksLikeHtml(contentType, body) {
  return /text\/html|application\/xhtml\+xml/i.test(contentType || '') || /^\s*<!doctype html|^\s*<html\b/i.test(body || '');
}

async function checkTarget(app) {
  const startedAt = Date.now();
  const result = {
    id: app.id,
    name: app.name,
    requestedUrl: app.href,
    status: null,
    finalUrl: null,
    redirected: false,
    contentType: null,
    title: null,
    latencyMs: null,
    health: 'unknown',
    error: null
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(app.href, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'NEXUS-Reforged-Health-Check/1.0',
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5'
      }
    });
    result.status = response.status;
    result.finalUrl = response.url;
    result.redirected = response.redirected || response.url !== app.href;
    result.contentType = response.headers.get('content-type');
    const body = await response.text();
    if (looksLikeHtml(result.contentType, body)) result.title = extractTitle(body);
    result.health = response.ok ? 'healthy-response' : 'unhealthy-response';
    if (/site not found|page not found|not found/i.test(`${result.title || ''}\n${body.slice(0, 2000)}`) && response.status < 400) {
      result.health = 'placeholder-or-not-found-content';
    }
  } catch (error) {
    result.health = 'network-error';
    result.error = error?.name === 'AbortError' ? `timeout-after-${timeoutMs}ms` : String(error?.message || error);
  } finally {
    clearTimeout(timer);
    result.latencyMs = Date.now() - startedAt;
  }
  return result;
}

async function runPool(items, worker, limit) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function runner() {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
  return results;
}

if (targets.length === 0) structuralErrors.push('No external deployment targets found in apps registry.');
for (const app of targets) {
  if (typeof app.id !== 'string' || typeof app.name !== 'string' || typeof app.href !== 'string') {
    structuralErrors.push(`Malformed external app record: ${JSON.stringify(app)}`);
  }
  if (!app.href?.startsWith('https://')) structuralErrors.push(`${app.id}: external URL must use HTTPS`);
}

if (structuralErrors.length === 0) report.results = await runPool(targets, checkTarget, concurrency);

const healthCounts = report.results.reduce((counts, result) => {
  counts[result.health] = (counts[result.health] || 0) + 1;
  return counts;
}, {});
report.summary = {
  expectedTargets: targets.length,
  checkedTargets: report.results.length,
  healthCounts,
  healthyCount: report.results.filter(result => result.health === 'healthy-response').length,
  unhealthyCount: report.results.filter(result => result.health !== 'healthy-response').length
};

console.log('NEXUS external deployment health check');
console.log(`- Targets: ${report.summary.checkedTargets}`);
console.log(`- Health: ${JSON.stringify(report.summary.healthCounts)}`);
for (const result of report.results) {
  console.log(`\n${result.id}: ${result.health}`);
  console.log(`  status: ${result.status ?? 'none'}`);
  console.log(`  final URL: ${result.finalUrl || 'none'}`);
  console.log(`  title: ${result.title || 'none'}`);
  console.log(`  latency: ${result.latencyMs} ms`);
  if (result.error) console.log(`  error: ${result.error}`);
}

if (shouldWrite) {
  const outputDir = path.join(rootDir, 'reports/reforge');
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'external-deployment-health.json');
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`\nWrote ${path.relative(rootDir, outputPath)}`);
}

if (structuralErrors.length > 0) {
  console.error(`\nExternal deployment check failed structurally with ${structuralErrors.length} error(s):`);
  for (const error of structuralErrors) console.error(`- ${error}`);
  process.exit(1);
}

if (strict && report.summary.unhealthyCount > 0) {
  console.error(`\nStrict external health check failed: ${report.summary.unhealthyCount} deployment(s) are not healthy.`);
  process.exit(1);
}

if (report.summary.unhealthyCount > 0) {
  console.log(`\nRecorded ${report.summary.unhealthyCount} unhealthy external deployment(s). Baseline mode reports these without treating a public outage as a registry failure.`);
} else {
  console.log('\nAll external deployments returned healthy responses.');
}
