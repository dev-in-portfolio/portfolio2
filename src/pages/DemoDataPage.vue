<template>
  <div class="workspace">
    <!-- Top Dashboard Toolbar -->
    <header class="toolbar panel">
      <div class="toolbar-left">
        <span class="status-indicator"></span>
        <div class="route-display">
          <span class="muted">Active Route:</span>
          <span class="mono route-path">{{ routePath }}</span>
        </div>
      </div>
      <div class="toolbar-right">
        <ViewPicker
          :route="routePath"
          :current-state="state"
          @apply="applyState"
          @open-save="openSave = true"
        />
        <button class="button secondary icon-btn" @click="copyShare" title="Copy URL Preset">
          <span>🔗</span> Copy Share URL
        </button>
        <span class="share-toast" v-if="shareStatus">{{ shareStatus }}</span>
      </div>
    </header>

    <div class="layout-main">
      <!-- Left Column: Visual Query Node Flow & Exporter -->
      <div class="side-panel">
        <!-- Visual Node Flow Query Builder -->
        <section class="panel flow-builder-card">
          <div class="card-header">
            <h3>Visual Query Flow</h3>
            <span class="badge">Connected</span>
          </div>
          <p class="muted subtitle">Pipeline of query operations filtering and sorting dataset inputs.</p>

          <div class="flow-nodes">
            <!-- Node 1: Input Dataset -->
            <div class="flow-node">
              <div class="node-icon">📥</div>
              <div class="node-body">
                <div class="node-title">Dataset Source</div>
                <div class="node-content mono">{{ dataset.length }} records loaded</div>
              </div>
            </div>

            <div class="flow-line"></div>

            <!-- Node 2: Search Node -->
            <div class="flow-node" :class="{ active: state.q }">
              <div class="node-icon">🔍</div>
              <div class="node-body">
                <div class="node-title">Text Search Filter</div>
                <div class="node-content">
                  <input
                    type="text"
                    v-model="state.q"
                    class="node-input"
                    placeholder="Search keywords..."
                  />
                </div>
              </div>
            </div>

            <div class="flow-line"></div>

            <!-- Node 3: Column Filter Options -->
            <div class="flow-node active">
              <div class="node-icon">⚏</div>
              <div class="node-body">
                <div class="node-title">Columns Projector</div>
                <div class="node-content">
                  <div class="chip-group">
                    <button
                      v-for="col in columnOptions"
                      :key="col"
                      :class="['chip', state.columns.includes(col) ? 'active' : '']"
                      @click="toggleColumn(col)"
                    >
                      {{ col }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="flow-line"></div>

            <!-- Node 4: Status / Tag Filter Nodes -->
            <div class="flow-node" :class="{ active: state.filters.status?.length || state.filters.tag?.length }">
              <div class="node-icon">⚙</div>
              <div class="node-body">
                <div class="node-title">Categorical Filters</div>
                <div class="node-content">
                  <div class="filter-section">
                    <span class="sub-label">Status</span>
                    <div class="chip-group">
                      <button
                        v-for="item in statusOptions"
                        :key="item"
                        :class="['chip', state.filters.status?.includes(item) ? 'active' : '']"
                        @click="toggleFilter('status', item)"
                      >
                        {{ item }}
                      </button>
                    </div>
                  </div>
                  <div class="filter-section" style="margin-top: 8px;">
                    <span class="sub-label">Tags</span>
                    <div class="chip-group">
                      <button
                        v-for="item in tagOptions"
                        :key="item"
                        :class="['chip', state.filters.tag?.includes(item) ? 'active' : '']"
                        @click="toggleFilter('tag', item)"
                      >
                        {{ item }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="flow-line"></div>

            <!-- Node 5: Sort Node -->
            <div class="flow-node active">
              <div class="node-icon">⇵</div>
              <div class="node-body">
                <div class="node-title">Dataset Sorter</div>
                <div class="node-content row-controls">
                  <select v-model="state.sort.field" class="node-select">
                    <option value="updated_at">Updated</option>
                    <option value="title">Title</option>
                    <option value="status">Status</option>
                    <option value="owner">Owner</option>
                  </select>
                  <select v-model="state.sort.dir" class="node-select">
                    <option value="desc">DESC</option>
                    <option value="asc">ASC</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="flow-line"></div>

            <!-- Node 6: Spreadsheet Output Node -->
            <div class="flow-node output-node">
              <div class="node-icon">📊</div>
              <div class="node-body">
                <div class="node-title">Spreadsheet Output</div>
                <div class="node-content mono">{{ filtered.length }} rows matching pipeline</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Live Exporter Pane -->
        <section class="panel exporter-card">
          <div class="exporter-tabs">
            <button
              v-for="tab in ['JSON', 'CSV', 'SQL Query']"
              :key="tab"
              :class="['tab-btn', activeExportTab === tab ? 'active' : '']"
              @click="activeExportTab = tab"
            >
              {{ tab }}
            </button>
          </div>
          <div class="exporter-content">
            <pre class="mono code-box"><code>{{ exportOutput }}</code></pre>
            <button class="button copy-export-btn" @click="copyExportCode">
              <span>📋</span> Copy Output
            </button>
          </div>
        </section>
      </div>

      <!-- Right Column: Interactive Tactile Spreadsheet -->
      <div class="main-content">
        <section class="panel spreadsheet-card">
          <div class="card-header">
            <div>
              <h3>Interactive Spreadsheet</h3>
              <p class="muted subtitle">Double-click cells to edit contents inline. Drag column headers to resize.</p>
            </div>
            <div class="progress-container">
              <span class="progress-label mono">{{ filtered.length }}/{{ dataset.length }} matching</span>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: (filtered.length / dataset.length) * 100 + '%' }"></div>
              </div>
            </div>
          </div>

          <div class="table-container" @mousemove="handleResize" @mouseup="stopResize">
            <table class="table" :style="{ tableLayout: 'fixed' }">
              <thead>
                <tr>
                  <th
                    v-for="col in state.columns"
                    :key="col"
                    :style="{ width: colWidths[col] || '150px', position: 'relative' }"
                    class="resizable-th"
                  >
                    <div class="th-content" @click="cycleSort(col)">
                      <span>{{ col }}</span>
                      <span class="sort-icon" v-if="state.sort.field === col">
                        {{ state.sort.dir === 'asc' ? ' ▲' : ' ▼' }}
                      </span>
                    </div>
                    <div class="resize-handle" @mousedown.prevent="startResize($event, col)"></div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in paged" :key="row.id">
                  <td
                    v-for="col in state.columns"
                    :key="col"
                    @dblclick="startEdit(row.id, col, row[col])"
                    class="spreadsheet-td"
                  >
                    <!-- Inline Editing mode -->
                    <div v-if="editingCell?.id === row.id && editingCell?.col === col">
                      <input
                        :id="`edit-${row.id}-${col}`"
                        v-model="editValue"
                        @blur="saveEdit(row.id, col)"
                        @keyup.enter="saveEdit(row.id, col)"
                        @keyup.esc="cancelEdit"
                        class="cell-edit-input"
                      />
                    </div>
                    <!-- View mode -->
                    <div v-else class="cell-view-container">
                      <span v-if="col === 'tag'" class="badge">{{ row.tag }}</span>
                      <span v-else-if="col === 'status'" :class="['status-badge', row.status]">
                        {{ row.status }}
                      </span>
                      <span v-else-if="col === 'updated_at'" class="mono text-muted">{{ row.updated_at }}</span>
                      <span v-else>{{ row[col] }}</span>
                      <span class="edit-hover-indicator">✏️</span>
                    </div>
                  </td>
                </tr>
                <tr v-if="paged.length === 0">
                  <td :colspan="state.columns.length" class="empty-state">
                    No records match the current filters. Clear filters in the Visual Flow builder to inspect data.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="spreadsheet-footer">
            <div class="page-size-selector">
              <label class="muted">Page Size:</label>
              <input type="range" min="5" max="30" step="5" v-model.number="state.pageSize" class="range-slider" />
              <span class="mono">{{ state.pageSize }} rows</span>
            </div>

            <div class="pagination">
              <button class="button secondary" :disabled="page <= 1" @click="page = Math.max(1, page - 1)">Prev</button>
              <span class="mono page-display">Page {{ page }} / {{ totalPages }}</span>
              <button class="button secondary" :disabled="page >= totalPages" @click="page = Math.min(totalPages, page + 1)">Next</button>
            </div>
          </div>
        </section>
      </div>
    </div>

    <SaveViewModal
      :open="openSave"
      @save="saveView"
      @close="openSave = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ViewPicker from '../features/views/ViewPicker.vue';
import SaveViewModal from '../features/views/SaveViewModal.vue';
import { createView, fetchShare } from '../core/api';
import type { ViewState } from '../core/api';

const router = useRouter();
const route = useRoute();
const routePath = route.path;

const defaultState: ViewState = {
  q: '',
  filters: { tag: [], status: [] },
  sort: { field: 'updated_at', dir: 'desc' },
  columns: ['title', 'status', 'tag', 'updated_at'],
  pageSize: 10,
};

const state = ref<ViewState>({ ...defaultState });
const openSave = ref(false);
const shareStatus = ref('');
const activeExportTab = ref('JSON');

// In-memory editable dataset
const dataset = ref([
  { id: 1, title: 'Exhibit Lighting Plan', status: 'open', tag: 'ops', updated_at: '2026-02-20', owner: 'Aria' },
  { id: 2, title: 'Gallery Motion Sensors', status: 'review', tag: 'safety', updated_at: '2026-02-18', owner: 'Kai' },
  { id: 3, title: 'Audio Tour Script', status: 'done', tag: 'content', updated_at: '2026-02-12', owner: 'Nova' },
  { id: 4, title: 'Wayfinding Signage', status: 'open', tag: 'design', updated_at: '2026-02-10', owner: 'Ivy' },
  { id: 5, title: 'Archive Label Taxonomy', status: 'review', tag: 'taxonomy', updated_at: '2026-02-06', owner: 'Aiden' },
  { id: 6, title: 'Interactive Kiosk Patch', status: 'done', tag: 'ops', updated_at: '2026-02-01', owner: 'Lena' },
  { id: 7, title: 'Visitor Flow Draft', status: 'open', tag: 'planning', updated_at: '2026-01-28', owner: 'Zoe' },
  { id: 8, title: 'Ingress Monitoring', status: 'review', tag: 'safety', updated_at: '2026-01-25', owner: 'Raj' },
]);

const statusOptions = ['open', 'review', 'done'];
const tagOptions = ['ops', 'safety', 'content', 'design', 'taxonomy', 'planning'];
const columnOptions = ['title', 'status', 'tag', 'updated_at', 'owner'];

const page = ref(1);

// Spreadsheet Column Resizing State
const colWidths = ref<Record<string, string>>({
  title: '250px',
  status: '120px',
  tag: '120px',
  updated_at: '140px',
  owner: '120px',
});

let resizingCol = '';
let startX = 0;
let startWidth = 0;

function startResize(e: MouseEvent, col: string) {
  resizingCol = col;
  startX = e.clientX;
  startWidth = parseInt(colWidths.value[col]) || 120;
  window.addEventListener('mousemove', handleResize);
  window.addEventListener('mouseup', stopResize);
}

function handleResize(e: MouseEvent) {
  if (!resizingCol) return;
  const diff = e.clientX - startX;
  colWidths.value[resizingCol] = `${Math.max(80, startWidth + diff)}px`;
}

function stopResize() {
  if (resizingCol) {
    resizingCol = '';
    window.removeEventListener('mousemove', handleResize);
    window.removeEventListener('mouseup', stopResize);
  }
}

// Inline Cell Editing State
const editingCell = ref<{ id: number; col: string } | null>(null);
const editValue = ref('');

function startEdit(rowId: number, col: string, val: any) {
  editingCell.value = { id: rowId, col };
  editValue.value = String(val || '');
  setTimeout(() => {
    const input = document.getElementById(`edit-${rowId}-${col}`);
    if (input) (input as HTMLInputElement).focus();
  }, 50);
}

function saveEdit(rowId: number, col: string) {
  if (!editingCell.value) return;
  const row = dataset.value.find((r) => r.id === rowId);
  if (row) {
    (row as any)[col] = editValue.value;
  }
  editingCell.value = null;
}

function cancelEdit() {
  editingCell.value = null;
}

// Filter and Sort Pipeline Computations
const filtered = computed(() => {
  let rows = [...dataset.value];
  if (state.value.q) {
    const q = state.value.q.toLowerCase();
    rows = rows.filter((row) => row.title.toLowerCase().includes(q));
  }
  if (state.value.filters.status?.length) {
    rows = rows.filter((row) => state.value.filters.status?.includes(row.status));
  }
  if (state.value.filters.tag?.length) {
    rows = rows.filter((row) => state.value.filters.tag?.includes(row.tag));
  }
  rows.sort((a, b) => {
    const dir = state.value.sort.dir === 'asc' ? 1 : -1;
    const field = state.value.sort.field as keyof typeof a;
    if (a[field] < b[field]) return -1 * dir;
    if (a[field] > b[field]) return 1 * dir;
    return 0;
  });
  return rows;
});

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / state.value.pageSize)));
const paged = computed(() => {
  const start = (page.value - 1) * state.value.pageSize;
  return filtered.value.slice(start, start + state.value.pageSize);
});

