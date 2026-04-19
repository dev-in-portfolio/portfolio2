<script setup lang="ts">
import { useDeviceKey } from '~/composables/useDeviceKey';

const deviceKey = useDeviceKey();
const pages = ref<any[]>([]);
const title = ref('');
const slug = ref('');

const load = async () => {
  const { pages: data } = await $fetch('/api/cardpress/pages', {
    headers: { 'X-Device-Key': deviceKey },
  });
  pages.value = data;
};

const create = async () => {
  if (!title.value || !slug.value) return;
  await $fetch('/api/cardpress/pages', {
    method: 'POST',
    headers: { 'X-Device-Key': deviceKey },
    body: { title: title.value, slug: slug.value },
  });
  title.value = '';
  slug.value = '';
  await load();
};

onMounted(load);
</script>

<template>
  <div class="page">
    <header class="hero">
      <h1>CardPress Dashboard</h1>
      <p>Create, edit, and publish card-driven pages with a clean editorial workflow.</p>
    </header>
    <section class="panel composer">
      <h2>New Page</h2>
      <p class="sub">Start a draft, then build cards in the editor.</p>
      <div class="row compose-row">
        <input v-model="title" placeholder="Title" />
        <input v-model="slug" placeholder="slug" />
        <button class="primary" @click="create">Create</button>
      </div>
    </section>
    <section class="grid">
      <article v-for="page in pages" :key="page.id" class="card">
        <h3>{{ page.title }}</h3>
        <p class="muted">/{{ page.slug }}</p>
        <p class="muted">Status: {{ page.status }}</p>
        <div class="actions">
          <NuxtLink class="action edit" :to="`/edit/${page.id}`">Edit</NuxtLink>
          <NuxtLink v-if="page.published_slug" class="action live" :to="`/p/${page.published_slug}`">Public</NuxtLink>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 24px 64px;
}
.hero {
  margin-bottom: 18px;
}
.hero h1 {
  margin: 0 0 8px;
  font-size: clamp(28px, 4vw, 40px);
  letter-spacing: 0.02em;
}
.hero p {
  color: #cbd5e1;
}
.row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.panel.composer {
  border: 1px solid rgba(251, 146, 60, 0.35);
  border-radius: 16px;
  padding: 16px;
  background: linear-gradient(155deg, rgba(30, 18, 8, 0.9), rgba(15, 23, 42, 0.78));
}
.sub {
  color: #fdba74;
  margin-top: 0;
  margin-bottom: 10px;
}
.compose-row input {
  min-height: 42px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.72);
  color: #f8fafc;
  padding: 10px 12px;
}
.compose-row input::placeholder {
  color: #94a3b8;
}
.primary {
  min-height: 42px;
  border-radius: 10px;
  border: 1px solid #f59e0b;
  background: linear-gradient(180deg, #f59e0b, #d97706);
  color: #111827;
  font-weight: 700;
  padding: 0 14px;
  cursor: pointer;
}
.grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  margin-top: 16px;
}
.card {
  background: rgba(15, 23, 42, 0.75);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  box-shadow: 0 8px 20px rgba(2, 6, 23, 0.22);
}
.actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}
.action {
  text-decoration: none;
  border-radius: 10px;
  padding: 8px 12px;
  font-weight: 700;
  border: 1px solid rgba(148, 163, 184, 0.4);
}
.action.edit {
  color: #fde68a;
  background: rgba(146, 64, 14, 0.28);
}
.action.live {
  color: #86efac;
  background: rgba(20, 83, 45, 0.25);
}
</style>
