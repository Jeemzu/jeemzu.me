# Copilot Instructions for Jeemzu.com

## Project Overview
Personal portfolio + browser games site. React 19 + TypeScript + Vite, deployed on Netlify. The backend API lives in the `jeemzu.api` repo (ASP.NET Core 8).

## Technology Stack

| Concern | Technology |
|---|---|
| Framework | React 19 + TypeScript + Vite |
| Routing | Wouter (not React Router) |
| UI Library | MUI v7 (`@mui/material`) with custom dark theme |
| State management | Zustand v5 (auth + navigation) |
| Game engine | Phaser 3 (JS games) + Emscripten WASM (C++ games) |
| Forms | react-hook-form |
| Carousel | react-slick |
| Notifications | sonner |
| API types | `openapi-typescript` (auto-generated from live backend) |
| Deployment | Netlify (SPA, `public/_redirects` fallback) |
| Pre-commit | Husky + lint-staged |

## Repository Structure

```
src/
├── App.tsx                  # Route definitions, LC() lazy wrapper, Custom404
├── themes.ts                # MUI theme, palette, CSS_VARS export
├── main.tsx                 # App entry — mounts app, calls authStore.initialize()
├── assets/
│   ├── fonts/               # Custom font files
│   ├── images/              # Game thumbnails, GIFs, profile assets
│   └── sounds/
├── components/
│   ├── ChatBot.tsx          # Floating RAG chat UI (GPT-4o-mini)
│   ├── ComingSoonModal.tsx  # Placeholder modal for unreleased games
│   ├── GameContainer.tsx    # Phaser game modal wrapper
│   ├── PlatformerLevelSelect.tsx
│   ├── WasmGameContainer.tsx # WASM/C++ game modal wrapper
│   └── shared/
│       ├── AuthPromptToast.tsx
│       ├── ErrorBoundary.tsx
│       ├── Footer.tsx
│       ├── GameOverOverlay.tsx
│       ├── MainContent.tsx
│       ├── Navigation.tsx
│       ├── PageTransition.tsx
│       ├── RoleGuard.tsx    # Role-gated UI rendering
│       └── UserAuthModal.tsx
├── games/                   # Phaser game scene configs
│   ├── SnakeGame.ts
│   ├── TetrisGame.ts
│   ├── BrickBreakGame.ts
│   ├── ZAimGame.ts
│   ├── PongGame.ts
│   ├── brickbreak/
│   └── rpg/
├── hooks/
│   └── useRole.ts           # Thin selector over authStore
├── lib/
│   ├── globals.ts           # FONTS, LINKS, LAYOUT, SPACING, EFFECTS, ANIMATIONS
│   ├── GameTypes.ts         # GameGenre, GameDataProps, GameHighScore, UserGameData
│   ├── LevelSchema.ts       # LevelFile zod schema for platformer levels
│   ├── MyJourneyTypes.ts
│   └── data/
│       ├── GameData.tsx     # useGameLauncher() hook + createGameData()
│       ├── ProjectData.ts
│       └── JourneyData.ts
├── pages/
│   ├── landing/             # / — hero, intro, about sections
│   ├── projects/            # /projects — carousel of projects
│   ├── games/               # /games — genre-grouped game cards
│   ├── experience/          # /experience — work history timeline
│   ├── editor/              # /editor — platformer level editor (LevelEditorPage)
│   ├── memorial/            # /memorial — MemorialPage
│   └── algoviz/             # /algoviz — AlgoVizPage (WASM algorithm visualizer)
├── stores/
│   ├── authStore.ts         # Zustand auth store — JWT in memory, role, initialize()
│   └── navigationStore.ts
├── types/
│   └── api.generated.ts     # Auto-generated from OpenAPI spec — DO NOT EDIT MANUALLY
└── utils/
    ├── authApi.ts           # Raw HTTP layer for auth endpoints
    ├── chatApi.ts           # POST /api/chat
    ├── customLevels.ts      # localStorage custom level management
    ├── gameApi.ts           # Scores + user data API calls
    ├── levelLoader.ts       # LevelFile → WASM C++ API commands
    ├── openInNewTab.ts      # onClickUrl() helper
    └── useScrollAnimation.ts # IntersectionObserver hook

cpp/                         # C++ source for WASM games
├── build-all.ps1
├── platformer/main.cpp
└── algoviz/main.cpp
public/
├── _redirects               # Netlify SPA fallback
├── _headers                 # Security headers
├── levels/                  # Bundled platformer levels (1.json, manifest.json)
├── sounds/                  # Audio files served statically
└── wasm/                    # Emscripten-compiled .js/.wasm files
```