function toggleFilter(key: 'status' | 'tag', value: string) {
  const list = state.value.filters[key] || [];
  if (list.includes(value)) {
    state.value.filters[key] = list.filter((item) => item !== value);
  } else {
    state.value.filters[key] = [...list, value];
  }
  page.value = 1;
}

function toggleColumn(col: string) {
  if (state.value.columns.includes(col)) {
    state.value.columns = state.value.columns.filter((c) => c !== col);
  } else {
    state.value.columns = [...state.value.columns, col];
  }
}

function cycleSort(col: string) {
  if (state.value.sort.field === col) {
    state.value.sort.dir = state.value.sort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    state.value.sort.field = col;
    state.value.sort.dir = 'asc';
  }
}

function applyState(newState: ViewState) {
  state.value = JSON.parse(JSON.stringify(newState));
  page.value = 1;
}

async function saveView(name: string) {
  try {
    await createView(name, routePath, state.value);
    openSave.value = false;
    shareStatus.value = 'View saved.';
    setTimeout(() => (shareStatus.value = ''), 3000);
  } catch (err: any) {
    shareStatus.value = err.message;
    setTimeout(() => (shareStatus.value = ''), 4000);
  }
}

async function copyShare() {
  try {
    const url = new URL(window.location.href);
    await navigator.clipboard.writeText(url.toString());
    shareStatus.value = 'Preset URL copied.';
    setTimeout(() => (shareStatus.value = ''), 3000);
  } catch {
    shareStatus.value = 'Copy failed.';
    setTimeout(() => (shareStatus.value = ''), 3000);
  }
}

