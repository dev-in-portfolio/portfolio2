const { json, options } = require('./_cors');

const ASSETS = {
  BTC: { kraken: 'XBTUSD', binance: 'BTCUSDT', coingecko: 'bitcoin' },
  ETH: { kraken: 'ETHUSD', binance: 'ETHUSDT', coingecko: 'ethereum' },
  SOL: { kraken: 'SOLUSD', binance: 'SOLUSDT', coingecko: 'solana' },
};

function response(statusCode, body, cacheSeconds = 15) {
  const base = json(statusCode, body);
  base.headers['Cache-Control'] = `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}, stale-while-revalidate=30`;
  return base;
}

async function fetchJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'NEXUS-Vortex-Market/1.0',
      },
    });
    if (!result.ok) throw new Error(`HTTP ${result.status}`);
    return await result.json();
  } finally {
    clearTimeout(timer);
  }
}

async function krakenCandles(config, limit) {
  const payload = await fetchJson(`https://api.kraken.com/0/public/OHLC?pair=${config.kraken}&interval=1`);
  if (payload.error?.length) throw new Error(payload.error.join(', '));
  const resultKey = Object.keys(payload.result || {}).find(key => key !== 'last');
  const rows = resultKey ? payload.result[resultKey] : null;
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('Kraken returned no candles');
  return rows.slice(-limit).map(row => Number(row[4])).filter(Number.isFinite);
}

async function binanceCandles(config, limit) {
  const payload = await fetchJson(`https://api.binance.com/api/v3/klines?symbol=${config.binance}&interval=1m&limit=${limit}`);
  if (!Array.isArray(payload)) throw new Error('Binance returned an invalid candle payload');
  return payload.map(row => Number(row[4])).filter(Number.isFinite);
}

async function krakenSpot(config) {
  const payload = await fetchJson(`https://api.kraken.com/0/public/Ticker?pair=${config.kraken}`);
  if (payload.error?.length) throw new Error(payload.error.join(', '));
  const resultKey = Object.keys(payload.result || {})[0];
  const value = resultKey ? Number(payload.result[resultKey]?.c?.[0]) : NaN;
  if (!Number.isFinite(value)) throw new Error('Kraken returned an invalid spot price');
  return value;
}

async function coinGeckoSpot(config) {
  const payload = await fetchJson(`https://api.coingecko.com/api/v3/simple/price?ids=${config.coingecko}&vs_currencies=usd`);
  const value = Number(payload?.[config.coingecko]?.usd);
  if (!Number.isFinite(value)) throw new Error('CoinGecko returned an invalid spot price');
  return value;
}

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') return options();
  if (event.httpMethod !== 'GET') return response(405, { ok: false, error: 'GET required' }, 0);

  const params = event.queryStringParameters || {};
  const asset = String(params.asset || 'BTC').toUpperCase();
  const mode = String(params.mode || 'spot').toLowerCase();
  const limit = Math.max(20, Math.min(120, Number(params.limit) || 120));
  const config = ASSETS[asset];

  if (!config) return response(400, { ok: false, error: 'Unsupported asset' }, 0);
  if (!['spot', 'candles'].includes(mode)) return response(400, { ok: false, error: 'Unsupported mode' }, 0);

  const failures = [];
  try {
    if (mode === 'candles') {
      try {
        const candles = await krakenCandles(config, limit);
        return response(200, { ok: true, asset, source: 'kraken', candles }, 20);
      } catch (error) {
        failures.push(`kraken: ${error.message}`);
      }

      const candles = await binanceCandles(config, limit);
      return response(200, { ok: true, asset, source: 'binance', candles }, 20);
    }

    try {
      const price = await krakenSpot(config);
      return response(200, { ok: true, asset, source: 'kraken', price }, 10);
    } catch (error) {
      failures.push(`kraken: ${error.message}`);
    }

    const price = await coinGeckoSpot(config);
    return response(200, { ok: true, asset, source: 'coingecko', price }, 10);
  } catch (error) {
    failures.push(error.message);
    return response(502, {
      ok: false,
      error: 'Market providers unavailable',
      details: failures,
    }, 0);
  }
};