## Routes

All pages are lazy-loaded with `LC(lazy(() => import(...)))` + `ErrorBoundary`.

| Path | Component | Description |
|---|---|---|
| `/` | `LandingPage` | Hero, intro, about |
| `/projects` | `ProjectsPage` | Projects carousel (react-slick) |
| `/games` | `GamesPage` | Genre-grouped game cards + launchers |
| `/experience` | `ExperiencePage` | Work history timeline |
| `/editor` | `LevelEditorPage` | Platformer level editor |
| `/memorial` | `MemorialPage` | Memorial page |
| `/algoviz` | `AlgoVizPage` | WASM algorithm visualizer |
| `*` | `Custom404` | John Travolta GIF 404 |

## Styling & Theming

- **MUI `sx` prop** is the primary styling method — avoid CSS modules/files
- **Custom dark palette** in `src/themes.ts`:
  - `primaryGreen.main` = `#a8d67e`
  - `softGreen.main` = `#c5e8a4`
  - `darkBackground.main` = `#1a1a1a`
  - `cardBackground.main` = `#1f1f1f`
  - `textSecondary.main` = `#b0b0b0`
  - `background.default` = `#121212`, `background.paper` = `#1a1a1a`
  - Use `theme.palette.primaryGreen.main`, never hardcode hex values
- **Fonts** (`FONTS` in `src/lib/globals.ts`):
  - `FONTS.NECTO_MONO` = `'NectoMono-Regular'` — primary monospace font
  - `FONTS.POIRET_ONE` = `'PoiretOne-Regular'`
  - Font files in `src/assets/fonts/`
- **Responsive**: Use MUI `useMediaQuery` for breakpoints (e.g., `useMediaQuery('(max-width:900px)')`)
- **Scroll animations**: `useScrollAnimation()` hook (IntersectionObserver) returns `{ ref, isVisible }`. Apply `ANIMATIONS.FADE_IN` / `ANIMATIONS.FADE_IN_VISIBLE` from globals based on `isVisible`

## Constants & Conventions (`src/lib/globals.ts`)

All magic values live here — never hardcode them elsewhere:

| Export | Contents |
|---|---|
| `FONTS` | `NECTO_MONO`, `POIRET_ONE` |
| `LINKS` | `LINKEDIN`, `GITHUB`, `EMAIL`, `RESUME`, `MINECRAFT_CREDITS` |
| `LAYOUT` | `SECTION_SPACING`, `CONTENT_MAX_WIDTH`, `ICON_SIZE`, `CARD_ROTATION_RANGE` |
| `SPACING` | `XS`, `SM`, `MD`, `LG`, `XL`, `XXL` (rem scale) |
| `EFFECTS` | `HOVER_SCALE`, `HOVER_OPACITY`, `TRANSITION`, `CARD_SHADOW`, `CARD_SHADOW_HOVER` |
| `ANIMATIONS` | `FADE_IN`, `FADE_IN_VISIBLE`, `SLIDE_IN_LEFT`, `SLIDE_IN_LEFT_VISIBLE`, `SLIDE_IN_RIGHT`, `SLIDE_IN_RIGHT_VISIBLE`, `STAGGER_DELAY` |

## Games System

### Phaser Games (`GameContainer`)
- Each game in `src/games/` exports `create*GameConfig()` returning `Phaser.Types.Core.GameConfig`
- Games are launched inside `GameContainer` modal (`src/components/GameContainer.tsx`) which handles start menu, pause, volume, difficulty, and color options
- `GameContainer` fires a `gameOver` custom event with `GameStat[]` payload — `GameOverOverlay` displays these
- **`GameGenre`** type: `'Classics' | 'Arcade' | 'Action' | 'Strategy' | 'RPG' | 'Native'`
- `GamesPage` groups games by genre into scrollable `GameRow` sections
- Game cards hover → show animated GIF preview after 500ms delay (thumbnail → GIF swap in `GameCard.tsx`)
- Sounds loaded in Phaser via `this.load.audio()`, served from `public/sounds/`