// Exporter Generation Computations
const exportOutput = computed(() => {
  if (activeExportTab.value === 'SQL Query') {
    let selectCols = state.value.columns.join(', ');
    let query = `SELECT ${selectCols}\nFROM datasets.switchboard`;
    const conditions: string[] = [];
    if (state.value.q) {
      conditions.push(`title ILIKE '%${state.value.q.replace(/'/g, "''")}%'`);
    }
    if (state.value.filters.status?.length) {
      const list = state.value.filters.status.map(s => `'${s}'`).join(', ');
      conditions.push(`status IN (${list})`);
    }
    if (state.value.filters.tag?.length) {
      const list = state.value.filters.tag.map(t => `'${t}'`).join(', ');
      conditions.push(`tag IN (${list})`);
    }
    if (conditions.length) {
      query += `\nWHERE ` + conditions.join('\n  AND ');
    }
    query += `\nORDER BY ${state.value.sort.field} ${state.value.sort.dir.toUpperCase()}`;
    query += `\nLIMIT ${state.value.pageSize};`;
    return query;
  } else if (activeExportTab.value === 'CSV') {
    const headers = state.value.columns.join(',');
    const rows = filtered.value.map(row =>
      state.value.columns.map(col => {
        const val = String((row as any)[col] || '');
        return val.includes(',') ? `"${val}"` : val;
      }).join(',')
    ).join('\n');
    return `${headers}\n${rows}`;
  } else {
    // JSON
    const mapped = filtered.value.map(row => {
      const obj: any = {};
      state.value.columns.forEach(col => {
        obj[col] = (row as any)[col];
      });
      return obj;
    });
    return JSON.stringify(mapped, null, 2);
  }
});

