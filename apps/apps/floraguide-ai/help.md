# Flora Forensics - User Guide

Flora Forensics (FloraGuide AI) is a botanical analysis tool that turns uploaded plant photos into ranked diagnosis candidates instead of a single one-shot guess.

## Features
- **Identify Tab**: Upload plant images for ranked botanical or pathogen diagnosis candidates.
- **Chat**: Chat with the AI assistant about plant care, identification, and properties.
- **History & Compare**: Save your previous analyses and compare different plant profiles side-by-side.
- **Uncertainty Review**: Each dossier can now call out weak evidence and what additional observations would improve confidence.
- **Offline Capable**: The app works offline, syncing your data when you reconnect.

## Step-by-Step Usage
1. **Set Up AI**: Go to settings to input your API key and select your preferred model (e.g., gemini-1.5-flash).
2. **Identify a Plant**: Navigate to the **Identify** tab, set the forensic mode (e.g., general), and upload an image of the plant. The AI will analyze the image and return ranked candidates with confidence and reasoning.
3. **Chat**: Use the **Chat** tab to ask specific follow-up questions about the identified plant or general botanical queries.
4. **Review Uncertainty**: Check the dossier’s uncertainty section for missing evidence prompts before acting on a lower-confidence result.
5. **View History**: Check the **History** tab to see past analyses.

## Troubleshooting
- **Analysis Fails**: Ensure your API key is correct and valid. Check your internet connection.
- **Low Confidence Result**: Upload clearer photos, include leaves plus stems, and capture any visible pests, spotting, or flowers. The uncertainty panel will usually tell you what is missing.
- **Sync Issues**: The app uses local-first storage. If data isn't syncing, it will be saved locally and pushed when the network is available.
