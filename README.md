# At First Sight

A piano sight-reading trainer that algorithmically generates sheet music exercises directly in the browser. No backend required — all music is composed from local music theory rules.

## Features

- **10 difficulty levels** from beginner (5-finger position, simple rhythms) to virtuoso (wide intervals, complex hand coordination)
- **Key selection** — pick from any major or minor key, or let the app choose from a pedagogically appropriate pool for the selected level
- **Advanced settings** — customize rhythm complexity, rhythm variance, max melodic interval, hand coordination mode, accompaniment style, and playability range
- **Score rendering** via [abcjs](https://www.abcjs.net/) with built-in MIDI playback and tempo control

## Tech Stack

- React 19, TypeScript, Vite
- Tailwind CSS
- abcjs (music notation rendering and MIDI synthesis)

## Run Locally

**Prerequisites:** Node.js, [pnpm](https://pnpm.io/)

1. Install dependencies:
   ```
   pnpm install
   ```
2. Start the dev server:
   ```
   pnpm dev
   ```
   The app will be available at `http://localhost:3001`.

## Run Tests

```
pnpm test
```