async function copyExportCode() {
  try {
    await navigator.clipboard.writeText(exportOutput.value);
    const oldLabel = activeExportTab.value;
    activeExportTab.value = 'Copied to Clipboard! ✓';
    setTimeout(() => {
      activeExportTab.value = oldLabel;
    }, 1500);
  } catch (err) {
    console.error(err);
  }
}

function syncFromQuery() {
  const q = route.query.q as string | undefined;
  const tag = route.query.tag as string | undefined;
  const status = route.query.status as string | undefined;
  const sort = route.query.sort as string | undefined;
  const dir = route.query.dir as string | undefined;
  const cols = route.query.cols as string | undefined;
  const pageSize = route.query.pageSize as string | undefined;

  state.value.q = q || '';
  state.value.filters.tag = tag ? tag.split(',') : [];
  state.value.filters.status = status ? status.split(',') : [];
  state.value.sort.field = sort || 'updated_at';
  state.value.sort.dir = dir === 'asc' ? 'asc' : 'desc';
  state.value.columns = cols ? cols.split(',') : [...defaultState.columns];
  state.value.pageSize = pageSize ? Number(pageSize) : defaultState.pageSize;
}

function syncToQuery() {
  router.replace({
    query: {
      q: state.value.q || undefined,
      tag: state.value.filters.tag?.length ? state.value.filters.tag.join(',') : undefined,
      status: state.value.filters.status?.length ? state.value.filters.status.join(',') : undefined,
      sort: state.value.sort.field,
      dir: state.value.sort.dir,
      cols: state.value.columns.join(','),
      pageSize: String(state.value.pageSize),
    },
  });
}

