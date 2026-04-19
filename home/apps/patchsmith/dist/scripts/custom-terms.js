const initContribute = () => {
  const form = document.querySelector("[data-contribute-form]");
  const status = document.querySelector("[data-contribute-status]");
  if (!form) return;
  
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const term = {
      term: data.get("term").toString().trim(),
      slug: data.get("slug").toString().trim(),
      category: data.get("category").toString().trim(),
      techEquivalent: data.get("techEquivalent").toString().split(",").map((s) => s.trim()).filter(Boolean),
      definitionRestaurant: data.get("definitionRestaurant").toString().trim(),
      definitionTech: data.get("definitionTech").toString().trim(),
      examplesRestaurant: data.get("examplesRestaurant").toString().split(",").map((s) => s.trim()).filter(Boolean),
      examplesTech: data.get("examplesTech").toString().split(",").map((s) => s.trim()).filter(Boolean),
      tags: data.get("tags").toString().split(",").map((s) => s.trim()).filter(Boolean),
      related: data.get("related").toString().split(",").map((s) => s.trim()).filter(Boolean),
      context: data.get("context").toString().trim(),
      tone: data.get("tone").toString().trim(),
      roleRelevance: data.get("roleRelevance").toString().trim(),
      falseFriends: data.get("falseFriends").toString().split(",").map((s) => s.trim()).filter(Boolean),
      phraseExamples: data.get("phraseExamples").toString().split("|").map((s) => s.trim()).filter(Boolean)
    };
    
    const { saveCustomTerm } = await import("./state.js");
    await saveCustomTerm(term);
    
    if (status) {
      status.textContent = "Saved. If backend is unavailable, this is local-only.";
      status.hidden = false;
    }
    form.reset();
  });
};

export { initContribute };