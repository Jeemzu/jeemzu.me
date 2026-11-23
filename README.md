# jeemzu.me

[jeemzu.me](https://jeemzu.me) is a personal portfolio and project hub for James Friedenberg. It brings together developer information, interactive programming projects, and Budgetize (a personal budgeting tool with an AI assistant). The site also includes accounts and administration features backed by a separate API repository.

## Architecture Overview

The frontend is a static single-page application. The .NET API and production database are deployed through a Render Blueprint; all AI workflows run inside the API.

Page titles and descriptions are defined in `src/lib/routeMetadata.json`. The frontend build generates an HTML entry for every registered route, so link-preview crawlers receive page-specific standard, Open Graph, and Twitter metadata without running JavaScript. Netlify serves those files ahead of the SPA fallback; React updates the same metadata during client-side navigation. Add metadata here when adding a route.

The favicon uses the header's gold JF monogram on a transparent background, supplied as a self-contained vector in [public/jf.svg](public/jf.svg).

Buttons use a shared gold/sapphire gleam overlay for keyboard focus instead of a post-click outline. The highlight respects reduced motion and falls back to a system outline in forced-colors mode; input and text-link focus indicators remain unchanged.
The navbar logo and route items each render as a single styled link, giving each one tab stop on desktop and in the mobile drawer.

```text
Browser
  └── Netlify: React application
        └── api.jeemzu.me: ASP.NET Core API
              ├── Render PostgreSQL: application data and vector search
              └── OpenAI: chat completions and embeddings
```

The profile chat uses the .NET API's retrieval-augmented generation (RAG) pipeline. Budgetize uses a native .NET router/analyst/planner workflow; all AI features use the same server-side OpenAI key. The browser sends its authoritative forecast and still previews and explicitly applies every proposal.

### Algorithm Visualizer

- Setup cards, playback controls, and comparison panels share the site's gilded stone frames and sapphire glow. Sorting/search bars, the A* grid, and AVL nodes use matching state colors; green, rose, and violet still distinguish completion, movement, and pivots.
- React and AVL colors come from `src/pages/algoviz/visualStyles.ts`. Keep the SDL palette in `cpp/algoviz/main.cpp` aligned when changing visualization state colors, and rebuild the tracked `public/wasm/algoviz.js` and `algoviz.wasm` outputs.

### Budgetize workspace

- Budgetize uses the shared gilded page heading and flush-left tools sidebar, starting directly below the navbar. **Views** contains the former tabs, with the current view highlighted; **Import / export** contains workbook/backup import, the spreadsheet template, JSON backup export, and spreadsheet export. Both groups use indented link-style actions with tooltips, and closing every group collapses the sidebar to an icon rail. On smaller screens it stacks above the workspace. Save, reload, undo/redo, and planning settings remain in the main workspace.
- The assistant is available only to admins; the API checks the current account role on every request.
- **From Today** clears a custom plan start date and returns to the current month. The calendar's **Today** / **Start** button only changes the displayed month.
- The bottom-right **Notifications** button opens a conversation-style feed for current funding warnings, extra debt-payment guidance, and session save/import/export notices. Its badge counts unread messages; errors are identified separately. Opening the feed marks the displayed messages read without removing active warnings. Operation notices can be dismissed, and signing out clears them.
- Download names use `budgetize`; the internal `budgetize-me` JSON backup identifier is retained for compatibility with existing backups.

### yt-dlp Builder

- Open `/yt-dlp`, choose the Windows (PowerShell) or Linux/macOS (Bash/Zsh) tab, and paste a complete YouTube video or playlist URL. Tabs switch command syntax and setup instructions without clearing download options. Copy the generated command and paste it into that shell, not Windows Command Prompt or a batch file.
- Controls cover single video/playlist, video/MP3, video resolution cap or MP3 quality, English subtitles (including automatic captions when available), a separate thumbnail file, and an optional output folder. Playlist mode requires a URL containing `list=`. Subtitle and thumbnail files are saved alongside the media, not embedded.
- Each tab includes its own setup walkthrough linking yt-dlp, FFmpeg, Node.js, Python, and yt-dlp-ejs. PowerShell commands start with `.\yt-dlp.exe`: navigate to the executable's folder before pasting. Place FFmpeg/ffprobe beside the executable or on PATH. Install Node.js 22+ on PATH; generated commands explicitly enable it with `--js-runtimes node`. Bash/Zsh commands retain the PATH-based `yt-dlp` invocation, with virtual-environment instructions for Python installations and a local-binary alternative.
- The official executable bundles Python and yt-dlp-ejs, so neither needs a separate install. For a Python-based installation instead, the walkthrough links Python and uses `py -m pip install -U "yt-dlp[default]"` to install yt-dlp with its matching EJS package. Best video formats may require merging; merged video uses MKV. Available source quality is never improved by selecting a higher bitrate or resolution.
- Commands ignore local yt-dlp configuration, avoid overwriting existing downloads, and include video IDs in filenames. Playlist filenames also include the playlist index. An empty output folder uses the terminal's working directory; shell variables are quoted literally, so use an actual path.
- The builder runs entirely in browser memory: no account, API request, URL upload, or persistence. Browsers cannot launch local yt-dlp processes without a separately installed companion application or extension; this app only generates commands. Download only content you have permission to save and follow the source site's terms.

### Budgetize subscriptions

- Edit data has separate Monthly bills and Subscriptions sections with the same payment and recurrence controls.
- Subscriptions remain in the budget's `bills` array with `isSubscription: true`; existing bills without the flag stay in Monthly bills. Totals, projections, funding, and temporary changes treat both as bills.
- Spreadsheet bill imports replace Monthly bills but keep subscriptions. JSON backups preserve the section assignment and restore the entire budget.
- Deploy the backend bill DTO's `IsSubscription` field before the frontend so saving and reloading preserves the section assignment. No database migration is needed.

### Budgetize undo and contribution locks

- Undo/Redo reverses committed budget edits, including table fields, imports, removals, and accepted assistant proposals. A focused text-field edit is one undo step; adding/removing a pay month is one step for everyone. History holds up to 100 steps in this workspace session, survives Save, and resets on Reload. Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z work outside fields; focused fields retain native text undo.
- In Edit data > People, lock auto-pay and essentials separately to editable fixed per-paycheck amounts. The exact amount lands every paycheck, including in four- and five-payday months. Zero is a valid lock; unlocking returns the person to proportional funding.
- A partial starting month includes only remaining paydays. Months without that person's income entry receive no contribution. Earlier monthly-named locks retain the entered number as the per-paycheck amount.
- Both minimum and flat deposit modes preserve locks and distribute remaining funding among unlocked people by gross income. Unlocked contributions never go below $0. All-locked shortfalls and excess funding produce warnings instead of changing locks.
- Projection account tables keep every contributor's split visible, locked or unlocked; the weekly/daily balance table also shows each person's paycheck contributions separately from one-time income.
- Backups, saved budgets, and spreadsheet exports include per-paycheck locks; re-importing income preserves locks for matching names. Deploy the backend `BudgetPersonDto` nullable per-paycheck fields before this frontend, then regenerate API types. No database migration is needed.

### Budgetize personal planning

- Personal planning includes a combined expense table and separate plans and weekly/daily balance projections for each person. Income is the paycheck remainder after auto-pay and essentials, using the selected deposit mode and contribution locks.
- Expenses default to one-time; weekly, biweekly, monthly, quarterly, and annual schedules are supported, with an optional inclusive end date. Calendar recurrences keep the first charge's day, clamping to short months.
- Combined expenses withdraw proportionally to each person's positive monthly paycheck remainder. Shares recalculate for each occurrence month and sum to the exact expense amount. Missing income for any person uses an equal split and flags it; all-zero or negative remainders also split equally.
- Individual expenses withdraw only from their owner's personal account. Existing personal one-time expenses/deposits also appear in personal projections. These plans affect monthly totals, calendar entries, and personal balances, never shared-account funding.
- Plans participate in Save/Reload, JSON backups, spreadsheet exports, and Undo/Redo. Removing a person removes their individual expenses; combined plans remain.
- Deploy the backend `BudgetPersonalExpenseDto` and `BudgetDataDto.PersonalExpenses` changes before this frontend; older servers discard unknown fields. No database migration is required. Spreadsheet exports include plans; restore them with a JSON backup.

## Technical Stack

### Frontend

- React 19, TypeScript 5.8, and Vite 6, with Wouter for routing.
- Material UI 7 for the component system and Zustand 5 for client state.
- The C++20 algorithm visualizer compiles to WebAssembly with Emscripten.
- `openapi-typescript` generates API types from the .NET API's Swagger document.
- Netlify publishes the Vite `dist/` output as a single-page application.

### Backend

- ASP.NET Core 8 provides the public REST API for accounts, authentication, profiles, budgets, contact requests, and profile chat.
- Entity Framework Core 8 with Npgsql connects to PostgreSQL 16. The `pgvector` extension stores and searches knowledge embeddings.
- JWT access tokens and httpOnly refresh cookies support authentication; Resend handles account email and contact delivery.
- The .NET API also hosts the Budgetize assistant workflow through Semantic Kernel, using the same OpenAI API key as profile chat and embeddings.
- The API container and PostgreSQL are deployed from the [`jeemzu.api` repository](https://github.com/Jeemzu/jeemzu.api) through Render.

### AI

- The profile chat uses Microsoft Semantic Kernel with OpenAI chat completions and embeddings. It retrieves relevant knowledge from PostgreSQL via pgvector before generating a grounded response.
- Budgetize uses router → analysis/planning/capability gap → deterministic proposal validation, with explicit browser approval.
- Profile chat and Budgetize both use GPT-6 Luna. RAG embeddings use the compatible `text-embedding-3-small` embedding model.

### 3rd Party Services

| Service        | Use                                                                                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Netlify        | Hosts the public frontend and serves the static SPA.                                                                                                       |
| Render         | Hosts the public .NET API and managed PostgreSQL database, defined together in `jeemzu.api/render.yaml`. |
| OpenAI         | Provides language models and text embeddings for AI features.                                                                                              |
| Resend         | Delivers contact and account verification/recovery emails when configured.                                                                                 |
| Google Fonts   | Serves the Cinzel and Caudex fonts used by the site.                                                                                                       |
| GitHub Actions | Notifies the frontend repository when the backend changes so generated OpenAPI types can be updated. Render performs the backend build and deployment.     |

## Local Development

Open [jeemzu.me.code-workspace](./jeemzu.me.code-workspace) with `jeemzu.api` checked out alongside this repository. Install the frontend dependencies and configure the API's user secrets using its README (local PostgreSQL is `127.0.0.1:15432`). The **Dev: All** task starts the frontend at `http://localhost:5174` and starts the API at `http://localhost:5050` after PostgreSQL is healthy. Standalone frontend startup is unchanged.

### Frontend

Requirements: Node.js 20 or later. Emscripten is additionally required to rebuild the C++ WebAssembly projects.

```bash
npm install
npm run dev
```

Vite serves the frontend at `http://localhost:5173`. The API base URL can be set with `VITE_API_URL`; it defaults to `http://localhost:5050/api`.

### Level Editor MCP

The local Level Editor can pair with an agent through a stdio MCP companion.
It shares validated editor commands, revision checks, undo/redo, and browser-local
saves with the UI. Verified production Admins can have the agent add a finished
level to `public/levels` for the next deploy. See [Level Editor MCP](docs/level-editor-mcp.md) for setup,
supported actions, permissions, and the remaining preview-control phases.

### Backend

Follow the setup instructions in the [`jeemzu.api` README](https://github.com/Jeemzu/jeemzu.api) to configure .NET, local PostgreSQL, and required secrets. The API applies database migrations when it starts; no Python agents service is required.

## Build and Deployment

```bash
npm run build          # Type-check and build the frontend
npm run build:cpp      # Compile C++ projects to WebAssembly
npm run build:all      # Build WebAssembly projects, then the frontend
npm run lint           # Run ESLint
npm run test           # Run frontend tests
```

Netlify deploys the frontend build from `dist/`. The Render Blueprint provisions the API and database; the API auto-deploys from `main`. Set the production `VITE_API_URL` to `https://api.jeemzu.me/api`. Dedicated AI keys belong only on the API service, never in `VITE_` variables.

After backend changes, GitHub Actions dispatches an `api-types-update` event to this repository. API types can also be regenerated manually with `npm run generate-api-types:prod`.

## Admin File Storage

The admin page's **My Files** panel uploads, lists, downloads, and deletes files private to the uploading admin account. Any file type is accepted, up to 25 MB (26,214,400 bytes) per file. Downloads use authenticated requests, not public links.

The **View image or video** dropdown previews stored JPEG/JFIF, PNG/APNG, GIF, WebP, AVIF, BMP, ICO, and SVG images, and MP4/M4V, WebM, Ogg, and MOV videos in-app. Video playback uses native browser controls; format and codec support depends on the browser (no transcoding). Unsupported or damaged media displays an error. Previews use authenticated downloads and temporary local blob URLs that are released when the selection changes or the panel closes; files remain private. Each selected file is downloaded in full before previewing.

Files are stored in the existing Render PostgreSQL database, not the API container's temporary filesystem. Deploy the backend's `AddStoredFiles` migration with the API before deploying this frontend; migrations run automatically on API startup. No additional disk or storage service is required. File contents share the database's capacity with all other site data; monitor overall usage in Render.