onMounted(() => {
  syncFromQuery();
  const shareId = route.query.share as string | undefined;
  if (shareId) {
    fetchShare(shareId)
      .then((view) => {
        applyState(view.state);
      })
      .catch(() => {
        shareStatus.value = 'Preset share link not found.';
        setTimeout(() => (shareStatus.value = ''), 4000);
      });
  }
});

watch(state, () => {
  syncToQuery();
}, { deep: true });
</script>

<style scoped>
.workspace {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Toolbar */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 1rem 1.5rem;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent-neon);
  box-shadow: 0 0 10px var(--accent-neon);
  animation: pulse 2s infinite ease-in-out;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.route-display {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
}

.route-path {
  color: var(--accent-neon);
  background: rgba(6, 182, 212, 0.1);
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid rgba(6, 182, 212, 0.15);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}

.share-toast {
  position: absolute;
  bottom: -32px;
  right: 0;
  font-size: 0.8rem;
  color: var(--accent-neon);
  background: var(--bg-darker);
  border: 1px solid var(--border);
  padding: 4px 10px;
  border-radius: 6px;
  z-index: 10;
}

/* Layout Grid */
.layout-main {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 24px;
  align-items: start;
}

@media (max-width: 1080px) {
  .layout-main {
    grid-template-columns: 1fr;
  }
}

.side-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Card Titles */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 12px;
  margin-bottom: 12px;
}

.card-header h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.subtitle {
  font-size: 0.8rem;
  margin: 0 0 16px;
  line-height: 1.4;
}

