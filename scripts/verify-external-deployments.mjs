import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const registry = JSON.parse(await readFile(path.join(rootDir, 'data/apps.registry.json'), 'utf8'));
const shouldWrite = process.argv.includes('--write');
const strict = process.argv.includes('--strict');
const timeoutMs = Number(process.env.NEXUS_EXTERNAL_TIMEOUT_MS || 30000);
const maxAttempts = Math.max(1, Number(process.env.NEXUS_EXTERNAL_ATTEMPTS || 2));
const concurrency = Math.max(1, Number(process.env.NEXUS_EXTERNAL_CONCURRENCY || 4));
const structuralErrors = [];

const targets = (registry.applications || []).filter(app => app.deploymentType === 'external');
const report = {
  generatedAt: new Date().toISOString(),
  timeoutMs,
  maxAttempts,
  concurrency,
  summary: {},
  results: []
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function extractTitle(html) {
  const match = String(html || '').match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  return match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 240) || null;
}

function looksLikeHtml(contentType, body) {
  return /text\/html|application\/xhtml\+xml/i.test(contentType || '') || /^\s*<!doctype html|^\s*<html\b/i.test(body || '');
}

async function runAttempt(app, attemptNumber) {
  const startedAt = Date.now();
  const attempt = {
    attempt: attemptNumber,
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
        'user-agent': 'NEXUS-Reforged-Health-Check/1.1',
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
        'cache-control': 'no-cache'
      }
    });
    attempt.status = response.status;
    attempt.finalUrl = response.url;
    attempt.redirected = response.redirected || response.url !== app.href;
    attempt.contentType = response.headers.get('content-type');
    const body = await response.text();
    if (looksLikeHtml(attempt.contentType, body)) attempt.title = extractTitle(body);
    attempt.health = response.ok ? 'healthy-response' : 'unhealthy-response';
    if (/site not found|page not found|not found/i.test(`${attempt.title || ''}\n${body.slice(0, 2000)}`) && response.status < 400) {
      attempt.health = 'placeholder-or-not-found-content';
    }
  } catch (error) {
    attempt.health = 'network-error';
    attempt.error = error?.name === 'AbortError' ? `timeout-after-${timeoutMs}ms` : String(error?.message || error);
  } finally {
    clearTimeout(timer);
    attempt.latencyMs = Date.now() - startedAt;
  }
  return attempt;
}

function shouldRetry(attempt) {
  return attempt.health === 'network-error' || (typeof attempt.status === 'number' && attempt.status >= 500);
}

async function checkTarget(app) {
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
    error: null,
    attempts: []
  };

  for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
    const attempt = await runAttempt(app, attemptNumber);
    result.attempts.push(attempt);
    Object.assign(result, {
      status: attempt.status,
      finalUrl: attempt.finalUrl,
      redirected: attempt.redirected,
      contentType: attempt.contentType,
      title: attempt.title,
      latencyMs: result.attempts.reduce((sum, item) => sum + item.latencyMs, 0),
      health: attempt.health,
      error: attempt.error
    });

    if (!shouldRetry(attempt) || attemptNumber === maxAttempts) break;
    await sleep(1000 * attemptNumber);
  }

  result.recoveredAfterRetry = result.health === 'healthy-response' && result.attempts.length > 1;
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
  recoveredAfterRetryCount: report.results.filter(result => result.recoveredAfterRetry).length,
  unhealthyCount: report.results.filter(result => result.health !== 'healthy-response').length
};

console.log('NEXUS external deployment health check');
console.log(`- Targets: ${report.summary.checkedTargets}`);
console.log(`- Health: ${JSON.stringify(report.summary.healthCounts)}`);
console.log(`- Recovered after retry: ${report.summary.recoveredAfterRetryCount}`);
for (const result of report.results) {
  console.log(`\n${result.id}: ${result.health}`);
  console.log(`  attempts: ${result.attempts.length}`);
  console.log(`  status: ${result.status ?? 'none'}`);
  console.log(`  final URL: ${result.finalUrl || 'none'}`);
  console.log(`  title: ${result.title || 'none'}`);
  console.log(`  total latency: ${result.latencyMs} ms`);
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
  console.error(`\nStrict external health check failed: ${report.summary.unhealthyCount} deployment(s) are not healthy after retries.`);
  process.exit(1);
}

if (report.summary.unhealthyCount > 0) {
  console.log(`\nRecorded ${report.summary.unhealthyCount} unhealthy external deployment(s) after retry handling. Baseline mode preserves the evidence without making public-network availability a registry failure.`);
} else {
  console.log('\nAll external deployments returned healthy responses after retry handling.');
}
