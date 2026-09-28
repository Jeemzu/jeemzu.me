# jeemzu.me

React 19 + TypeScript + Vite SPA — personal portfolio, browser games, and AI chat for [jeemzu.me](https://jeemzu.me).

## Stack

| Concern       | Technology                          |
| ------------- | ----------------------------------- |
| Framework     | React 19 + TypeScript + Vite 6      |
| Routing       | Wouter                              |
| UI            | MUI v7 (custom dark theme)          |
| State         | Zustand v5                          |
| Games (JS)    | Phaser 3                            |
| Games (C++)   | Emscripten WASM (C++20)             |
| Forms         | react-hook-form                     |
| Notifications | sonner                              |
| API types     | openapi-typescript (auto-generated) |
| Deployment    | Netlify (SPA)                       |
| Pre-commit    | Husky + lint-staged                 |

## Pages

| Path                    | Component         | Description                                             |
| ----------------------- | ----------------- | ------------------------------------------------------- |
| `/`                     | `LandingPage`     | App hub — cards linking to every app                    |
| `/developer`            | `AboutPage`       | About the developer + AI chat (sub-nav layout)          |
| `/developer/projects`   | `ProjectsPage`    | Projects carousel (react-slick)                         |
| `/developer/experience` | `ExperiencePage`  | Work history timeline                                   |
| `/games`                | `GamesPage`       | Genre-grouped game cards + launchers                    |
| `/games/:id`            | `GamePage`        | Individual game detail/launch                           |
| `/editor`               | `LevelEditorPage` | Platformer level editor                                 |
| `/algoviz`              | `AlgoVizPage`     | WASM algorithm visualizer                               |
| `/budgetize`            | `BudgetizePage`   | Budget planner — guests edit in-memory, sign in to save |
| `/admin`                | `AdminPage`       | Admin-gated controls                                    |
| `*`                     | `Custom404`       | 404 page                                                |

The `/developer/*` routes share a `DeveloperLayout` sub-nav (About / Experience / Projects / Resume download).

All pages are lazy-loaded with `Suspense` + `ErrorBoundary`.

## Games

### Phaser Games (JavaScript)

Launched inside `GameContainer` modal — supports start menu, pause, volume, difficulty, and color options.

| Game        | File                          |
| ----------- | ----------------------------- |
| Snake       | `src/games/SnakeGame.ts`      |
| Tetris      | `src/games/TetrisGame.ts`     |
| Brick Break | `src/games/BrickBreakGame.ts` |
| Pong        | `src/games/PongGame.ts`       |
| ZAim        | `src/games/ZAimGame.ts`       |

### WASM Games (C++)

Compiled with Emscripten to `public/wasm/`. Launched inside `WasmGameContainer` modal.

| Game                 | Source                    |
| -------------------- | ------------------------- |
| Platformer           | `cpp/platformer/main.cpp` |
| Algorithm Visualizer | `cpp/algoviz/main.cpp`    |

Game states mirrored from C++ enum: `WAITING(0)`, `PLAYING(1)`, `DEAD(2)`, `COMPLETED(3)`.

## Authentication

JWT access tokens stored in-memory via Zustand (lost on page refresh). Session restored on app load via `POST /api/auth/refresh` using an httpOnly cookie.

- `register(username, password, optedIn?)` → `POST /api/users/register`
- `loginUser(username, password)` → `POST /api/users/login`
- `logout()` → `POST /api/auth/logout`
- `initialize()` → Silent refresh on load

Roles: `'Admin' | 'User'` — role-gated UI via `<RoleGuard>` component and `useRole()` hook.

## API Integration

Base URL: `VITE_API_URL` env var (defaults to `http://localhost:5000/api`)

| Utility                | Endpoints                                                              |
| ---------------------- | ---------------------------------------------------------------------- |
| `src/utils/authApi.ts` | `/auth/refresh`, `/auth/logout`, `/users/register`, `/users/login`     |
| `src/utils/gameApi.ts` | `/scores` (submit/leaderboard/summary), `/users` (profile/preferences) |
| `src/utils/chatApi.ts` | `/chat` (RAG chat — tries agent service first, falls back to .NET API) |

Generated types from backend OpenAPI spec live in `src/types/api.generated.ts` — regenerated automatically after backend deploys.

## Third-Party Services

| Service | Responsibility |
| --- | --- |
| Netlify | Hosts the static SPA, serves the `dist/` build, and applies the SPA fallback and response headers in `public/`. |
| Azure App Service | Hosts the .NET API used for authentication, game scores and profiles, budgets, contact requests, RPG requests, and chat fallback. The deployed API URL is configured with `VITE_API_URL`. |
| Render | Hosts the Python chat-agent endpoint selected by `VITE_AGENT_URL`. Chat tries this service first and falls back to the .NET API. |
| Google Fonts | Serves the Cinzel and Caudex web fonts referenced by `index.html`. |
| GitHub Actions | Backend deployment dispatches `api-types-update` to regenerate this repo's OpenAPI types; this is CI automation, not a runtime dependency for visitors. |

`VITE_API_URL` and `VITE_AGENT_URL` are deployment configuration. The API repo's `API.md` documents a different Azure API hostname, so reconcile that reference before treating it as the canonical endpoint. A Turnstile site key is present in production environment configuration, but the frontend currently has no Turnstile integration.

## Project Structure

```
src/
├── App.tsx                  # Route definitions + LC() lazy wrapper
├── themes.ts                # MUI dark theme + custom palette
├── main.tsx                 # Entry point — mounts app, calls authStore.initialize()
├── components/
│   ├── GameContainer.tsx    # Phaser game modal wrapper
│   ├── WasmGameContainer.tsx # WASM game modal wrapper
│   ├── PlatformerLevelSelect.tsx
│   ├── ComingSoonModal.tsx
│   └── shared/              # Navigation, Footer, AuthModal, RoleGuard, etc.
├── games/                   # Phaser scene configs (Snake, Tetris, BrickBreak, Pong, ZAim)
├── hooks/
│   └── useRole.ts           # Role selector over auth store
├── lib/
│   ├── globals.ts           # FONTS, LINKS, LAYOUT, SPACING, EFFECTS, ANIMATIONS
│   ├── GameTypes.ts         # GameGenre, GameDataProps, DeNull<T>, etc.
│   ├── LevelSchema.ts      # Zod schema for platformer levels
│   └── data/                # GameData, ProjectData, JourneyData
├── pages/
│   ├── landing/             # LandingPage (app hub)
│   ├── developer/           # DeveloperLayout, AboutPage, LandingChat
│   ├── projects/            # ProjectsPage + Projects carousel
│   ├── games/               # GamesPage, GamePage, GameCard, GameRow
│   ├── experience/          # ExperiencePage + MyJourney
│   ├── editor/              # LevelEditorPage
│   ├── budgetize/           # BudgetizePage + budget components
│   ├── algoviz/             # AlgoVizPage + AVLVisualizer
│   └── admin/               # AdminPage
├── stores/
│   ├── authStore.ts         # Zustand — JWT, role, username, actions
│   └── navigationStore.ts
├── types/
│   └── api.generated.ts     # Auto-generated OpenAPI types (DO NOT EDIT)
└── utils/                   # authApi, gameApi, chatApi, levelLoader, etc.

cpp/                         # C++ WASM game sources
├── build-all.ps1            # Emscripten build script
├── platformer/main.cpp
└── algoviz/main.cpp

public/
├── wasm/                    # Compiled .js + .wasm modules
├── levels/                  # Bundled platformer level JSON
├── sounds/                  # Audio files
├── _redirects               # Netlify SPA fallback
└── _headers                 # Security headers
```

## Theming

Custom MUI dark theme defined in `src/themes.ts`:

| Token          | Value                           |
| -------------- | ------------------------------- |
| Primary Green  | `#a8d67e`                       |
| Soft Green     | `#c5e8a4`                       |
| Background     | `#121212`                       |
| Paper / Cards  | `#1a1a1a` / `#1f1f1f`           |
| Text Secondary | `#b0b0b0`                       |
| Font           | `NectoMono-Regular` (monospace) |

Styling via MUI `sx` prop — no CSS modules. Layout constants in `src/lib/globals.ts`.

## Local Development

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html) (for WASM builds)

### Start dev server

```bash
npm install
npm run dev
```

Dev server runs on http://localhost:5173 with HMR. Requires the backend API running on `localhost:5000` (or set `VITE_API_URL`).

### Build WASM games

```bash
npm run build:cpp
```

Compiles all C++ sources in `cpp/` to `public/wasm/` using Emscripten (C++20, `-O2`, modularized).

### Build for production

```bash
npm run build          # TypeScript check + Vite build
npm run build:all      # Build WASM first, then JS
```

### Other commands

```bash
npm run lint                       # ESLint (flat config)
npm run preview                    # Preview production build locally
npm run generate-api-types         # Regenerate types from local API
npm run generate-api-types:prod    # Regenerate types from production API
```

## Deployment

Deployed on **Netlify** as a static SPA.

- Build output: `dist/`
- SPA fallback: `public/_redirects` (`/* /index.html 200`)
- Security headers: `public/_headers`
- Environment variable: `VITE_API_URL` → production API URL

After every backend deploy, GitHub Actions dispatches `api-types-update` to this repo, triggering regeneration of `src/types/api.generated.ts`.
