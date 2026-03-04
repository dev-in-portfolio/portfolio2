<script setup lang="ts">
import type { DemoRow } from '~/data/demo';

defineProps<{
  rows: DemoRow[];
  columns: string[];
}>();
</script>

<template>
  <div class="panel">
    <table class="data-table">
      <thead>
        <tr>
          <th v-for="col in columns" :key="col">{{ col }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <td v-for="col in columns" :key="col">
            {{ (row as any)[col] }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.data-table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  text-align: left;
  padding: 11px 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}
th {
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: #7dd3fc;
}
tbody tr:hover td {
  background: rgba(56, 189, 248, 0.06);
}
td {
  color: #e2e8f0;
}
</style>
