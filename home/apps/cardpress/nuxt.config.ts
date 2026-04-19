export default defineNuxtConfig({
  ssr: true,
  typescript: {
    strict: true
  },
  css: ['~/assets/main.css'],
  nitro: {
    preset: 'netlify'
  }
});
