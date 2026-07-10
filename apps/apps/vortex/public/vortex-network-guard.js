(() => {
  const nativeFetch = window.fetch.bind(window);
  const NativeWebSocket = window.WebSocket;
  const localPreview = /^(?:localhost|127\.0\.0\.1|\[::1\])$/i.test(window.location.hostname);
  const assetFromSymbol = symbol => String(symbol || '').toUpperCase().replace(/USDT$/, '');
  const basePrices = { BTC: 88000, ETH: 3000, SOL: 125 };

  function syntheticPrice(asset) {
    const base = basePrices[asset] || 100;
    const timeWave = Math.sin(Date.now() / 7000) * base * 0.0018;
    const noise = (Math.random() - 0.5) * base * 0.0012;
    return Math.max(0.01, base + timeWave + noise);
  }

  function syntheticCandles(asset, limit) {
    const count = Math.max(20, Math.min(120, Number(limit) || 120));
    const rows = [];
    let price = syntheticPrice(asset);
    const now = Date.now();
    for (let index = count - 1; index >= 0; index -= 1) {
      const open = price;
      const close = Math.max(0.01, open * (1 + (Math.random() - 0.5) * 0.0025));
      const high = Math.max(open, close) * (1 + Math.random() * 0.0008);
      const low = Math.min(open, close) * (1 - Math.random() * 0.0008);
      rows.push([
        now - index * 60_000,
        String(open),
        String(high),
        String(low),
        String(close),
        '0'
      ]);
      price = close;
    }
    return rows;
  }

  function jsonResponse(value, status = 200) {
    return new Response(JSON.stringify(value), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async function proxyRequest(mode, asset, limit) {
    if (localPreview) {
      if (mode === 'candles') return { ok: true, asset, source: 'local-sim', candles: syntheticCandles(asset, limit).map(row => Number(row[4])) };
      return { ok: true, asset, source: 'local-sim', price: syntheticPrice(asset) };
    }

    const query = new URLSearchParams({ mode, asset });
    if (limit) query.set('limit', String(limit));
    const response = await nativeFetch(`/api/vortex-market?${query.toString()}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || `market proxy HTTP ${response.status}`);
    }
    return payload;
  }

  window.fetch = async function vortexFetch(input, init) {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);

    if (/^https:\/\/api\.binance\.com\/api\/v3\/klines/i.test(url)) {
      const parsed = new URL(url);
      const asset = assetFromSymbol(parsed.searchParams.get('symbol'));
      const limit = Number(parsed.searchParams.get('limit') || 120);
      try {
        const payload = await proxyRequest('candles', asset, limit);
        const closes = Array.isArray(payload.candles) ? payload.candles : [];
        const rows = closes.map((close, index) => [Date.now() - (closes.length - index) * 60_000, String(close), String(close), String(close), String(close), '0']);
        return jsonResponse(rows);
      } catch (error) {
        return jsonResponse(syntheticCandles(asset, limit));
      }
    }

    if (/^https:\/\/api\.coingecko\.com\/api\/v3\/simple\/price/i.test(url)) {
      const parsed = new URL(url);
      const id = parsed.searchParams.get('ids') || 'bitcoin';
      const asset = id === 'ethereum' ? 'ETH' : id === 'solana' ? 'SOL' : 'BTC';
      try {
        const payload = await proxyRequest('spot', asset);
        return jsonResponse({ [id]: { usd: Number(payload.price) } });
      } catch (error) {
        return jsonResponse({ [id]: { usd: syntheticPrice(asset) } });
      }
    }

    return nativeFetch(input, init);
  };

  class PollingMarketSocket {
    constructor(url) {
      this.url = String(url);
      this.readyState = 0;
      this.onopen = null;
      this.onmessage = null;
      this.onerror = null;
      this.onclose = null;
      this.listeners = new Map();
      const match = this.url.match(/\/ws\/([a-z0-9]+)@trade/i);
      this.asset = assetFromSymbol(match?.[1] || 'BTCUSDT');
      this.timer = null;
      window.setTimeout(() => {
        if (this.readyState !== 0) return;
        this.readyState = 1;
        this.emit('open', {});
        this.poll();
        this.timer = window.setInterval(() => this.poll(), 5000);
      }, 20);
    }

    addEventListener(type, listener) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type).add(listener);
    }

    removeEventListener(type, listener) {
      this.listeners.get(type)?.delete(listener);
    }

    emit(type, event) {
      const handler = this[`on${type}`];
      if (typeof handler === 'function') handler.call(this, event);
      for (const listener of this.listeners.get(type) || []) listener.call(this, event);
    }

    async poll() {
      if (this.readyState !== 1) return;
      try {
        const payload = await proxyRequest('spot', this.asset);
        const price = Number(payload.price);
        if (!Number.isFinite(price)) throw new Error('invalid market price');
        this.emit('message', { data: JSON.stringify({ p: String(price), c: String(price), source: payload.source }) });
      } catch (error) {
        const price = syntheticPrice(this.asset);
        this.emit('message', { data: JSON.stringify({ p: String(price), c: String(price), source: 'fallback-sim' }) });
      }
    }

    send() {}

    close(code = 1000, reason = 'client close') {
      if (this.timer) window.clearInterval(this.timer);
      this.timer = null;
      if (this.readyState === 3) return;
      this.readyState = 3;
      this.emit('close', { code, reason, wasClean: true });
    }
  }

  function VortexWebSocket(url, protocols) {
    if (/^wss:\/\/stream\.binance\.com(?::\d+)?\/ws\//i.test(String(url))) {
      return new PollingMarketSocket(url);
    }
    return protocols === undefined ? new NativeWebSocket(url) : new NativeWebSocket(url, protocols);
  }

  VortexWebSocket.CONNECTING = 0;
  VortexWebSocket.OPEN = 1;
  VortexWebSocket.CLOSING = 2;
  VortexWebSocket.CLOSED = 3;
  VortexWebSocket.prototype = NativeWebSocket.prototype;
  window.WebSocket = VortexWebSocket;
})();
