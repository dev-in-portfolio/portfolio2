<template>
  <div class="panel">
    <div class="picker-header">
      <div>
        <h3>Saved Views</h3>
        <p class="muted">Route: {{ route }}</p>
      </div>
      <button class="button secondary" @click="refresh">Refresh</button>
    </div>
    <div class="picker-controls">
      <select v-model="selectedId">
        <option value="">Select a view</option>
        <option v-for="view in views" :key="view.id" :value="view.id">
          {{ view.name }}
        </option>
      </select>
      <button class="button" :disabled="!selectedId" @click="applySelected">Apply</button>
      <button class="button ghost" :disabled="!selectedId" @click="cloneSelected">Clone</button>
      <button class="button secondary" :disabled="!selectedId" @click="deleteSelected">Delete</button>
    </div>
    <div class="picker-actions">
      <button class="button" @click="$emit('open-save')">Save Current</button>
      <button class="button secondary" :disabled="!selectedId" @click="overwriteSelected">Overwrite</button>
    </div>
    <p class="status">{{ status }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { SwitchboardView, ViewState } from '../../core/api';
import { fetchViews, deleteView, updateView, createView } from '../../core/api';

const props = defineProps<{ route: string; currentState: ViewState }>();
const emit = defineEmits<{
  (e: 'apply', state: ViewState): void;
  (e: 'update:views', views: SwitchboardView[]): void;
}>();

const views = ref<SwitchboardView[]>([]);
const selectedId = ref('');
const status = ref('');

async function refresh() {
  try {
    const data = await fetchViews(props.route);
    views.value = data;
    emit('update:views', data);
    status.value = 'Views loaded.';
  } catch (err: any) {
    status.value = err.message;
  }
}

async function applySelected() {
  const view = views.value.find((v) => v.id === selectedId.value);
  if (!view) return;
  emit('apply', view.state);
  status.value = `Applied ${view.name}`;
}

async function cloneSelected() {
  const view = views.value.find((v) => v.id === selectedId.value);
  if (!view) return;
  try {
    const cloneName = `${view.name} Copy`;
    await createView(cloneName, props.route, view.state);
    await refresh();
    status.value = 'Cloned view.';
  } catch (err: any) {
    status.value = err.message;
  }
}

async function overwriteSelected() {
  const view = views.value.find((v) => v.id === selectedId.value);
  if (!view) return;
  try {
    await updateView(view.id, { state: props.currentState });
    await refresh();
    status.value = 'View overwritten.';
  } catch (err: any) {
    status.value = err.message;
  }
}

async function deleteSelected() {
  const view = views.value.find((v) => v.id === selectedId.value);
  if (!view) return;
  try {
    await deleteView(view.id);
    selectedId.value = '';
    await refresh();
    status.value = 'Deleted.';
  } catch (err: any) {
    status.value = err.message;
  }
}

watch(
  () => props.route,
  () => refresh(),
  { immediate: true }
);
</script>

<style scoped>
.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.picker-controls {
  display: grid;
  grid-template-columns: 1fr repeat(3, auto);
  gap: 0.5rem;
}

.picker-actions {
  margin-top: 0.75rem;
  display: flex;
  gap: 0.5rem;
}

select {
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #020409;
  color: var(--ink);
  outline: none;
}

select:focus {
  border-color: var(--accent-neon);
}

.status {
  margin-top: 0.5rem;
  color: var(--muted);
  font-size: 0.85rem;
}

.muted {
  color: var(--muted);
  font-size: 0.8rem;
}
</style>
