# jeemzu.me

[jeemzu.me](https://jeemzu.me) is a personal portfolio and project hub for James Friedenberg. It brings together developer information, browser games, interactive programming projects, Budgetize (a personal budgeting tool with an AI assistant), and a GDD Generator for formatting game design documents as PDFs. The site also includes accounts, game leaderboards, and administration features backed by a separate API repository.

## Architecture Overview

The frontend is a static single-page application. The .NET API and production database are deployed through a Render Blueprint; all AI workflows run inside the API.

Page titles and descriptions are defined in `src/lib/routeMetadata.json`. The frontend build generates an HTML entry for every registered route (including each playable game), so link-preview crawlers receive page-specific standard, Open Graph, and Twitter metadata without running JavaScript. Netlify serves those files ahead of the SPA fallback; React updates the same metadata during client-side navigation. Add metadata here when adding a route or playable game.

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

The profile chat uses the .NET API's retrieval-augmented generation (RAG) pipeline. Budgetize uses a native .NET router/analyst/planner workflow with a dedicated provider key; the browser sends its authoritative forecast and still previews and explicitly applies every proposal.

### Game Player

- Snake, Tetris, Brick Break, zAim and The (Im)Possible Game launch at `/play/<id>`; their legacy `/games/<id>` URLs redirect there.
- Shared Player code lives in `src/game-player`; each migrated game separates its entry metadata, rules, rendering, input, sound cues, and visual style under `src/games/<id>`.
- Player chrome uses the site theme; Snake is bioluminescent and Tetris uses neon-glass blocks. Arrow keys/WASD steer or move; Up/W rotates Tetris, Down/S soft-drops, Space hard-drops, and Esc/P pauses. Touch controls are not included. Snake music (`public/sounds/snake_music.mp3`) is a 59.6 s loop rebuilt in Audacity MCP: a 64-eighth-note phrase bridged and crossfaded so the wrap stays on the beat grid.
- Tetris uses clockwise SRS rotation, uniform piece selection, the existing 15-line level progression, and the original line/hard-drop scoring. Its next-piece preview, level, and lines are DOM HUD elements, including on narrow screens. Eleven original effects were synthesized with Audacity MCP, normalized to -12 dB peak, and exported as mono MP3/OGG pairs in `public/sounds/tetris_*`; per-cue playback gains live in `src/games/tetris/sounds.ts`.
- Brick Break uses a synthwave field with DOM level selection and completion actions. Its 20 layouts, unlock storage, armor, weighted power-ups and cumulative score/lives are preserved. Left/Right or A/D move the paddle; Space/click serves or releases a sticky ball; Q/E or the movement keys aim a caught ball.
- zAim plays as black targets on a white grid directly on the Player backdrop, with an inverting crosshair. During a run it shows only the countdown and a timer bar that drains and refills at each Endurance checkpoint (Reflex shows its wait/reaction cues instead); score, personal best and Top 10 appear after the run (`GameEntry.immersive`). Endurance, Reflex and Speed retain separate `zaim_<mode>` leaderboards; Reflex stores `10000 - roundedAverageMs` (clamped at zero) and decodes for display. Pause excludes elapsed time.
- The (Im)Possible Game (`/play/impossible`) is the SDL/WASM build of `cpp/platformer`, styled as starfield noir: parallax stars, gold-rimmed ground, crimson spikes. It renders GPU geometry at canvas size × DPR, steps physics at a fixed 60 Hz, and exposes lifecycle/event exports that `src/games/impossible` bridges to the Player. Space/Up/W/click jump (held jumps repeat); deaths auto-retry with an attempt counter. Rebuild with `cpp/build-all.ps1 -Only platformer` after activating emsdk. Jump/land/death/complete cues were synthesized, normalized to -12 dB peak in Audacity MCP and stored in `public/sounds/impossible_*`.
- The Level Editor lives at `/play/impossible/editor` (`/editor` redirects). Its canvas fits the available space at device resolution, and **Play** test-runs the current draft in an embedded Player without discarding editor state.
- `/play/sandbox` is development-only and exercises sizing, bloom, audio, and overlays (click to score, G to end a run). Canvas resolution follows viewport size and device pixel ratio; audio levels persist locally.

### Algorithm Visualizer

- Setup cards, playback controls, and comparison panels share the site's gilded stone frames and sapphire glow. Sorting/search bars, the A* grid, and AVL nodes use matching state colors; green, rose, and violet still distinguish completion, movement, and pivots.
- React and AVL colors come from `src/pages/algoviz/visualStyles.ts`. Keep the SDL palette in `cpp/algoviz/main.cpp` aligned when changing visualization state colors, and rebuild the tracked `public/wasm/algoviz.js` and `algoviz.wasm` outputs.

### Budgetize workspace

- Budgetize uses the shared gilded page heading and flush-left tools sidebar, starting directly below the navbar. **Views** contains the former tabs, with the current view highlighted; **Import / export** contains workbook/backup import, the spreadsheet template, JSON backup export, and spreadsheet export. Both groups use indented link-style actions with tooltips, and closing every group collapses the sidebar to an icon rail. On smaller screens it stacks above the workspace. Save, reload, undo/redo, and planning settings remain in the main workspace.
- **From Today** clears a custom plan start date and returns to the current month. The calendar's **Today** / **Start** button only changes the displayed month.
- The bottom-right **Notifications** button opens a conversation-style feed for current funding warnings, extra debt-payment guidance, and session save/import/export notices. Its badge counts unread messages; errors are identified separately. Opening the feed marks the displayed messages read without removing active warnings. Operation notices can be dismissed, and signing out clears them.
- Download names use `budgetize`; the internal `budgetize-me` JSON backup identifier is retained for compatibility with existing backups.

### GDD Generator

- **AI design assistant** is opt-in and requires sign-in. It progresses through concept, gameplay, world/progression, presentation, technical scope, and first playable/release. Each checkpoint accepts plain-text prompts and focused reference notes, labeled HTTP(S) links, PDF/DOCX/Markdown/text documents, and PNG/JPEG images. Links are not fetched; documents contribute extracted text and images are resized to at most 768 pixels / 256 KiB JPEG. Reference images guide the assistant but do not become PDF illustrations automatically.
- **Request proposal** explicitly sends the current GDD, pending proposal, recent checkpoint conversation, all reference notes, and current-checkpoint images to OpenAI through the authenticated API. **Approve checkpoint** replaces text only in the listed sections, preserving image groups, prototype controls and other sections. Manual GDD changes make an outstanding proposal stale; request a revision before approving it. Revising an earlier checkpoint reopens downstream approvals. The final checkpoint includes milestones, risks, acceptance criteria, release scope and out-of-scope work.
- Workflow-enabled **Download source ZIP** includes authoritative `editor.json`, `gdd.md`, references and image assets so incomplete prompts, pending proposals and approvals resume after import or account load. Edit this ZIP through the editor, not just `gdd.md`; non-assistant source exports remain Markdown-only. Account saves still require a generated PDF, but workflow-only changes do not invalidate an otherwise current PDF. No prompts or references upload automatically. Limits: 12 references total, 20,000 characters per reference / 60,000 combined, four images per checkpoint, 100,000 document-context characters, and the most recent 12 conversation turns / 32,000 characters per checkpoint. ZIP/account limits still apply.
- Deploy the sibling API's `/api/gdd-assistant` endpoint first. Both the GDD assistant and profile chatbot default to `gpt-6-luna`, independently configured server-side through `OpenAI__GddModel` and `OpenAI__ChatModel`. GDD uses a dedicated `OpenAI__GddApiKey` secret; missing configuration returns `503` without billing the chatbot key. Browser code never holds provider credentials. Budgetize's model configuration is unchanged.
- GDD and Budgetize sidebar tooltips share right-side placement, a left-edge arrow, sapphire background, gold border and parchment text. They are hover-only (including disabled action wrappers), matching Budgetize's existing focus/touch behavior.
- A flush-left **GDD tools** sidebar groups **Example GDD**, **Setup prompt**, **PDF actions**, and **Local editing** into independently expandable sections, with link-style actions indented beside a vertical guide and descriptive action tooltips. Closing every group automatically collapses it to an icon rail; selecting an icon reopens its section. The expand control restores the previous groups, or opens all groups if every group was closed. On desktop, the sidebar starts directly below the navbar beside the page heading and editor, filling their height with a minimum of one viewport, including when collapsed; on smaller screens it stays compact and stacks above the editor.
- **Dev Setup Prompt**, in **Setup prompt**, selects a Unity or Three.js Windows 10/11 workflow, agent client, MCP config path, and tools folder. Unity exposes its version/module fields and manual sign-in limitation; Three.js uses Node.js LTS, npm, browser/WebGL checks, and project-aware Vite/TypeScript tooling without Unity installation/licensing. Both cover Blender >= 5.1 with Blender Lab MCP and Audacity MCP, client restart requirements, and runtime verification of commands, repository addresses, and add-on settings. Client selection fills the default config path; paths support `%USERPROFILE%`, `%APPDATA%`, and `%LOCALAPPDATA%`. Downloads are local Markdown, not installation or account storage. Agreement permission is unchecked by default; elevation, safe application closure, and client reload may require user action. Bundled workflows: [Unity](src/pages/gdd/dev-setup-prompt.md), [Three.js](src/pages/gdd/threejs-dev-setup-prompt.md). Unreal, Phaser, and custom-engine setup prompts are not provided.
- Open `/gdd-generator` and fill out the web form. Game title and subheadings use single-line inputs; cover and body text use multiline fields. The eight default sections cover game direction through audience/release. Add, rename, remove, or reorder sections, text subsections, and image categories with the labeled controls. Removal requires confirmation.
- **Prototype requirements** selects Unity (default), Three.js, Unreal, Phaser, and/or a custom engine independently from Windows, macOS, Linux, Android, iOS, Web, Console, and custom targets. Edit each engine's version/toolchain, rendering, asset loading, dependencies, and constraints as Markdown tables, plus shared controls, saves, multiplayer, locales, performance targets, and open decisions. Selected requirements become a PDF/source section before **First playable slice**. Deselecting an engine retains its text in account drafts but excludes it from PDFs and source ZIPs. **Download template** follows the current engine/platform selection. Standard prototype subsections in imported Markdown restore these controls; legacy and custom-format documents stay unchanged and can opt in with **Add prototype requirements**.
- **View Example GDD** in **Example GDD** opens the complete **Dino Rush** design with ten captioned visual references. **Populate form** loads it as an editable, unsaved draft, confirming before replacing unsaved work and clearing any previous PDF/account selection. References populate editable image categories and appear in generated PDFs. **Download example ZIP** includes the same document as `gdd.md`, all ten original images in `images/`, and editing/import instructions; import it directly through **Import GDD**. Image bytes load only when populating or downloading; a failed load leaves the existing draft intact. The contributor confirmed redistribution permission; original watermarks are retained. The blank template remains separate. The bundled example source is [dino-rush.md](src/pages/gdd/dino-rush.md).
- **Add image category** creates a named image group inside that section. **Add images** accepts multiple PNG/JPEG files, previews them, and starts captions from their filenames. Edit captions/source credits and reorder or remove images independently. Indentation and subtle left borders distinguish sections, subsections/image categories, and individual images. Groups move with their section, and PDF figure numbers follow the final document order.
- Empty text subsections, image groups, and sections are omitted from the PDF. Body fields accept paragraphs, inline Markdown, lists, tables, blockquotes, code blocks, and HTTP(S) links; use the form controls for headings and image placement. HTML and remote images remain unsupported.
- **PDF actions** groups **Generate PDF**, **Download PDF**, and **Open PDF**. Download and Open remain visible within the expanded section but disabled until a current PDF is available, with a tooltip indicating that generation is required. Browser memory is not permanent storage, and a tab-close/reload warning protects unsaved edits. SPA navigation still leaves the editor without that native browser warning.
- **Local editing** contains **Download template**, **Import GDD**, and **Download source ZIP**. **Import GDD** accepts ZIP, PDF, DOCX, UTF-8 Markdown, plain text, and HTML, processing locally without AI rewriting. Converted documents populate the editable form and are treated as unsaved edits. Without an assistant workflow, **Download source ZIP** validates content and packages `gdd.md` with referenced `images/`, omitting `editor.json` so external Markdown edits remain authoritative. Guided drafts include the editor snapshot to preserve progress. Empty form fields are omitted from Markdown; source export does not clear the unsaved-editor warning. Account saves retain the full editor snapshot.
- PDF import supports up to 100 pages with selectable text, infers headings and reading order, removes repeated page furniture, and extracts supported raster image placements with source-page captions. Images are re-encoded as PNG, or quality-0.95 JPEG for opaque images when at least 20% smaller, to avoid inflating photographic references beyond the ZIP limit; transparent images remain PNG. Review tables, columns, captions, and placement; vector artwork is not extracted, masked/grouped image operations produce an explicit error, and scanned pages need external OCR. DOCX preserves supported headings, formatting, lists, simple tables, and embedded raster images through Mammoth with external file access and embedded style maps disabled. HTML is parsed in an inert template, never rendered; active content is excluded with a warning. HTML images must be embedded base64 raster data; external/relative images are rejected, never fetched. PNG/JPEG are retained; GIF/WebP/BMP become static PNGs. Merged/nested HTML tables and table images/lists require manual flattening.
- Source headings retain their order, with deeper headings flattened to the supported three-level hierarchy. Documents without sections receive an **Imported content** section; long cover content moves into a section rather than being truncated. Standalone Markdown cannot supply local image bytes; package Markdown and images in a ZIP instead. For ZIP imports, keep `images/` beside `gdd.md` (or `editor.json` for saved drafts), at the root or inside a single parent folder. Multiple roots and deeper nesting are rejected. Importing over unsaved work requires confirmation. Existing ZIP imports retain their previous behavior; `editor.json`, when present, remains authoritative.
- **Generate PDF** opens the result in a new tab rather than embedding a viewer in the editor. **Open PDF** and **Download PDF** remain available afterward, including for loaded account documents. If the browser blocks the new tab, use **Open PDF**. The US Letter layout follows the final *The Knotted Grove* GDD: forest-green serif headings, a green cover rail, a gold accent, lightly shaded tables, captions, running headers, and page counts. Linked contents and PDF bookmarks follow the supplied section order; a measuring pass calculates section page numbers after text reflows.
- Imports and PDF formatting do not rewrite wording or generate images. Only explicitly approved assistant proposals change document text. Editing document content invalidates the previous PDF so it cannot be downloaded as if it were current. Invalid imports/uploads leave the existing draft intact; multi-image uploads succeed or fail together.
- Editing, imports, and PDF generation stay in browser memory; nothing uploads automatically. Signed-in users can explicitly **Save to account** to store multiple named GDDs, each containing the current PDF and editable ZIP with original images. **Load** restores both; **Update saved GDD**, **Save as new**, **Download PDF**, and confirmed **Delete** manage the library. Names come from the game title. Account saves clear the unsaved-edit warning; edits require regenerating the PDF before saving again. Signing out leaves the current local form intact but hides the account library.
- Account storage is limited to **100 MB (104,857,600 bytes)** per user, counting PDFs plus compressed draft ZIPs, with at most 20 MB per PDF and 25 MB per ZIP. Updates replace the previous bytes; deletes release space. Revision checks prevent silently overwriting changes from another tab/device. A failed or conflicting load keeps the current local form intact.
- Saved documents appear in a separate table with document, saved timestamp, size, and action columns; the current document is marked. The table scrolls horizontally on narrow screens.
- Deploy the sibling `jeemzu.api` GDD endpoints and `AddGddDocuments` migration before this frontend; the API applies migrations at startup. Existing authentication/refresh tokens are reused. Account storage errors are shown without disabling the local-only workflow once the request ends.
- Local limits: 25 MB per input/ZIP, 60 MB extracted content, 100 GDD archive entries (2,000 for DOCX preflight), 1 MB each for editor metadata and text/Markdown/HTML inputs, 150,000 characters of PDF Markdown, 40 sections, 400 text/image subsections, up to 97 distinct images (58 MB combined), and 10 MB / 24 megapixels per image. Unsupported or missing content produces an error instead of being silently omitted.
- PDF generation and its bundled OFL-licensed Noto fonts load on demand. Fonts cover Latin, Greek, and Cyrillic; other scripts and emoji are not guaranteed. Review the PDF before distributing it. The font license ships at `/licenses/gdd-fonts-OFL.txt`.

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
- Three.js (via the shared Game Player in `src/game-player`) for JavaScript games; C++20 games and the algorithm visualizer compile to WebAssembly with Emscripten.
- Game Player routes (`/play/*`, including the Level Editor) hide the site footer; legacy `/games/:id` links redirect to `/play/:id`.
- `openapi-typescript` generates API types from the .NET API's Swagger document.
- Netlify publishes the Vite `dist/` output as a single-page application.

### Backend

- ASP.NET Core 8 provides the public REST API for accounts, authentication, profiles, scores, budgets, contact requests, and profile chat.
- Entity Framework Core 8 with Npgsql connects to PostgreSQL 16. The `pgvector` extension stores and searches knowledge embeddings.
- JWT access tokens and httpOnly refresh cookies support authentication; Resend handles account email and contact delivery.
- The .NET API also hosts the Budgetize and GDD assistant workflows through Semantic Kernel, using dedicated OpenAI keys without falling back to the profile key.
- The API container and PostgreSQL are deployed from the [`jeemzu.api` repository](https://github.com/Jeemzu/jeemzu.api) through Render.

### AI

- The profile chat uses Microsoft Semantic Kernel with OpenAI chat completions and embeddings. It retrieves relevant knowledge from PostgreSQL via pgvector before generating a grounded response.
- Budgetize uses router → analysis/planning/capability gap → deterministic proposal validation, with explicit browser approval.
- OpenAI powers chat, planning, and embeddings. All three assistant models independently default to GPT-6 Luna.

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
