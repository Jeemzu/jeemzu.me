# Copilot Instructions for Jeemzu.com

## Project Overview
This is a personal portfolio website built as a single-page application using React + TypeScript + Vite. It's designed for deployment on Netlify with custom fonts and Material-UI theming.

## Architecture & Key Patterns

### Component Structure
- **Multi-page portfolio**: Uses Wouter for client-side routing with proper route-based navigation
- **Page components**: `LandingPage.tsx`, `ProjectsPage.tsx`, `ExperiencePage.tsx` are page-level wrappers
- **Reusable components**: `AboutMe`, `Projects`, `MyJourney` are presentation components used within pages
- **Lazy loading**: Components are wrapped with `LC()` helper function for code splitting (see `App.tsx`)
- **Material-UI + Custom Theme**: Extended MUI palette with custom colors (`primaryGreen`, `darkBackground`, `whiteHover`) defined in `src/themes.ts`
- **Navigation**: Sticky `Navigation.tsx` component with responsive mobile drawer

### State Management
- **Local state**: Components use standard React hooks for local UI state (no global state currently needed)

### Styling Conventions
- **MUI sx prop**: Primary styling method, avoid external CSS files when possible
- **Custom fonts**: Defined in `FONTS` constant in `src/lib/globals.ts`, loaded via font files in `src/assets/fonts/`
- **Color system**: Use theme palette colors (`theme.palette.primaryGreen.main`, etc.) rather than hardcoded hex values
- **Responsive design**: Use MUI's `useMediaQuery` hook for breakpoint-specific behavior

### Data & Content Organization
- **Static data**: Project and journey data stored as typed objects in `src/lib/data/` directory
- **Assets**: Images and fonts organized in `src/assets/` subdirectories
- **Type definitions**: Shared types in `src/lib/` (e.g., `MyJourneyTypes.ts`)

### Key Utilities & Conventions
- **Global constants**: Centralized in `src/lib/globals.ts` (fonts, links, layout values, effects)
- **External links**: Use `onClickUrl()` utility from `src/utils/openInNewTab.ts` for external navigation
- **Journey roadmap**: Timeline cards use 2-column staggered layout with connecting lines for visual flow

## Development Workflow
- **Dev server**: `npm run dev` (Vite with HMR)
- **Build**: `npm run build` (TypeScript check + Vite build)
- **Lint**: `npm run lint` (ESLint with flat config)

## Deployment Specifics
- **Netlify deployment**: `public/_headers` and `public/_redirects` files configure security headers and SPA routing
- **Static assets**: PDFs and images served from `public/` and `src/assets/`

## Component Patterns
- **Error boundaries**: Wrap lazy components with `ErrorBoundary` component
- **Loading states**: Use custom `LoadingSpinner` component matching brand colors
- **Interactive cards**: Use hover effects with `EFFECTS` constants and rotation props
- **Sliders**: Projects section uses `react-slick` with custom arrow components

## When Adding Features
- Add new constants to `src/lib/globals.ts` rather than hardcoding values
- Use TypeScript interfaces for data structures in `src/lib/` directory  
- Follow MUI theming patterns and extend palette when needed
- Maintain lazy loading pattern for new page-level components