### WASM Games (`WasmGameContainer`)
- C++ games in `cpp/` compiled with Emscripten to `public/wasm/{name}.js` + `.wasm`
- `WasmGameContainer` (`src/components/WasmGameContainer.tsx`) dynamically loads the Emscripten module via `<script>` injection, creates a `<canvas>`, calls `cwrap`-wrapped C++ functions
- Game states (mirrored from C++ enum): `0=WAITING`, `1=PLAYING`, `2=DEAD`, `3=COMPLETED`
- Level data passed via C++ level API: `level_begin`, `level_add_spike`, `level_add_pit`, `level_add_platform`, `level_end`, `level_set_finish` — translated by `src/utils/levelLoader.ts`
- `WasmGameContainerProps`: `open`, `onClose`, `gameTitle`, `wasmName`, `exportName?`, `canvasWidth?`, `canvasHeight?`, `levelFile?`, `onLevelComplete?`, `levelLabel?`

### Game Data (`src/lib/data/GameData.tsx`)
- `useGameLauncher()` hook owns all modal state: `currentGame`, `comingSoonGame`, `platformerOpen`, `selectedLevel`
- Current launchers: `launchSnake`, `launchZAim`, `launchBrickBreak`, `launchTetris`, `launchPlatformer`, `showComingSoon`
- `createGameData(launchers)` returns `GameDataProps[]` — consumed by `GamesPage` to build the card grid

### Adding a New Phaser Game
1. Create `src/games/NewGame.ts` — Phaser scene(s) + `createNewGameConfig()` returning `Phaser.Types.Core.GameConfig`
2. Add `launchNewGame` to `useGameLauncher()` in `GameData.tsx`
3. Add `GameDataProps` entry to `createGameData()` array with correct `id`, `genre`, `thumbnail`, `gameplayGif`, `onPlay`
4. Add thumbnail PNG + gameplay GIF to `src/assets/images/`

## Authentication & Auth Store (`src/stores/authStore.ts`)

Auth state is in **Zustand** with **no persistence** — tokens are in-memory only (wiped on page reload).

**State:**
- `accessToken: string | null` — in-memory JWT
- `username: string | null`
- `role: AppRole | null` — `'Admin' | 'User'`
- `expiresAt: number | null` — Unix ms (`Date.now() + expiresIn * 1000`)
- `isAuthenticated: boolean`
- `isInitialized: boolean` — true once startup refresh attempt settles

**Session restore flow:** `initialize()` is called once in `main.tsx` on app load. It calls `POST /api/auth/refresh` using the httpOnly cookie. If successful, it decodes the username from the JWT payload manually via `atob` (no library) — looks for `.name`, `unique_name`, or the full `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name` claim key.

**Actions:**
- `register(username, password, optedIn?)` — calls `POST /api/users/register`, handles 409 conflict
- `loginUser(username, password)` — calls `POST /api/users/login`
- `logout()` — fire-and-forgets `POST /api/auth/logout`, clears local state immediately
- `initialize()` — silent token refresh on app load

**`AppRole`** type: `'Admin' | 'User'` — matches backend JWT role claim.

## Role-Based UI

- **`useRole()` hook** (`src/hooks/useRole.ts`): returns `{ role, username, isAuthenticated, isAdmin, isUser, hasRole(...required) }`
- **`<RoleGuard roles="Admin">` component** (`src/components/shared/RoleGuard.tsx`): conditionally renders children — non-matching roles render `fallback` (default: nothing). Elements are **not rendered**, not just hidden.
- **`<AuthPromptToast>`** — shown when unauthenticated users trigger auth-required actions
- **`<UserAuthModal>`** — login/register modal

## API Integration

### Base URL
All API utils read: `const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'`  
Production: `https://jeemzu-prod-eza9c8edcdhhbqhw.canadaeast-01.azurewebsites.net`

### `src/utils/authApi.ts`
Raw HTTP layer. All requests use `credentials: 'include'` for the httpOnly refresh cookie.
- `refreshRequest()` → `POST /api/auth/refresh` → `TokenResponse | null`
- `logoutRequest()` → `POST /api/auth/logout`
- `registerUserRequest(body)` → `POST /api/users/register` → `{ token } | { conflict: true } | null`
- `loginUserRequest(body)` → `POST /api/users/login` → `TokenResponse | null`

### `src/utils/gameApi.ts`
Bearer token injected via `authHeader()` which reads `useAuthStore.getState().accessToken` directly (not a hook).
- `saveHighScore(gameId, score)` → `POST /api/scores` → `{ success, error? }`
- `getHighScores(gameId, limit?)` → `GET /api/scores/{gameId}?limit={limit}` → `GameHighScore[]`
- `getGameSummary(gameId)` → `GET /api/scores/{gameId}/summary` (optional auth) → `GameSummary`
- `getUserData(username)` → `GET /api/users/{username}` → `UserGameData | null`
- `updateUserPreferences(optedIn)` → `POST /api/users` → `{ success, error? }`

