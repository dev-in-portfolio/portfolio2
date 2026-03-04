<template>
  <div class="page">
    <header class="hero">
      <h1>Nuxt ViewVault</h1>
      <p>Save, version, and reuse filtered table views with a server-backed state model.</p>
      <div class="badges">
        <span class="badge">State Presets</span>
        <span class="badge">Route-Aware</span>
        <span class="badge">Neon Backed</span>
      </div>
      <div class="actions">
        <NuxtLink class="primary" to="/demo">Launch Demo</NuxtLink>
        <NuxtLink class="ghost" to="/views">Manage Views</NuxtLink>
      </div>
    </header>
  </div>
</template>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 48px 24px;
}
.hero {
  padding: 24px;
  border-radius: 18px;
  border: 1px solid rgba(56, 189, 248, 0.28);
  background:
    radial-gradient(circle at 10% 10%, rgba(56, 189, 248, 0.2), transparent 45%),
    radial-gradient(circle at 90% 20%, rgba(34, 211, 238, 0.16), transparent 50%),
    rgba(15, 23, 42, 0.78);
}
.hero h1 {
  margin: 0 0 12px;
  font-size: clamp(32px, 4vw, 44px);
  letter-spacing: 0.015em;
}
.hero p {
  color: #cbd5e1;
  max-width: 60ch;
}
.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}
.badge {
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 0.82rem;
  color: #bae6fd;
  border: 1px solid rgba(125, 211, 252, 0.35);
  background: rgba(14, 116, 144, 0.25);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
}
.primary,
.ghost {
  min-height: 42px;
  padding: 8px 14px;
  border-radius: 10px;
  text-decoration: none;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.primary {
  border: 1px solid #22d3ee;
  color: #05242f;
  background: linear-gradient(180deg, #67e8f9, #22d3ee);
}
.ghost {
  border: 1px solid rgba(148, 163, 184, 0.45);
  color: #f8fafc;
  background: rgba(15, 23, 42, 0.5);
}
</style>
