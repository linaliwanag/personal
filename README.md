# paulinaliwanag.com

Personal portfolio site. A record-player-themed single-page app: drag a vinyl onto the turntable (or tap one, on mobile) to hear a track and read the matching About/Projects/Contact content.

Built with React 19 + Vite, no backend or database — everything is static, deployed to Cloudflare Pages.

## Scripts

- `npm start` / `npm run dev` — start the Vite dev server on port 3000
- `npm run build` — production build to `build/`
- `npm run preview` — serve the production build locally for a final check before deploying

## Structure

- `src/App.jsx` — top-level state, desktop/mobile view switch
- `src/components/` — `Vinyl`, `RecordPlayer`, `Content`, `Modal`
- `public/assets/` — project screenshots and music tracks