### `src/utils/chatApi.ts`
- `chatRequest(question, history)` → `POST /api/chat` → `string | null` (the `answer` field)
- Re-exports `ConversationMessage` type

### Generated API Types (`src/types/api.generated.ts`)
Auto-generated by `openapi-typescript` from the live backend OpenAPI spec. **Do not edit manually.**  
Regenerated automatically after every backend deploy via the `api-types-update` GitHub Actions dispatch.

All types live under `components['schemas']`. Key types:
| Schema | Shape |
|---|---|
| `TokenResponse` | `{ accessToken?, tokenType?, expiresIn?, role? }` |
| `UserResponse` | `{ userId?, username?, optedIn?, highScores?: { [key: string]: number } }` |
| `ScoreResponse` | `{ gameId?, username?, score?, timestamp? }` |
| `GameSummaryResponse` | `{ allTimeRecord?: ScoreResponse; personalBest?: number \| null }` |
| `SubmitScoreRequest` | `{ gameId: string; score?: number; timestamp?: number }` |
| `ChatRequest` | `{ question: string; history?: ConversationMessage[] \| null }` |
| `ChatResponse` | `{ answer?: string \| null }` |
| `RegisterRequest` | `{ username: string; password: string; optedIn?: boolean }` |
| `LoginRequest` | `{ username: string; password: string }` |
| `IngestResponse` | `{ chunksUpserted?: number }` |

Use the `DeNull<T>` helper in `GameTypes.ts` to strip nullability from generated types when consuming them internally.

## ChatBot (`src/components/ChatBot.tsx`)
- Floating `Fab` button (bottom-right corner); click opens 400×540px fixed panel (full-width on mobile ≤600px)
- Header: "Ask about James" / "RAG · GPT-4o mini"
- State: `open`, `history: ConversationMessage[]`, `input`, `loading`
- On submit: appends user message to history → calls `chatRequest(question, history)` → appends assistant response
- Full history is sent with every request (backend is stateless)
- Enter (without Shift) submits

## Key Patterns

- **Lazy loading**: Always wrap new page components with `LC()` — it adds `Suspense` + `LoadingSpinner`; pair with `ErrorBoundary`
- **Card hover effect**: Use `EFFECTS.HOVER_SCALE` / `EFFECTS.CARD_SHADOW_HOVER` from globals
- **External links**: Always use `onClickUrl(url)` from `src/utils/openInNewTab.ts` — handles `mailto:` and `noopener,noreferrer`
- **Projects carousel**: Uses `react-slick` with custom arrow components
- **Static content**: All page content (projects, journey, game metadata) lives in `src/lib/data/` — not fetched from API
- **Type derivation**: Prefer deriving internal types from `api.generated.ts` (via `DeNull`, `Omit`, etc.) rather than duplicating definitions

## Development

```bash
npm run dev                  # Vite dev server (HMR) — default port 5173
npm run build                # tsc -b && vite build
npm run lint                 # ESLint (flat config, eslint.config.js)
npm run preview              # Preview production build

# Regenerate API types from local backend
npm run generate-api-types

# Regenerate API types from production backend
npm run generate-api-types:prod
```

- Husky pre-commit hook runs lint-staged
- No test framework currently configured

## Deployment

- **Netlify**: SPA fallback via `public/_redirects` (`/* /index.html 200`), security headers in `public/_headers`
- **Env var**: `VITE_API_URL` — set in Netlify environment to production API URL
- After backend deploy, GitHub Actions dispatches `api-types-update` event → triggers regeneration of `src/types/api.generated.ts`
- Static assets bundled by Vite: `src/assets/` → hashed filenames in dist
- Static files served as-is: `public/` → `dist/` root (sounds, WASM files, level JSON)

## Adding New Features — Checklist

**New page:**
1. Create `src/pages/{name}/{Name}Page.tsx`
2. Add lazy import + `LC()` wrapper in `App.tsx`
3. Add `<Route path="/{name}" component={...} />` in `Routes()`

**New API endpoint consumption:**
1. Add fetch function to the appropriate `src/utils/` file
2. Use the generated type from `api.generated.ts` (`components['schemas']['...']`)
3. Use `DeNull<T>` if you need to strip nullability for internal use

**New WASM game:**
1. Create `cpp/{gameName}/main.cpp` + `build-flags.json`
2. Add entry to `cpp/build-all.ps1`
3. Build: compiled to `public/wasm/{gameName}.js` + `.wasm`
4. Use `<WasmGameContainer wasmName="{gameName}" ... />` to launch it