# paulinaliwanag.com

My personal site, built as a listening room: a record crate you dig through,
standing beside a turntable made entirely of CSS 3D transforms. Pull a record out
and it plays a track while the liner-notes panel fills in with that section —
about me, what I've built, and how to reach me.

**Live at [paulinaliwanag.com](https://paulinaliwanag.com)**

## What you can do with it

- **Dig through the crate** — drag across it, use the arrow keys, or the flip
  buttons. Three of my records are filed among the usual junk.
- **Pull one out** — it arcs up out of the crate and settles onto the platter,
  and the track starts.
- **Scrub with the tonearm** — grab the headshell and swing it across the record.
  The arm lifts when you pick it up and the sound stops with it, like a real one.
- **Pull the platter off speed** — the pitch fader works, and the strobe dots
  around the rim start drifting the moment it leaves 0.0%.
- **Re-light the room** — five colour schemes in the *Room* dropdown. Verdigris
  is the house look.

Everything has a keyboard and touch equivalent, and the whole scene stops moving
under `prefers-reduced-motion`.

## Built with

React 19 and Vite, with no backend, no database, and no CSS framework. The
turntable, the crate and the sleeves are all DOM elements in a shared
`preserve-3d` scene — there is no canvas, no WebGL, and no 3D library. Audio is a
single reused `<audio>` element, which is what makes playback work on iOS.

## Running it locally

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

| Script | What it does |
| --- | --- |
| `npm run dev` / `npm start` | Vite dev server on port 3000 |
| `npm run build` | Production build into `build/` |
| `npm run preview` | Serve the built output locally |
| `npm run deploy` | Manual deploy to Cloudflare via Wrangler |

## Deploying

Cloudflare watches this repository and builds automatically on every push to
`main`, so a push to `main` is a release.

`wrangler.jsonc` and `npm run deploy` are there for pushing a build up by hand
when I want to, but they aren't part of the normal path.

## Structure

```
src/
├── App.jsx                    what's on the player, and what's coming out of the speakers
├── records.jsx                the three records: track, colour, and the content each reveals
├── audio/
│   └── useTurntableAudio.js   the site's one audio engine
└── stage/
    ├── index.jsx              the page, and the record's flight between crate and platter
    ├── Deck.jsx               turntable: platter, tonearm, VU meters, pitch fader
    ├── CrateBox.jsx           the crate, and the gesture for digging through it
    ├── Sleeve.jsx             sleeve artwork
    ├── deckGeometry.js        deck measurements, and the pointer→plinth projection
    ├── dig.js                 where each sleeve sits for a given scroll position
    ├── studio.css             the deck, the room, and the colour schemes
    └── crate.css              the crate
```

The split that matters: `App.jsx` owns playback state, `stage/` owns everything
you can see. `deckGeometry.js` models the deck in unrotated "plinth space" so the
tonearm can project a pointer back into it — which is why the stylus lands where
you'd expect when you drag the arm across a record tilted 57° away from you.

## Credits

Music is my own. Icons are [Font Awesome](https://fontawesome.com/), and the
typeface is [Poppins](https://fonts.google.com/specimen/Poppins).
