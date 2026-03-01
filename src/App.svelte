<script lang="ts">
  const releaseVersion = "v0.1.8";
  const releaseRepo = "dev-in-portfolio/portfolio2";
  const releasesPage = `https://github.com/${releaseRepo}/releases`;

  const downloads = [
    {
      os: "macOS",
      label: "Download for macOS",
      note: "Apple Silicon + Intel",
      href: `https://github.com/${releaseRepo}/releases/download/v0.1.8/ClipForge-macOS.dmg`,
    },
    {
      os: "Windows",
      label: "Download for Windows",
      note: "MSI installer",
      href: `https://github.com/${releaseRepo}/releases/download/v0.1.8/ClipForge-Windows-x64.msi`,
    },
    {
      os: "Linux",
      label: "Download for Linux",
      note: "Debian package (.deb)",
      href: `https://github.com/${releaseRepo}/releases/download/v0.1.8/ClipForge-Linux-amd64.deb`,
    },
  ];
</script>

<div class="page">
  <header class="hero">
    <p class="eyebrow">Desktop App</p>
    <h1>ClipForge</h1>
    <p class="subtitle">Fast, local-first clipboard pipelines with preview-before-apply control.</p>
    <p class="meta">Current release: {releaseVersion}</p>
    <p class="meta"><a class="release-link" href={releasesPage} rel="noopener noreferrer">Browse all releases</a></p>
  </header>

  <section class="downloads" aria-label="Downloads">
    {#each downloads as item}
      <article class="download-card">
        <h2>{item.os}</h2>
        <p>{item.note}</p>
        <a class="download-btn" href={item.href} rel="noopener noreferrer">{item.label}</a>
      </article>
    {/each}
  </section>

  <section class="details" aria-label="Product details">
    <div class="detail-card">
      <h3>What You Get</h3>
      <ul>
        <li>Clipboard history with pinning</li>
        <li>Reusable transform pipelines</li>
        <li>Preview before overwrite</li>
        <li>Local persistence only</li>
      </ul>
    </div>
    <div class="detail-card">
      <h3>Why Desktop</h3>
      <p>ClipForge uses native clipboard integrations through Tauri. The web deploy is intentionally a landing page with direct binary downloads.</p>
    </div>
  </section>
</div>
