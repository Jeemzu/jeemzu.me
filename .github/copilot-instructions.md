# Copilot Instructions for Jeemzu.com

## Project Overview
Personal portfolio + browser games site. React 19 + TypeScript + Vite, deployed on Netlify.
Four routes: `/` (landing), `/projects`, `/games`, `/experience`.

## Architecture

### Routing & Page Structure
- **Wouter** for client-side routing (not React Router) — see `src/App.tsx`
- Pages are lazy-loaded via the `LC()` wrapper: `const GamesPage = LC(lazy(() => import("./pages/games/GamesPage")))`
- Each page dir (`src/pages/{landing,projects,games,experience}/`) has a `*Page.tsx` entry + child presentation components
- `PageTransition` wraps `<Switch>` for fade/slide transitions between routes
- 404 uses a custom `Custom404` component inline in `App.tsx`

### Games System (Phaser-based)
- **Game engine**: Games use [Phaser 3](https://phaser.io/) rendered inside a React `GameContainer` modal (`src/components/GameContainer.tsx`)
- **Game files**: Each game in `src/games/` exports a `create*GameConfig()` function returning a `Phaser.Types.Core.GameConfig`
- **Game data**: `src/lib/data/GameData.tsx` defines `createGameData()` (with launcher callbacks) and `useGameLauncher()` hook managing modal state
- **Genre system**: Games are tagged with a `GameGenre` type (`'Classics' | 'Arcade' | 'Action' | 'Strategy'`), defined in `src/lib/GameTypes.ts`. `GamesPage` groups games by genre into scrollable `GameRow` components
- **Game cards**: Hover shows animated GIF preview after 500ms delay (thumbnail → gif pattern in `GameCard.tsx`)
- **Sounds**: Game audio files served from `public/sounds/`, loaded in Phaser scenes via `this.load.audio()`
- **High scores**: Stored in `localStorage` (`highScore_{gameTitle}`). `src/utils/gameApi.ts` has a backend API service (not yet connected)
- **Adding a new game**: Create `src/games/NewGame.ts` with Phaser scene + `createNewGameConfig()`, add launcher in `useGameLauncher()`, add entry to `createGameData()` array with genre/assets, add thumbnail+gif to `src/assets/images/`

### State Management
- **Zustand** for navigation state (`src/stores/navigationStore.ts`)
- **React hooks** for all other local UI state — no global state library beyond Zustand

### Styling & Theming
- **MUI `sx` prop** is the primary styling method — avoid CSS modules/files
- **Custom MUI palette** in `src/themes.ts`: `primaryGreen`, `softGreen`, `darkBackground`, `cardBackground`, `textSecondary`. Use `theme.palette.primaryGreen.main` not hardcoded hex
- **Custom fonts**: `FONTS` constant in `src/lib/globals.ts` (Anton, Palace, Pixer, NectoMono, etc.), files in `src/assets/fonts/`
- **Responsive**: Use MUI `useMediaQuery` for breakpoint checks (e.g., `useMediaQuery('(max-width:900px)')`)
- **Scroll animations**: `useScrollAnimation()` hook (IntersectionObserver) with `ANIMATIONS` constants from globals

### Constants & Conventions
- **All magic values** go in `src/lib/globals.ts` (`FONTS`, `LINKS`, `LAYOUT`, `SPACING`, `EFFECTS`, `ANIMATIONS`)
- **Type definitions** in `src/lib/` — `GameTypes.ts`, `MyJourneyTypes.ts`
- **Static content data** in `src/lib/data/` — `GameData.tsx`, `ProjectData.ts`, `JourneyData.ts`
- **External links**: Use `onClickUrl()` from `src/utils/openInNewTab.ts`
- **CSS vars** exported from `src/themes.ts` as `CSS_VARS` for non-MUI contexts

## Development
```bash
npm run dev      # Vite dev server with HMR
npm run build    # tsc -b && vite build
npm run lint     # ESLint (flat config)
npm run preview  # Preview production build
```
- Husky + lint-staged for pre-commit hooks
- No test framework currently configured

## Deployment
- **Netlify**: `public/_redirects` handles SPA fallback, `public/_headers` sets security headers
- Static assets: `public/` for sounds/redirects, `src/assets/` for images/fonts (bundled by Vite)

## Key Patterns
- **Lazy loading**: Always wrap new page components with `LC()` + `ErrorBoundary`
- **Card hover effect**: Use `EFFECTS.HOVER_SCALE` / `EFFECTS.CARD_SHADOW_HOVER` from globals
- **Game modal pattern**: `GameContainer` receives a Phaser config + handles start menu, pause, volume, difficulty, color options
- **Projects carousel**: Uses `react-slick` with custom arrow components