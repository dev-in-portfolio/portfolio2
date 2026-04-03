# ToonStudio Pro - Developer Documentation

ToonStudio Pro is a frontend web application emphasizing a modern "glassmorphism" aesthetic built with Tailwind CSS and custom properties.

## Architecture & Tech Stack
- HTML5, CSS3, Vanilla JavaScript.
- Tailwind CSS (via CDN) for utility classes.
- FontAwesome (icons) and Google Fonts (Bungee, Outfit, Inter).

## Key Systems / Components
- UI Framework: The visual language is defined by the `.glass` class utilizing `backdrop-filter: blur(12px)` and translucent backgrounds.
- Layout: Structured via Tailwind grid/flex utilities for responsive behavior.
- Interaction Layer: Manages the state of the workspace panels and toolbars.

## Performance & Accessibility / Development Notes
- `backdrop-filter` can be incredibly performance-intensive on large areas, especially on mobile or older GPUs. Use it judiciously.
- Custom scrollbars are implemented; ensure they remain usable on different operating systems.
- Maintain high contrast text over glass panels to ensure readability.

## Integration & DB
- Client-side portfolio prototype.
- No active backend database integration.
- Mocked data or local state handles the presentation logic.