# OREA AI — Gemini-connected version

## Requirements
- Node.js 18 or newer (a current LTS release is recommended)
- A Gemini API key

## Setup
1. Extract this ZIP.
2. Open a terminal in the extracted `orea-gemini-fixed` folder.
3. Run `npm install`.
4. Copy `.env.example` to `.env`.
5. Put your real Gemini API key in `.env` as `GEMINI_API_KEY=...`.
6. Run `npm start`.
7. Open http://localhost:3000 in your browser.

Keep `.env` private. It is ignored by Git. Never put your API key in `index.html` or `script.js`.
If you deploy the site, set `GEMINI_API_KEY` in your hosting provider's server-side environment settings.
