<script setup lang="ts">
defineProps<{
  views: any[];
}>();

const emit = defineEmits<{
  (event: 'apply', view: any): void;
  (event: 'delete', id: string): void;
}>();
</script>

<template>
  <div class="panel">
    <h3>Saved Views</h3>
    <p class="muted sub">Apply a stored route state instantly, or clear outdated presets.</p>
    <div v-if="views.length === 0" class="empty">
      No views saved yet. Create one from the current filter set.
    </div>
    <div v-else class="views">
      <div v-for="view in views" :key="view.id" class="view-card">
        <strong>{{ view.name }}</strong>
        <p class="muted">Updated {{ new Date(view.updated_at).toLocaleString() }}</p>
        <div class="actions">
          <button class="ghost" @click="emit('apply', view)">Apply</button>
          <button class="danger" @click="emit('delete', view.id)">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sub {
  margin: 4px 0 12px;
}
.views {
  display: grid;
  gap: 12px;
}
.view-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.7);
}
.empty {
  padding: 12px;
  border-radius: 12px;
  border: 1px dashed rgba(125, 211, 252, 0.35);
  color: #bae6fd;
  background: rgba(14, 116, 144, 0.15);
}
.actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
</style>
