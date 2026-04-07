# Prompt Vault - Developer Documentation

Prompt Vault is a privacy-focused, client-side web application designed to manage text prompts securely using browser storage mechanisms.

## Architecture & Tech Stack
- HTML5, CSS3, Vanilla JavaScript.
- Web Storage API (`localStorage` or `IndexedDB`) for persistence.
- Client-side encryption for the "lockable" vault feature.

## Key Systems / Components
- UI/UX Layer: Manages the display of prompts, modals for passwords, and the storage banner.
- Storage Manager: Handles saving, loading, importing (parsing JSON), and exporting data.
- Revision Layer: Normalizes prompt records to include `revisions[]`, appends meaningful saves as new versions, and lets older revisions be restored into the editor without destructive overwrite.
- Variant Layer: Extends prompt records with `variants[]` so alternate prompt directions can be stored under the same parent record without polluting the main revision trail.
- Compare Workspace: Builds a local comparison surface in the editor that can inspect the head prompt, the current draft, saved variants, and recent revisions side by side.
- Security Module: Implements lightweight encryption/decryption routines tied to a user-provided passcode.

## Performance & Accessibility / Development Notes
- Avoid storing large files or images since browser storage limits apply (typically 5MB for localStorage).
- Ensure the drag-and-drop or file-input interfaces for importing JSON are robust and handle malformed data gracefully.
- The UI includes prominent warnings about data volatility; these should remain highly visible.

## Integration & DB
- Completely local. No backend or external database.
- Uses `localStorage` as the primary data store.
- Exports are handled by generating a Blob URL and triggering a client-side download.
