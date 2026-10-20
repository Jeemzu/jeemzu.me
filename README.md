# jeemzu.me

[jeemzu.me](https://jeemzu.me) is a personal portfolio and project hub for James Friedenberg. It brings together developer information, browser games, interactive programming projects, Budgetize (a personal budgeting tool with an AI assistant), and a GDD Generator for formatting game design documents as PDFs. The site also includes accounts, game leaderboards, and administration features backed by a separate API repository.

## Architecture Overview

The frontend is a static single-page application. Backend services and the production database are deployed together through a Render Blueprint; only the .NET API is public. The Python agents service communicates with the API over Render's private network.

```text
Browser
  └── Netlify: React application
        └── api.jeemzu.me: ASP.NET Core API
              ├── Render PostgreSQL: application data and vector search
              ├── Private FastAPI agents: Budgetize assistant
              └── OpenAI: chat completions and embeddings
```

The profile chat uses the .NET API's retrieval-augmented generation (RAG) pipeline. Budgetize chat is sent to the .NET API, which proxies it to the private Python service. The browser does not call the agents service directly.

### Budgetize workspace

- Budgetize uses the site's dark stone and gold styling, with section navigation above a separate planning-settings row.
- **From Today** clears a custom plan start date and returns to the current month. The calendar's **Today** / **Start** button only changes the displayed month.
- The bottom-right **Notifications** button opens a conversation-style feed for current funding warnings, extra debt-payment guidance, and session save/import/export notices. Its badge counts unread messages; errors are identified separately. Opening the feed marks the displayed messages read without removing active warnings. Operation notices can be dismissed, and signing out clears them.
- Download names use `budgetize`; the internal `budgetize-me` JSON backup identifier is retained for compatibility with existing backups.

### GDD Generator

- Open `/gdd-generator` and fill out the web form. Game title and subheadings use single-line inputs; cover and body text use multiline fields. The eight default sections cover game direction through audience/release. Add, rename, remove, or reorder sections, text subsections, and image categories with the labeled controls. Removal requires confirmation.
- **Add image category** creates a named image group inside that section. **Add images** accepts multiple PNG/JPEG files, previews them, and starts captions from their filenames. Edit captions/source credits and reorder or remove images independently. Indentation and subtle left borders distinguish sections, subsections/image categories, and individual images. Groups move with their section, and PDF figure numbers follow the final document order.
- Empty text subsections, image groups, and sections are omitted from the PDF. Body fields accept paragraphs, inline Markdown, lists, tables, blockquotes, code blocks, and HTTP(S) links; use the form controls for headings and image placement. HTML and remote images remain unsupported.
- The top toolbar groups **Generate PDF**, **Download PDF**, and **Open PDF**. Download and Open remain visible but disabled until a current PDF is available, with a tooltip indicating that generation is required. Draft ZIP export is no longer exposed; use account saves to retain web-form work. Browser memory is not permanent storage, and a tab-close/reload warning protects unsaved edits. SPA navigation still leaves the editor without that native browser warning.
- The **Local editing** card sits beside the PDF controls at half width on desktop and stacks on mobile. It offers **Download template** and **Import GDD** for completed Markdown templates or existing versioned drafts. Import GDD opens a folder-layout diagram before file selection. ZIP either the folder contents or a single parent folder, keeping `images/` beside `gdd.md` (or `editor.json` for saved drafts). Multiple document roots and deeper nesting are rejected. Importing over unsaved work requires confirmation. Legacy imports populate the form without losing supported lists, tables, inline formatting, or image order. When a ZIP contains `editor.json`, that snapshot is authoritative; edit the form rather than modifying its companion `gdd.md` externally.
- **Generate PDF** opens the result in a new tab rather than embedding a viewer in the editor. **Open PDF** and **Download PDF** remain available afterward, including for loaded account documents. If the browser blocks the new tab, use **Open PDF**. The US Letter layout follows the final *The Knotted Grove* GDD: forest-green serif headings, a green cover rail, a gold accent, lightly shaded tables, captions, running headers, and page counts. Linked contents and PDF bookmarks follow the supplied section order; a measuring pass calculates section page numbers after text reflows.
- Wording and image content are not rewritten or AI-generated. Editing the form invalidates the previous PDF so it cannot be downloaded as if it were current. Invalid imports/uploads leave the existing draft intact; multi-image uploads succeed or fail together.
- Editing, imports, and PDF generation stay in browser memory; nothing uploads automatically. Signed-in users can explicitly **Save to account** to store multiple named GDDs, each containing the current PDF and editable ZIP with original images. **Load** restores both; **Update saved GDD**, **Save as new**, **Download PDF**, and confirmed **Delete** manage the library. Names come from the game title. Account saves clear the unsaved-edit warning; edits require regenerating the PDF before saving again. Signing out leaves the current local form intact but hides the account library.
- Account storage is limited to **100 MB (104,857,600 bytes)** per user, counting PDFs plus compressed draft ZIPs, with at most 20 MB per PDF and 25 MB per ZIP. Updates replace the previous bytes; deletes release space. Revision checks prevent silently overwriting changes from another tab/device. A failed or conflicting load keeps the current local form intact.
- Saved documents appear in a separate table with document, saved timestamp, size, and action columns; the current document is marked. The table scrolls horizontally on narrow screens.
- Deploy the sibling `jeemzu.api` GDD endpoints and `AddGddDocuments` migration before this frontend; the API applies migrations at startup. Existing authentication/refresh tokens are reused. Account storage errors are shown without disabling the local-only workflow once the request ends.
- Local limits: 25 MB ZIP, 60 MB extracted content, 100 archive entries, 1 MB each for editor metadata and Markdown, 150,000 characters of PDF Markdown, 40 sections, 400 text/image subsections, up to 97 distinct images (58 MB combined), and 10 MB / 24 megapixels per image. Unsupported or missing content produces an error instead of being silently omitted.
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
- Phaser 3 for JavaScript games; C++20 games and the algorithm visualizer compile to WebAssembly with Emscripten.
- Individual game routes (`/games/:id`) hide the site footer; the Games listing (`/games`) keeps it.
- `openapi-typescript` generates API types from the .NET API's Swagger document.
- Netlify publishes the Vite `dist/` output as a single-page application.

### Backend

- ASP.NET Core 8 provides the public REST API for accounts, authentication, profiles, scores, budgets, contact requests, and profile chat.
- Entity Framework Core 8 with Npgsql connects to PostgreSQL 16. The `pgvector` extension stores and searches knowledge embeddings.
- JWT access tokens and httpOnly refresh cookies support authentication; Resend handles account email and contact delivery.
- A Python 3.11 FastAPI service provides LangGraph-based agent workflows. The .NET API calls its Budgetize assistant over the private service network.
- Both services are containerized and deployed from the [`jeemzu.api` repository](https://github.com/Jeemzu/jeemzu.api). Render manages the services and production PostgreSQL instance.

### AI

- The profile chat uses Microsoft Semantic Kernel with OpenAI chat completions and embeddings. It retrieves relevant knowledge from PostgreSQL via pgvector before generating a grounded response.
- The Python service uses LangGraph and LangChain integrations to orchestrate specialized agent workflows, including the Budgetize assistant.
- OpenAI models power chat, planning, and embeddings. Tavily provides web search to agent workflows when configured.

### 3rd Party Services

| Service        | Use                                                                                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Netlify        | Hosts the public frontend and serves the static SPA.                                                                                                       |
| Render         | Hosts the public .NET API, private Python agents service, and managed PostgreSQL database. The resources are defined together in `jeemzu.api/render.yaml`. |
| OpenAI         | Provides language models and text embeddings for AI features.                                                                                              |
| Tavily         | Optional web-search integration for AI agent workflows; requires a `TAVILY_API_KEY`.                                                                       |
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

### Backend

Follow the setup instructions in the [`jeemzu.api` README](https://github.com/Jeemzu/jeemzu.api) to configure .NET, local PostgreSQL, the Python agents, and required secrets. The API applies database migrations when it starts.

## Build and Deployment

```bash
npm run build          # Type-check and build the frontend
npm run build:cpp      # Compile C++ projects to WebAssembly
npm run build:all      # Build WebAssembly projects, then the frontend
npm run lint           # Run ESLint
npm run test           # Run frontend tests
```

Netlify deploys the frontend build from `dist/`. The Render Blueprint in the backend repository provisions the API, private agents service, and database; both containers auto-deploy from `main`. Set the production `VITE_API_URL` to `https://api.jeemzu.me/api`.

After backend changes, GitHub Actions dispatches an `api-types-update` event to this repository. API types can also be regenerated manually with `npm run generate-api-types:prod`.
