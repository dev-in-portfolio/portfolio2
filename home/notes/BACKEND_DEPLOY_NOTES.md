# Deploy Notes (CLI)

## Why CLI
Netlify Functions do **not** deploy from drag-and-drop uploads. CLI deployment supports functions.

## Required: Termux (Android)
1) Install Termux from F-Droid (recommended)
2) In Termux:
   pkg update && pkg upgrade -y
   pkg install -y nodejs-lts git
   npm i -g netlify-cli

## Link this folder to your Netlify site
From your site folder (where index.html lives):
  netlify login
  netlify link

Choose your site: dev-in-portfolio

## Install function deps
  npm install

## First deploy (draft)
  netlify deploy --dir . 

## Production deploy
  netlify deploy --prod --dir .

## Create tables in Neon
Open Neon SQL editor (or Netlify DB UI if it exposes SQL) and run:
  notes/neon_schema.sql

## Test
- https://dev-in-portfolio.netlify.app/api/health
- POST https://dev-in-portfolio.netlify.app/api/ai-gemini-proxy
  header: x-gemini-key: <BYO key>
  body: { "prompt": "Say hi" }
