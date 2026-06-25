<template>
  <div class="overlay" v-if="open">
    <div class="modal">
      <h3>Save View</h3>
      <p class="muted">Save this configuration as a named preset.</p>
      <input v-model="name" placeholder="View name" />
      <div class="actions">
        <button class="button" @click="save">Save</button>
        <button class="button secondary" @click="$emit('close')">Cancel</button>
      </div>
      <p class="status">{{ status }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'save', name: string): void; (e: 'close'): void }>();

const name = ref('');
const status = ref('');

function save() {
  if (!name.value.trim()) {
    status.value = 'Name required.';
    return;
  }
  emit('save', name.value.trim());
  name.value = '';
  status.value = '';
}

watch(
  () => props.open,
  (open) => {
    if (!open) {
      name.value = '';
      status.value = '';
    }
  }
);
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 6, 13, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  z-index: 999;
}

.modal {
  background: var(--panel-solid);
  border: 1px solid var(--border);
  padding: 1.75rem;
  border-radius: 16px;
  width: min(420px, 90vw);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.7), 0 0 20px var(--accent-glow);
  color: var(--ink);
}

input {
  width: 100%;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  background: #020409;
  color: var(--ink);
  border: 1px solid var(--border);
  margin: 1rem 0;
  outline: none;
  font-family: inherit;
}

input:focus {
  border-color: var(--accent-neon);
  box-shadow: 0 0 8px var(--accent-glow);
}

.actions {
  display: flex;
  gap: 0.75rem;
}

.status {
  color: var(--accent-neon);
  font-size: 0.8rem;
  margin-top: 0.5rem;
}

.muted {
  color: var(--muted);
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}
</style>