/* Flow Builder */
.flow-nodes {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.flow-node {
  display: flex;
  gap: 12px;
  background: rgba(4, 6, 13, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px;
  position: relative;
  transition: all 0.3s ease;
}

.flow-node.active {
  border-color: rgba(6, 182, 212, 0.3);
  background: rgba(6, 182, 212, 0.03);
  box-shadow: 0 0 10px rgba(6, 182, 212, 0.05);
}

.flow-node.output-node {
  border-color: rgba(16, 185, 129, 0.3);
  background: rgba(16, 185, 129, 0.03);
}

.node-icon {
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.flow-node.active .node-icon {
  background: rgba(6, 182, 212, 0.15);
  border-color: var(--accent-neon);
  color: #fff;
}

.flow-node.output-node .node-icon {
  background: rgba(16, 185, 129, 0.15);
  border-color: var(--success);
}

.node-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.node-title {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.flow-node.active .node-title {
  color: var(--ink);
}

.node-content {
  font-size: 0.85rem;
}

.node-input {
  width: 100%;
  background: #020409;
  border: 1px solid var(--border);
  color: var(--ink);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  outline: none;
}

.node-input:focus {
  border-color: var(--accent-neon);
}

.node-select {
  background: #020409;
  border: 1px solid var(--border);
  color: var(--ink);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
  outline: none;
}

.row-controls {
  display: flex;
  gap: 8px;
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sub-label {
  font-size: 0.72rem;
  color: var(--muted);
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.chip {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: var(--muted);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chip:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--ink);
}

.chip.active {
  background: rgba(6, 182, 212, 0.15);
  border-color: var(--accent-neon);
  color: var(--accent-neon);
  font-weight: 500;
}

.flow-line {
  height: 16px;
  width: 2px;
  background: linear-gradient(to bottom, rgba(6, 182, 212, 0.2), transparent);
  margin-left: 28px;
  position: relative;
}

.flow-line::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid rgba(6, 182, 212, 0.3);
}

/* Exporter */
.exporter-card {
  padding: 1rem;
}

.exporter-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 10px;
  gap: 4px;
}

.tab-btn {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--muted);
  padding: 6px 12px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  color: var(--ink);
}

.tab-btn.active {
  color: var(--accent-neon);
  border-bottom-color: var(--accent-neon);
}

.exporter-content {
  position: relative;
}

.code-box {
  margin: 0;
  padding: 10px;
  background: #020409;
  border: 1px solid var(--border);
  border-radius: 8px;
  height: 140px;
  overflow-y: auto;
  font-size: 0.72rem;
  color: #a5f3fc;
}

.copy-export-btn {
  width: 100%;
  margin-top: 8px;
  font-size: 0.75rem;
  padding: 6px 12px;
}

/* Spreadsheet Card */
.spreadsheet-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.progress-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.progress-label {
  font-size: 0.75rem;
  color: var(--accent-neon);
}

.progress-bar {
  width: 120px;
  height: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.02);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-neon));
  box-shadow: 0 0 8px var(--accent-neon);
  transition: width 0.3s ease;
}

/* Resizable TH */
.resizable-th {
  position: relative;
}

.th-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  cursor: pointer;
}

.sort-icon {
  font-size: 0.7rem;
  opacity: 0.8;
}

.resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  background: transparent;
  transition: background-color 0.2s;
}

.resize-handle:hover,
.resizable-th:hover .resize-handle {
  background: rgba(6, 182, 212, 0.2);
}

/* Spreadsheet Cells */
.spreadsheet-td {
  position: relative;
  cursor: cell;
}

.cell-view-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.edit-hover-indicator {
  font-size: 0.7rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.spreadsheet-td:hover .edit-hover-indicator {
  opacity: 0.5;
}

.cell-edit-input {
  width: 100%;
  background: #020409;
  border: 1px solid var(--accent-neon);
  color: var(--ink);
  padding: 4px 6px;
  border-radius: 4px;
  outline: none;
  font-family: inherit;
  font-size: inherit;
  box-shadow: 0 0 6px var(--accent-glow);
}

.status-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.open {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.status-badge.review {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.status-badge.done {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.empty-state {
  text-align: center;
  padding: 2.5rem;
  color: var(--muted);
  font-style: italic;
}

/* Footer controls */
.spreadsheet-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 16px;
  gap: 16px;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
}

.range-slider {
  -webkit-appearance: none;
  width: 100px;
  background: rgba(255,255,255,0.05);
  height: 4px;
  border-radius: 2px;
  outline: none;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-neon);
  cursor: pointer;
  box-shadow: 0 0 5px var(--accent-neon);
}

.pagination {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-display {
  font-size: 0.85rem;
}
</style>
