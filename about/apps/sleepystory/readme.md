# SleepyStory Studio - Developer Documentation

SleepyStory Studio is a frontend-focused application that emphasizes a whimsical, tactile user interface with custom cursors, paper textures, and 3D CSS transforms.

## Architecture & Tech Stack
- HTML5 and CSS3 (Tailwind CSS via CDN).
- Google Fonts (Quicksand, Fredoka One) for typography.
- Vanilla JavaScript for interaction handling.

## Key Systems / Components
- UI Layer: Utilizes Tailwind for layout and custom CSS for textures (`.paper-texture`) and custom cursors.
- Perspective Engine: Uses CSS `perspective` and `transform` properties to create the 3D book illusion (`.perspective-container`).
- Story Manager: Handles the loading and displaying of text content onto the "pages".

## Performance & Accessibility / Development Notes
- Custom cursors and complex CSS backgrounds (radial gradients + SVG textures) can impact performance on older mobile devices; consider falling back to simpler styling on small screens.
- Ensure the contrast ratio on the paper texture remains accessible for reading.

## Integration & DB
- Functions entirely client-side.
- Stories may be hardcoded or fetched from local JSON files.
- No dynamic backend database is utilized.