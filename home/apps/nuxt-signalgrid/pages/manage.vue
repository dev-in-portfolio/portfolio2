<script setup lang="ts">
import { useDeviceKey } from '~/composables/useDeviceKey';

const deviceKey = useDeviceKey();
const bulk = ref('');
const status = ref('');

const createBatch = async () => {
  const lines = bulk.value.split('\n').map((line) => line.trim()).filter(Boolean);
  for (const name of lines) {
    await $fetch('/api/signalgrid/signals', {
      method: 'POST',
      headers: { 'X-Device-Key': deviceKey },
      body: { name },
    });
  }
  status.value = `Created ${lines.length} signals.`;
  bulk.value = '';
};
</script>

<template>
  <div class="page">
    <header class="hero">
      <h1>Manage Signals</h1>
      <p>Bulk create signals by pasting names.</p>
    </header>
    <section class="panel">
      <textarea v-model="bulk" rows="8" placeholder="One signal per line"></textarea>
      <button class="primary" @click="createBatch">Create</button>
      <p class="muted">{{ status }}</p>
    </section>
  </div>
</template>

<style scoped>
.page {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 24px 64px;
}
</style>
