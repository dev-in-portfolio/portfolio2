function addCopyButtons() {
  const blocks = Array.from(document.querySelectorAll("pre > code"));
  for (const code of blocks) {
    const pre = code.parentElement;
    if (!pre || pre.dataset.copyReady === "1") continue;
    pre.dataset.copyReady = "1";

    const btn = document.createElement("button");
    btn.className = "btn btn-small copy-btn";
    btn.type = "button";
    btn.textContent = "Copy";
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code.innerText || "");
        btn.textContent = "Copied";
        window.setTimeout(() => (btn.textContent = "Copy"), 1200);
      } catch {
        btn.textContent = "Failed";
        window.setTimeout(() => (btn.textContent = "Copy"), 1200);
      }
    });

    const wrap = document.createElement("div");
    wrap.className = "code-wrap";
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);
    wrap.appendChild(btn);
  }
}

function attachChecklistPrint() {
  const btn = document.getElementById("print-checklist");
  if (!btn) return;
  btn.addEventListener("click", () => window.print());
}

document.addEventListener("DOMContentLoaded", () => {
  addCopyButtons();
  attachChecklistPrint();
});

