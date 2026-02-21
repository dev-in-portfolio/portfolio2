# FloraGuide AI — Help

**A plant‑ID / gardening assistant demo—built to showcase applied AI UX without fragile dependencies.**

## What this is
FloraGuide AI is an “applied AI” portfolio piece: the goal isn’t to impress with buzzwords; it’s to show how you design an AI feature like a product. That means constraints, user control, and clear outputs.

Depending on build mode, FloraGuide may run in a deterministic DEMO mode (no API keys) so recruiters can test it without setup.

## How to use it
Start from the main input and provide the plant details you know (location, leaf shape, flower color, sun exposure, etc.). Run the assistant and review the result sections (ID candidates, care guidance, confidence, and what to check next).

If an image upload exists, use a well‑lit photo. If the build is in DEMO mode, you’ll still see realistic outputs, but they’re generated locally for consistency.

## Tips
Good AI UX behaviors to look for:
- It asks for missing information instead of guessing blindly.
- It gives a short answer first, then a deeper breakdown.
- It lists uncertainty and next checks (e.g., “look at leaf arrangement”).

If you’re testing as Devin: keep the model output structured and consistent—this is a trust product.

## Troubleshooting
- **Results look generic**: add 2–3 more attributes (leaf edge, growth habit, habitat). This app is designed to reward specificity.
- **Image won’t load**: confirm the browser allows file access and you’re not in a restricted webview.
- **No network calls**: that’s expected in DEMO mode; the point is recruiter‑safe testing.

## Privacy + data
If DEMO mode is enabled, analysis happens locally and nothing is uploaded. If you later enable live providers, add an explicit disclosure that tells the user what is sent and when.

---
_Last updated: 2026-02-11_
