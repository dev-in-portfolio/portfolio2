import { getDeviceKey } from './deviceKey';

export type ViewState = {
  q: string;
  filters: { tag?: string[]; status?: string[] };
  sort: { field: string; dir: 'asc' | 'desc' };
  columns: string[];
  pageSize: number;
};

export type SwitchboardView = {
  id: string;
  name: string;
  route: string;
  state: ViewState;
  created_at: string;
  updated_at: string;
};

const base = '/api/switchboard';

function getLocalViews(): SwitchboardView[] {
  try {
    const raw = localStorage.getItem('switchboard_views_fallback');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalViews(views: SwitchboardView[]) {
  try {
    localStorage.setItem('switchboard_views_fallback', JSON.stringify(views));
  } catch (e) {
    console.error('Failed to write local views:', e);
  }
}

async function request(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('X-Device-Key', getDeviceKey());
  const res = await fetch(`${base}${path}`, { ...options, headers });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error || 'Request failed');
  }
  return res.json();
}

export async function fetchViews(route: string): Promise<SwitchboardView[]> {
  try {
    const data = await request(`/views?route=${encodeURIComponent(route)}`);
    return data.views;
  } catch (err) {
    console.warn('API fetch failed, falling back to localStorage:', err);
    return getLocalViews().filter(v => v.route === route);
  }
}

export async function createView(name: string, route: string, state: ViewState) {
  try {
    const data = await request('/views', {
      method: 'POST',
      body: JSON.stringify({ name, route, state }),
    });
    return data.view as SwitchboardView;
  } catch (err) {
    console.warn('API create failed, falling back to localStorage:', err);
    const newView: SwitchboardView = {
      id: 'local_' + Math.random().toString(36).substring(2, 11),
      name,
      route,
      state,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const views = getLocalViews();
    views.push(newView);
    setLocalViews(views);
    return newView;
  }
}

export async function updateView(id: string, payload: Partial<{ name: string; state: ViewState }>) {
  try {
    const data = await request(`/views/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return data.view as SwitchboardView;
  } catch (err) {
    console.warn('API update failed, falling back to localStorage:', err);
    const views = getLocalViews();
    const idx = views.findIndex(v => v.id === id);
    if (idx === -1) throw new Error('View not found locally');
    views[idx] = {
      ...views[idx],
      ...payload,
      updated_at: new Date().toISOString(),
    };
    setLocalViews(views);
    return views[idx];
  }
}

export async function deleteView(id: string) {
  try {
    await request(`/views/${id}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('API delete failed, falling back to localStorage:', err);
    const views = getLocalViews();
    const filtered = views.filter(v => v.id !== id);
    setLocalViews(filtered);
  }
}

export async function fetchShare(id: string) {
  try {
    const res = await fetch(`${base}/share/${id}`);
    if (!res.ok) throw new Error('Share not found');
    const data = await res.json();
    return data.view as SwitchboardView;
  } catch (err) {
    console.warn('API fetchShare failed, searching locally:', err);
    const view = getLocalViews().find(v => v.id === id);
    if (!view) throw new Error('Share not found');
    return view;
  }
}
