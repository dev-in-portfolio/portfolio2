<script setup lang="ts">
const route = useRoute();
const slug = route.params.publishedSlug as string;

const data = await $fetch(`/api/cardpress/public/${slug}`);
const page = data.page;
const cards = data.cards;
</script>

<template>
  <div class="page">
    <header class="hero">
      <h1>{{ page.title }}</h1>
    </header>
    <section class="stack">
      <article v-for="card in cards" :key="card.id" class="card">
        <h3>{{ card.title }}</h3>
        <p v-if="card.type === 'quote'">“{{ card.body }}”</p>
        <p v-else>{{ card.body }}</p>
        <img v-if="card.type === 'image'" :src="card.image_url" />
        <iframe v-if="card.type === 'embed'" :src="card.embed_url"></iframe>
      </article>
    </section>
  </div>
</template>

<style scoped>
.page {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 24px 64px;
}
.stack {
  display: grid;
  gap: 16px;
}
.card {
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.7);
}
img, iframe {
  width: 100%;
  border-radius: 12px;
  border: none;
}
</style>
