<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
  (event: 'save', name: string): void;
}>();

const name = ref('');

const close = () => emit('update:modelValue', false);
const save = () => {
  if (!name.value.trim()) return;
  emit('save', name.value.trim());
  name.value = '';
  close();
};
</script>

<template>
  <div v-if="props.modelValue" class="modal">
    <div class="modal-card">
      <h3>Save View</h3>
      <p class="muted blurb">Create a named preset for this exact route state.</p>
      <input v-model="name" placeholder="View name" />
      <div class="actions">
        <button class="ghost" @click="close">Cancel</button>
        <button class="primary" @click="save">Save</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  display: grid;
  place-items: center;
}
.modal-card {
  background: rgba(15, 23, 42, 0.95);
  padding: 20px;
  border-radius: 16px;
  border: 1px solid rgba(125, 211, 252, 0.3);
  min-width: 280px;
  width: min(420px, calc(100vw - 40px));
}
.blurb {
  margin: 0 0 10px;
}
.actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
