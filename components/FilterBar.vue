<script setup lang="ts">
const props = defineProps<{
  q: string;
  tag: string;
  status: string;
  sort: string;
  pageSize: number;
}>();

const emit = defineEmits<{
  (event: 'update', payload: Record<string, string | number>): void;
}>();

const qLocal = ref(props.q);
const tagLocal = ref(props.tag);
const statusLocal = ref(props.status);
const sortLocal = ref(props.sort);
const pageSizeLocal = ref(props.pageSize);

watch(
  () => [props.q, props.tag, props.status, props.sort, props.pageSize] as const,
  ([nextQ, nextTag, nextStatus, nextSort, nextPageSize]) => {
    qLocal.value = nextQ;
    tagLocal.value = nextTag;
    statusLocal.value = nextStatus;
    sortLocal.value = nextSort;
    pageSizeLocal.value = nextPageSize;
  },
);
</script>

<template>
  <div class="panel filter-bar">
    <label class="control">
      <span>Search</span>
      <input v-model="qLocal" placeholder="Search title" @input="emit('update', { q: qLocal })" />
    </label>

    <label class="control">
      <span>Tag</span>
      <select v-model="tagLocal" @change="emit('update', { tag: tagLocal })">
        <option value="">All tags</option>
        <option value="core">core</option>
        <option value="edge">edge</option>
        <option value="vault">vault</option>
        <option value="signal">signal</option>
        <option value="ops">ops</option>
      </select>
    </label>

    <label class="control">
      <span>Status</span>
      <select v-model="statusLocal" @change="emit('update', { status: statusLocal })">
        <option value="">All status</option>
        <option value="open">open</option>
        <option value="closed">closed</option>
        <option value="blocked">blocked</option>
      </select>
    </label>

    <label class="control">
      <span>Sort</span>
      <select v-model="sortLocal" @change="emit('update', { sort: sortLocal })">
        <option value="updated_desc">Newest</option>
        <option value="updated_asc">Oldest</option>
      </select>
    </label>

    <label class="control">
      <span>Page size</span>
      <select v-model.number="pageSizeLocal" @change="emit('update', { pageSize: pageSizeLocal })">
        <option :value="10">10</option>
        <option :value="20">20</option>
        <option :value="50">50</option>
      </select>
    </label>
  </div>
</template>

<style scoped>
.filter-bar {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.control {
  display: grid;
  gap: 6px;
}

.control > span {
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
}

input,
select {
  min-height: 38px;
}
</style>
