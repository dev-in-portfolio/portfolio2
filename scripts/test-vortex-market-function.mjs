import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const require = createRequire(import.meta.url);
const functionPath = path.join(rootDir, 'apps/netlify/functions/vortex-market.js');
const { handler } = require(functionPath);

const originalFetch = global.fetch;
global.fetch = async url => {
  const value = String(url);
  if (value.includes('/OHLC?')) {
    return new Response(JSON.stringify({
      error: [],
      result: {
        XXBTZUSD: [
          [1, '100', '110', '90', '105', '0', '0', 1],
          [2, '105', '115', '95', '111', '0', '0', 1]
        ],
        last: 2
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (value.includes('/Ticker?')) {
    return new Response(JSON.stringify({
      error: [],
      result: { XXBTZUSD: { c: ['111.25', '1'] } }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  throw new Error(`Unexpected provider URL: ${value}`);
};

try {
  const spot = await handler({
    httpMethod: 'GET',
    queryStringParameters: { asset: 'BTC', mode: 'spot' }
  });
  assert.equal(spot.statusCode, 200);
  const spotBody = JSON.parse(spot.body);
  assert.equal(spotBody.ok, true);
  assert.equal(spotBody.source, 'kraken');
  assert.equal(spotBody.price, 111.25);

  const candles = await handler({
    httpMethod: 'GET',
    queryStringParameters: { asset: 'BTC', mode: 'candles', limit: '20' }
  });
  assert.equal(candles.statusCode, 200);
  const candlesBody = JSON.parse(candles.body);
  assert.deepEqual(candlesBody.candles, [105, 111]);

  const invalidAsset = await handler({
    httpMethod: 'GET',
    queryStringParameters: { asset: 'DOGE', mode: 'spot' }
  });
  assert.equal(invalidAsset.statusCode, 400);

  const invalidMethod = await handler({
    httpMethod: 'POST',
    queryStringParameters: {}
  });
  assert.equal(invalidMethod.statusCode, 405);

  const preflight = await handler({
    httpMethod: 'OPTIONS',
    queryStringParameters: {}
  });
  assert.ok([200, 204].includes(preflight.statusCode));

  console.log('Vortex market function contract passed.');
} finally {
  global.fetch = originalFetch;
}
