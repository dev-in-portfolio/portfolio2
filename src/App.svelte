<script lang="ts">
  const releaseVersion = "repo-pilot-v0.1.7";
  const releasesPage = "https://github.com/dev-in-portfolio/portfolio2/releases";
  const downloads = [
    { os: "macOS", label: "Download for macOS", note: "Apple Silicon + Intel", href: "https://github.com/dev-in-portfolio/portfolio2/releases/download/repo-pilot-v0.1.7/RepoPilot-macOS.dmg" },
    { os: "Windows", label: "Download for Windows", note: "MSI installer", href: "https://github.com/dev-in-portfolio/portfolio2/releases/download/repo-pilot-v0.1.7/RepoPilot-Windows-x64.zip" },
    { os: "Linux", label: "Download for Linux", note: "Debian package (.deb)", href: "https://github.com/dev-in-portfolio/portfolio2/releases/download/repo-pilot-v0.1.7/RepoPilot-Linux-amd64.deb" }
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
