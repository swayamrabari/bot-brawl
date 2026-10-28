# Bot Brawl 🎯

A tiny single-player 2D arena shooter built with React and Canvas. One human, one
jetpack-enabled AI opponent, six weapons, and a big ten-platform altitude arena
with a camera that pulls back to keep both fighters in frame.

## Play

```bash
npm run dev
```

Open the local URL, hit **ENTER THE ARENA**, and win three rounds before Bot Brad
does. He is trying his best, which is not very good.

## Controls

| Input | Action |
| --- | --- |
| `A` / `D` or `←` / `→` | Walk |
| `W` / `↑` / `Space` | Jetpack (hold, burns fuel) |
| Mouse | Aim |
| Hold left click | Shoot |
| `1`–`6` or mouse wheel | Switch weapons |
| `R` | Reload |
| `Esc` / `P` | Pause / resume |

## Features

- **Jetpack flight** with a fuel gauge that refills when you land
- **10 floating platforms** across multiple altitude tiers
- **Smart camera** that pans and zooms to fit both fighters when they separate
- **Pause** via the toolbar button or `Esc` / `P`, with a full frozen-game overlay
- **Six weapons**: Pistol, SMG, Shotgun, Rifle, Sniper, Rocket
- Health kits that spawn on the ground and on platforms
- A deliberately weak Bot Brad: 90 HP, half damage, shaky aim, clumsy flying
- Canvas effects, synthesized sound effects, round-based match to 3 wins

## Scripts

- `npm run dev` — start the development server
- `npm run build` — build for production
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint

## Deploy

The production build is fully static and can be hosted anywhere.

```bash
npm run build
```

Upload the generated `dist/` folder to your host, or connect the repo directly:

- **Netlify** — build command `npm run build`, publish directory `dist`
- **Vercel** — framework preset **Vite**, output directory `dist`
- **GitHub Pages** — publish the `dist/` folder from your deploy branch

Vite uses a relative base (`./`), so the game also works from a subdirectory
such as `https://example.com/bot-brawl/`.

## Structure

- `src/App.jsx` — React HUD, pause/results overlays, and screen flow
- `src/game/engine.js` — game loop, input, flight, camera, AI, rounds
- `src/game/render.js` — camera-transformed canvas world, platforms, fighters, effects
- `src/game/weapons.js` — viewport/world sizes, weapon stats, team palettes
- `src/game/sfx.js` — synthesized sound effects (no audio files)
