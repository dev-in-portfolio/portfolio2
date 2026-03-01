<script lang="ts">
  const releaseVersion = "v0.1.0";
  const releasesPage = "https://github.com/dev-in-portfolio/portfolio2/releases";
  const downloads = [
    { os: "macOS", label: "Download for macOS", note: "Apple Silicon + Intel", href: "https://github.com/dev-in-portfolio/portfolio2/releases/latest/download/RepoPilot-macOS.dmg" },
    { os: "Windows", label: "Download for Windows", note: "x64 installer", href: "https://github.com/dev-in-portfolio/portfolio2/releases/latest/download/RepoPilot-Windows-x64-setup.exe" },
    { os: "Linux", label: "Download for Linux", note: "AppImage", href: "https://github.com/dev-in-portfolio/portfolio2/releases/latest/download/RepoPilot-Linux-x86_64.AppImage" }
  ];
</script>

<div class="page">
  <header class="hero">
    <p class="eyebrow">Desktop App</p>
    <h1>RepoPilot</h1>
    <p class="subtitle">Local-first desktop tooling. Netlify hosts this landing page and direct binary downloads.</p>
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
</div>
