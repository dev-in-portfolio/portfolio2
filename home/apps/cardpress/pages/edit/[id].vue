<script setup lang="ts">
import { useDeviceKey } from '~/composables/useDeviceKey';

const deviceKey = useDeviceKey();
const route = useRoute();
const pageId = route.params.id as string;

const page = ref<any>(null);
const cards = ref<any[]>([]);
const activeId = ref<string | null>(null);
const status = ref('');

const load = async () => {
  const data = await $fetch(`/api/cardpress/pages/${pageId}`, {
    headers: { 'X-Device-Key': deviceKey },
  });
  page.value = data.page;
  cards.value = data.cards;
  activeId.value = cards.value[0]?.id ?? null;
};

const activeCard = computed(() => cards.value.find((card) => card.id === activeId.value));

const addCard = async (type: string) => {
  await $fetch(`/api/cardpress/pages/${pageId}/cards`, {
    method: 'POST',
    headers: { 'X-Device-Key': deviceKey },
    body: { type, title: 'New Card', body: '' },
  });
  await load();
};

const updateCard = async (payload: any) => {
  if (!activeCard.value) return;
  await $fetch(`/api/cardpress/cards/${activeCard.value.id}`, {
    method: 'PATCH',
    headers: { 'X-Device-Key': deviceKey },
    body: payload,
  });
  await load();
};

const removeCard = async () => {
  if (!activeCard.value) return;
  await $fetch(`/api/cardpress/cards/${activeCard.value.id}`, {
    method: 'DELETE',
    headers: { 'X-Device-Key': deviceKey },
  });
  await load();
};

const move = async (direction: 'up' | 'down') => {
  if (!activeCard.value) return;
  const index = cards.value.findIndex((card) => card.id === activeCard.value.id);
  const swap = direction === 'up' ? cards.value[index - 1] : cards.value[index + 1];
  if (!swap) return;
  await updateCard({ ord: swap.ord });
  await $fetch(`/api/cardpress/cards/${swap.id}`, {
    method: 'PATCH',
    headers: { 'X-Device-Key': deviceKey },
    body: { ord: activeCard.value.ord },
  });
  await load();
};

const publish = async () => {
  const data = await $fetch(`/api/cardpress/pages/${pageId}`, {
    method: 'PATCH',
    headers: { 'X-Device-Key': deviceKey },
    body: { status: 'published' },
  });
  page.value = data.page;
  status.value = 'Published.';
};

onMounted(load);
</script>

<template>
  <div class="page">
    <header class="hero">
      <h1>{{ page?.title }}</h1>
      <p class="muted">/{{ page?.slug }}</p>
      <div class="actions">
        <button class="primary" @click="publish">Publish</button>
        <span class="muted">{{ status }}</span>
      </div>
    </header>
    <div class="editor">
      <section class="panel">
        <h2>Cards</h2>
        <div class="actions">
          <button class="ghost" @click="addCard('text')">Text</button>
          <button class="ghost" @click="addCard('image')">Image</button>
          <button class="ghost" @click="addCard('quote')">Quote</button>
          <button class="ghost" @click="addCard('embed')">Embed</button>
        </div>
        <ul class="list">
          <li v-for="card in cards" :key="card.id">
            <button class="ghost" @click="activeId = card.id">{{ card.ord }} · {{ card.title }}</button>
          </li>
        </ul>
      </section>
      <section class="panel" v-if="activeCard">
        <h2>Edit Card</h2>
        <input v-model="activeCard.title" @input="updateCard({ title: activeCard.title })" />
        <textarea v-model="activeCard.body" @input="updateCard({ body: activeCard.body })"></textarea>
        <input v-if="activeCard.type === 'image'" v-model="activeCard.image_url" @input="updateCard({ image_url: activeCard.image_url })" placeholder="Image URL" />
        <input v-if="activeCard.type === 'embed'" v-model="activeCard.embed_url" @input="updateCard({ embed_url: activeCard.embed_url })" placeholder="Embed URL" />
        <div class="actions">
          <button class="ghost" @click="move('up')">Move Up</button>
          <button class="ghost" @click="move('down')">Move Down</button>
          <button class="danger" @click="removeCard">Delete</button>
        </div>
      </section>
      <section class="panel">
        <h2>Preview</h2>
        <div v-for="card in cards" :key="card.id" class="card">
          <h3>{{ card.title }}</h3>
          <p v-if="card.type === 'quote'">“{{ card.body }}”</p>
          <p v-else>{{ card.body }}</p>
          <img v-if="card.type === 'image'" :src="card.image_url" />
          <iframe v-if="card.type === 'embed'" :src="card.embed_url"></iframe>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px 64px;
}
.editor {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}
.list {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 8px;
}
.card {
  margin-bottom: 12px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.6);
}
iframe, img {
  width: 100%;
  border: none;
  border-radius: 12px;
}
</style>
