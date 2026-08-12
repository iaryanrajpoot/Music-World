# Music World

A single-page nostalgia music site. A cassette-shop scene as the backdrop, a
glass player pill/card driven by the YouTube IFrame API, no audio files.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Before it plays anything

`lib/tracks.ts` ships with placeholder tracks only (`videoId: "REPLACE_ME"`).
Nothing plays until you add real video IDs — see the comment at the top of
that file. Adding a track is a one-line change: duplicate a `Track` object
inside the playlist you want and fill in `title`, `artist`, `film`, `year`,
`duration`, and `videoId`.

Only use IDs for videos you have the right to use, or that stream from the
rights holder's own YouTube upload with embedding enabled. The player will
surface a broken ID as a load error and auto-skip it — that's intentional,
not a bug.

## Structure

- `app/page.tsx` — layout shell: background, grain, top row, player
- `app/layout.tsx` — fonts, viewport (safe-area aware), analytics
- `app/globals.css` — Tailwind v4 `@theme` tokens, grain SVG, keyframes
- `components/Player.tsx` — the player itself (desktop pill + mobile card,
  YouTube IFrame API wiring, seek bar, transport)
- `components/ClockWidget.tsx` — IST clock, blinking colon
- `components/ListenerCount.tsx` — ambient, decorative — there's no backend
- `components/SocialLinks.tsx` — swap the placeholder `href`s for your own
- `lib/tracks.ts` — playlists and tracks
- `lib/youtube.ts` — thin loader/types around the YouTube IFrame Player API
- `public/bg/scene-wide.png`, `public/bg/scene-tall.png` — the two scenes

## Notes

- The player is always visibly rendered (inside the spinning "vinyl" circle),
  never hidden — that's a requirement of YouTube's embed policies, not just
  a style choice.
- Cover art is the live video itself, clipped to a circle — nothing is
  downloaded or re-hosted from YouTube.
- On the mobile/desktop breakpoint boundary, the player briefly re-attaches
  to the visible container so the video is never playing inside a
  `display: none` element.
