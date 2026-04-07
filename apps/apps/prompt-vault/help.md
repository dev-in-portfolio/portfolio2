# Prompt Vault - User Guide

Prompt Vault is a secure, local-first prompt management application that allows you to store, organize, and back up your prompts directly in your browser.

## Features
- Local-first storage (no cloud sync required).
- Lockable interface for privacy.
- Prompt version history inside the editor, so saving creates a reusable revision trail instead of a blind overwrite.
- Prompt variants, so alternate directions can live beside the main prompt without replacing it.
- Side-by-side comparison between the head prompt, current draft, saved variants, and recent revisions.
- Import and export capabilities for easy backup.
- Auto-backup to your local Downloads folder.

## Step-by-Step Usage
1. Open Prompt Vault.
2. Click "New prompt" to create and save a new prompt.
3. Use the "Lock" button to secure your vault with a passcode.
4. Re-open any prompt to view its revision history and restore an older version into the editor before saving a new head revision.
5. Use "Save Current Draft As Variant" when you want to preserve an alternate version for the same use case.
6. Use the compare panel to inspect the current draft against the head prompt, a saved variant, or a recent revision.
7. To back up your data, click "Export" or toggle the Auto-Backup feature.
8. To restore data, use the "Import" button and select a previously exported JSON file.

## Troubleshooting
- If your prompts disappear, it is likely because your browser's cookies or site data were cleared. Always export a backup.
- If you forget your passcode, you may need to clear your browser data (which will delete your prompts unless backed up).
- Ensure your browser allows automatic downloads if you enable Auto-Backup.
- Restoring a revision does not overwrite immediately. It loads that version into the editor, and saving creates a new latest revision.
- Loading a variant into the editor also stays non-destructive until you save, which lets you compare or promote it safely.
