# Build and Development Notes

This project currently runs as a classic static app (HTML + `script.js`) with Netlify Functions.

## Current Runtime

- Main entry: `index.html` (script tags, no module bundling in active flow)
- Local dev command: `npm run dev` (uses `netlify dev`)
- Build command: `npm run build` (placeholder, no bundling required)
- Tests: `npm test` (Node test runner with a smoke test)

## About Vite Files

`vite.config.js` and `src/main.js` exist as migration scaffolding, but the active app is not yet moved to Vite modules.

If you want to complete migration later:

1. Add Vite as dependency.
2. Move `script.js` logic into `src/` modules.
3. Update `index.html` to use module entry.
4. Replace placeholder build script with real bundling script.

## Netlify Function Compatibility

- Function entry: `netlify/functions/api.js`
- CORS env variable: `ALLOWED_ORIGIN` (fallback accepts `ALLOWED_ORIGINS` for compatibility)
- Keep secrets in local `.env` and use `.env.example` as template.
