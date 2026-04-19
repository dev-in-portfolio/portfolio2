<script setup lang="ts">
import { useDeviceKey } from '~/composables/useDeviceKey';

const deviceKey = useDeviceKey();
const route = useRoute();
const id = route.params.id as string;

const signal = ref<any>(null);
const rule = ref<any>(null);
const status = ref('');

const load = async () => {
  const { signals } = await $fetch('/api/signalgrid/board', {
    headers: { 'X-Device-Key': deviceKey },
  });
  signal.value = signals.find((s: any) => s.id === id);
  const { rule: data } = await $fetch(`/api/signalgrid/signals/${id}/rule`, {
    headers: { 'X-Device-Key': deviceKey },
  });
  rule.value = data || {};
};

const updateSignal = async () => {
  await $fetch(`/api/signalgrid/signals/${id}`, {
    method: 'PATCH',
    headers: { 'X-Device-Key': deviceKey },
    body: {
      note: signal.value.note,
      valueNum: signal.value.value_num,
      valueUnit: signal.value.value_unit,
      status: signal.value.status,
    },
  });
  status.value = 'Saved.';
};

const updateRule = async () => {
  await $fetch(`/api/signalgrid/signals/${id}/rule`, {
    method: 'POST',
    headers: { 'X-Device-Key': deviceKey },
    body: {
      warnIfGt: rule.value.warn_if_gt,
      warnIfLt: rule.value.warn_if_lt,
      badIfGt: rule.value.bad_if_gt,
      badIfLt: rule.value.bad_if_lt,
    },
  });
  status.value = 'Rule saved.';
};

onMounted(load);
</script>

<template>
  <div class="page" v-if="signal">
    <header class="hero">
      <h1>{{ signal.name }}</h1>
      <p class="muted">{{ signal.kind }}</p>
    </header>
    <section class="panel">
      <h2>Signal Details</h2>
      <input v-model="signal.note" placeholder="Note" />
      <div class="row">
        <input v-model="signal.value_num" placeholder="Value" />
        <input v-model="signal.value_unit" placeholder="Unit" />
        <select v-model="signal.status">
          <option value="ok">OK</option>
          <option value="warn">WARN</option>
          <option value="bad">BAD</option>
        </select>
      </div>
      <button class="primary" @click="updateSignal">Save</button>
    </section>
    <section class="panel">
      <h2>Threshold Rules</h2>
      <div class="row">
        <input v-model="rule.warn_if_gt" placeholder="Warn if >" />
        <input v-model="rule.warn_if_lt" placeholder="Warn if <" />
        <input v-model="rule.bad_if_gt" placeholder="Bad if >" />
        <input v-model="rule.bad_if_lt" placeholder="Bad if <" />
      </div>
      <button class="primary" @click="updateRule">Save Rule</button>
    </section>
    <p class="muted">{{ status }}</p>
  </div>
</template>

<style scoped>
.page {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 24px 64px;
}
.row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
</style>
