# jeemzugames.com launch checklist

Work through the phases in order. This is a setup and implementation plan, not a record of provisioned services.

## Scope and boundaries

- New frontend repository: `Jeemzu/jeemzugames.com`.
- Move Snake, Tetris, Brick Break, zAim, The (Im)Possible Game and its editor, and Better Putt Party.
- Local games still run in the browser; they do not need individual game servers.
- `games-api` will own new games accounts, high scores, and leaderboards.
- No existing game accounts, scores, or other game data need migrating.
- Leave existing `jeemzu.me` accounts, Budgetize data, other non-game data, and their API/database intact.
- Do not share account tokens, signing keys, cookies, or password-reset flows between the two sites.

## Decisions made

- Frontend hosting: Cloudflare, replacing the proposed Netlify site for games only. Provisioning is still pending; the portfolio stays on its existing host.
- Account management: retain the existing implementation approach; do not introduce Supabase Auth or another replacement identity provider. Reuse/adapt that approach for independent games accounts in games-api, without changing portfolio accounts.
- Expected audience: a small playground for friends, with few accounts. Avoid infrastructure changes aimed at large-scale growth unless requirements change.

## Proposed services

Cloudflare frontend hosting is selected. Workers Static Assets is the proposed deployment option to review during setup. Render remains a recommendation, not a confirmed backend hosting selection.

| Resource | Proposed purpose | When needed |
| --- | --- | --- |
| GitHub frontend repository | Games website source and CI | First |
| Cloudflare frontend deployment | Static frontend, CDN, deploy previews, HTTPS | Launch; hosting selected, setup pending |
| Render `games-api` web service | Accounts, profiles, scores, leaderboards | Launch; reuse an existing suitable games service |
| Render `games-realtime` web service | Putt Party WebSockets | Launch; reuse the current service if suitable |
| Dedicated games PostgreSQL database | Games identities, refresh sessions, scores, preferences | Launch; confirm what games-api already has |
| Transactional email provider | Account verification and password resets | Before enabling public registration |
| Staging frontend/API/realtime/database | Isolated integration and deployment validation | Before public launch |
| Monitoring and alerts | HTTP availability, WebSocket connectivity, errors, spending | Before public launch |

No separate asset bucket, Redis, message broker, Kubernetes cluster, or per-game backend is required by this plan. Revisit only when measured requirements justify them.

## 1. Confirm the deployment design

- [ ] Inspect the actual `games-api` repository, existing hosting, infrastructure definitions, database, authentication, health endpoints, and deployment workflows. Record what can be reused before creating duplicate services.
- [ ] Confirm the Cloudflare deployment option and remaining backend hosting providers, production/staging regions, service sizes, database backup retention, and monthly budget. Use an always-on realtime service for predictable multiplayer availability.
- [ ] Reserve the public addresses: `https://jeemzugames.com`, `https://api.jeemzugames.com`, and `wss://play.jeemzugames.com`. Make `www.jeemzugames.com` redirect to the apex.
- [ ] Reserve staging addresses, for example `staging.jeemzugames.com`, `api.staging.jeemzugames.com`, and `play.staging.jeemzugames.com`.
- [ ] Confirm games accounts are independent registrations, not portfolio-account migration or single sign-on. Decide whether Putt Party remains guest-accessible and whether linking room players to accounts is needed at launch.
- [ ] Define the launch contract: supported games/leaderboard IDs, profile fields, leaderboard opt-in, account deletion, and editor administrator permissions. Preserve current per-mode scoring conventions.

**Exit:** agreed service inventory, budget, identity boundary, and launch scope.

## 2. Create the new frontend repository

- [x] Create and clone `Jeemzu/jeemzugames.com` at `C:\dev\jeemzugames.com`.
- [ ] Protect `main` and require pull requests and CI checks.
- [x] Extract the game catalog, shared Player, six games, editor, required components/themes, assets, sounds, levels, and platformer C++/WASM sources. Preserve applicable licenses and attribution.
- [x] Keep portfolio pages, Budgetize, GDD tools, unrelated admin tools, API clients, and their secrets out of the new application.
- [x] Make `/` the games catalog; preserve `/play/<gameId>` and `/play/impossible/editor`. Keep `/games`, legacy `/games/<id>`, and `/editor` aliases where needed.
- [x] Replace portfolio navigation, branding, metadata, generated route pages, icons, and account links with games-site equivalents. Do not copy metadata entries for excluded portfolio routes.
- [x] Remove automatic portfolio-auth initialization and portfolio API fallbacks from the extracted app.
- [ ] Add independent games account/profile screens and auth state.
- [ ] Move editor production-role verification and privileged publishing checks to games-owned authorization. Update the local MCP companion's target checkout and auth endpoint; keep its bridge loopback-only, not a hosted service.
- [x] Document local setup, required environment-variable names, and deployment commands. Include example configuration only; never copy existing secret-bearing environment files.

Migration increment: gameplay is guest-only by agreement. Account/online leaderboard controls and privileged editor publishing are unavailable until games-api integration; the app makes no portfolio API requests. Original games remain on the portfolio until phase 8. Putt Party still needs a separately running realtime server and an allowed frontend origin.

Migration validation (2026-10-29):
- Production build, lint, companion type-check, and 265 game/editor tests passed.
- Browser smoke checks covered startup/input for the five local games, Tetris scoring/pause/restart, editor save/play/return, legacy platformer routing, and narrow-screen catalog/Tetris layout.
- Putt Party's development lobby rendered and showed reconnecting without a server; a production build without its endpoint rejected startup instead of falling back to localhost.
- Live multiplayer, backend integration, Cloudflare deployment, and portfolio cutover remain unverified and pending. No new automated visual-regression harness was added for this extraction.

**Exit:** a games-only application that starts locally without calling the portfolio API.

## 3. Add games-owned accounts and leaderboards

These are implementation tasks in `games-api`; setting a new frontend URL alone will not decouple ownership.

- [ ] Inspect and reuse/adapt the existing account-management implementation for games-api. Keep independent games identities and configuration; do not replace the identity infrastructure or change portfolio account management.
- [ ] Define games-owned user IDs and authorization roles. Scope token issuer/audience, signing credentials, session storage, and cookie names to the games application.
- [ ] Reuse/adapt existing registration, login, refresh, logout, email verification, password reset, profile updates, and account deletion flows for games-owned accounts. Include rate limits and abuse protection.
- [ ] Add versioned database migrations for identities or identity mappings, refresh sessions, scores, and leaderboard preferences. Use a games database and credentials, not the portfolio connection string.
- [ ] Implement score submission, Top-N leaderboards, personal-best/all-time summaries, and preference endpoints. Reuse existing response shapes where appropriate, but generate frontend types from games-api's own contract.
- [ ] Derive score ownership from authenticated identity, never a submitted username/user ID. Validate game IDs, score bounds, leaderboard limits, and supported score ordering.
- [ ] Decide and document score trust: browser-submitted scores are not cheat-proof. Keep Putt Party results server-authoritative if persistent multiplayer scoring is included.
- [ ] Establish games administrators separately. Ensure account deletion revokes sessions and deletes or anonymizes owned scores according to the agreed policy.
- [ ] Configure exact HTTP CORS origins, credential handling, secure host-only refresh cookies, and CSRF protection as applicable. Never allow credentialed wildcard origins.
- [ ] Replace frontend account/score/profile clients and generated types with games-api equivalents. Audit shared Player, leaderboard, auth prompts, profile, and editor calls for remaining portfolio dependencies.

**Exit:** fresh games accounts and scores are owned entirely by games-api; no portfolio data is copied or modified.

## 4. Provision backend, database, and email

- [ ] Create or reuse a dedicated games hosting project. Keep its credentials and database separate from `jeemzu.me`; separate staging from production as well.
- [ ] Provision the games database, select backups/retention, and restrict network access. Create separate application and migration credentials where supported.
- [ ] Configure the accounts/leaderboard service build or Dockerfile, start command, required listening port, database connection, environment, and readiness/health endpoints.
- [ ] Configure the existing realtime service or its replacement with its actual repository build context, start command, port, health endpoint, and WebSocket support.
- [ ] Inspect realtime room storage. If rooms are process-local, start with one instance and no autoscaling; do not assume sticky sessions alone solve room discovery or deployment state loss.
- [ ] Define restart/deploy behavior: drain or announce interruptions, close sockets cleanly, and explain whether rooms survive. Client reconnect/resume cannot restore rooms lost with a server process.
- [ ] Create the email provider account, verify a games-domain sender, and configure SPF, DKIM, and DMARC using provider-supplied records. Point verification/reset links to the games frontend.
- [ ] Store database credentials, signing keys/provider secrets, email credentials, and deployment tokens in the appropriate service/GitHub secret stores. Keep production values out of staging and PR previews.
- [ ] Deploy staging first and record service URLs and supported configuration names. Do not guess backend environment-variable names from the frontend.

**Exit:** isolated staging services are available, with production resources ready for a gated release.

## 5. Set up frontend hosting, DNS, and TLS

- [ ] Set up a new Cloudflare frontend deployment for the new repository, reviewing Workers Static Assets first; do not repoint the existing portfolio site.
- [ ] Configure the repository's `npm run build` and `dist` static asset directory. Preserve the route-metadata generation step rather than using bare `vite build`.
- [ ] Set the agreed Node version, commit the lockfile, and use clean dependency installation in CI.
- [ ] Add production and staging custom domains to their hosting services. At the DNS provider, use the exact records supplied by each host for apex, `www`, API, and realtime; do not guess target IPs.
- [ ] Preserve unrelated DNS/email records. Complete domain verification and confirm certificate issuance/renewal for every HTTPS/WSS hostname.
- [ ] Adapt the frontend's Netlify-specific routing/header configuration for Cloudflare. Configure SPA deep-link handling without rewriting missing scripts, WASM, sounds, models, or level JSON to HTML. Preserve generated route HTML and proper asset MIME types, especially `application/wasm`.
- [ ] Configure conservative HTML caching and long-lived caching only for versioned assets; account for fixed-name WASM/level files when choosing invalidation/versioning.
- [ ] Set preview sites to `noindex`; use staging services for previews, not production credentials or data. Add only approved preview origins; use a fixed staging hostname if cookie/origin handling makes arbitrary previews unsuitable.

Proposed public build-time variables, subject to the implemented API routes:

| Context | Variable | Proposed value |
| --- | --- | --- |
| Production | `VITE_API_URL` | `https://api.jeemzugames.com/api` |
| Production | `VITE_GAMES_REALTIME_URL` | `wss://play.jeemzugames.com` |
| Staging | `VITE_API_URL` | `https://api.staging.jeemzugames.com/api` |
| Staging | `VITE_GAMES_REALTIME_URL` | `wss://play.staging.jeemzugames.com` |

- [ ] Match `VITE_API_URL` to the final API prefix; the current score/auth clients append paths beneath `/api`.
- [ ] Configure editor-specific production-auth settings against games-api if retained; remove the `https://api.jeemzu.me/api` fallback.
- [ ] Configure realtime `Realtime:AllowedOrigins` with exact approved frontend origins. The client appends `/v1/games/putt-party/ws`; do not include that suffix in `VITE_GAMES_REALTIME_URL`.
- [ ] Rebuild the frontend after changing `VITE_` values. They are public bundle contents, never a place for secrets.

**Exit:** production/staging names resolve to the right services with valid TLS and isolated configuration.

## 6. Create deployment pipelines

- [ ] Add frontend pull-request CI: clean install, focused lint/type/build checks, and the agreed game/editor tests. Avoid inheriting unrelated portfolio lint failures or unrelated checks.
- [ ] Define the platformer artifact policy. Initially, the current tracked WASM outputs can move with the game; before compiling in CI, pin Emscripten and provide a compatible runner/build script. `npm run build` does not rebuild C++.
- [ ] If rebuilding platformer in CI, publish its generated artifacts into the frontend build before deployment. Keep C++ source and delivered WASM matched.
- [ ] Configure frontend PR previews and staging deploys on Cloudflare. Choose one production deployment owner: Cloudflare Git integration with an explicit CI gate, or GitHub Actions deploying after successful checks. Avoid duplicate/ungated production deploys.
- [ ] Add games-api PR CI covering accounts, authorization boundaries, score validation, migrations, and the existing realtime/physics contract; build deployable artifacts.
- [ ] Configure backend auto-deploy only after CI passes, or use one protected deployment workflow. With Render's CI-gated mode, ensure checks actually run for deployment commits.
- [ ] Run database migrations once through a controlled release step before dependent code; use backward-compatible schema changes and stop deployment on migration failure.
- [ ] Gate production with a protected GitHub environment or an equivalent host-side approval. Restrict deploy credentials and avoid privileged execution of untrusted fork PR code.
- [ ] Release in order: compatible schema, backend/realtime, then frontend. Coordinate Putt Party protocol/physics changes; a domain-only move should not alter either.
- [ ] Record the deployed frontend/backend revisions and artifact versions. Add post-deploy health checks and a documented rollback to known-good artifacts; do not assume database migrations can be blindly reversed.

**Exit:** a reviewed change can reach staging and production reproducibly, without manual builds or secrets in source.

## 7. Launch validation and operations

Run these checks after implementation, with approval for test/regression runs. None have been run as part of writing this plan.

- [ ] Exercise every game and the editor on staging: direct URL load/refresh, required assets, audio, pause/restart, local saves, and platformer WASM. Include desktop and supported narrow-screen browsers.
- [ ] Verify registration, verification email, login, refresh after reload, logout, reset, score ownership, leaderboard opt-in, deletion, and administrator restrictions.
- [ ] Confirm a portfolio token is rejected by games-api and a games token is rejected by the portfolio API. Confirm logging out/deleting a games account does not affect a portfolio account.
- [ ] Complete a Putt Party match across two browsers/devices: create/join, course selection, shot sync, scoring, reconnect/resume within the documented five-minute window, and a controlled server restart.
- [ ] Confirm the production bundle uses the intended HTTPS/WSS endpoints, with no localhost or portfolio API requests. Verify rejected origins, cookies, and credentialed requests behave as intended.
- [ ] Add HTTP uptime alerts, an actual WebSocket handshake/connectivity check, error reporting, and database/storage/spending alerts. Never log passwords, tokens, or room resume credentials.
- [ ] Restore a games database backup into an isolated environment and document recovery ownership and steps. Publish privacy/account-deletion information and an operational contact.

**Exit:** approved launch checks pass, recovery works, and alerts reach the responsible operator.

## 8. Cut over games without disturbing jeemzu.me

- [ ] Deploy and approve the new production site before changing old routes. Keep a known-good portfolio deployment and the old realtime endpoint available through the rollback window.
- [ ] Add explicit host-level redirects on `jeemzu.me`: `/games` to the new catalog, each current `/play/<gameId>` to its new equivalent, the editor, and existing legacy game aliases. Preserve relevant query strings.
- [ ] Place game redirects before the portfolio SPA fallback; account for existing generated route HTML and host rule precedence. Do not redirect the entire portfolio domain or its account/API routes.
- [ ] Update portfolio navigation and game links to the new site. Leave Budgetize, other tools, accounts, API, database, and authentication configuration unchanged.
- [ ] Accept the new realtime origin before switching traffic. Keep the old origin temporarily only where needed for in-flight clients and rollback; remove it after the transition.
- [ ] Schedule the cutover around active Putt Party rooms. A domain change does not transfer browser storage, resume tokens, custom levels, local settings, or achievements; no automatic migration is planned.
- [ ] Update canonical/social URLs, search indexing/sitemap entries if used, and external game links. Apply permanent redirects once the destination and rollback plan are confirmed.
- [ ] Request and perform the agreed portfolio regression checks after implementation, focused on account access, Budgetize, and other retained resources.
- [ ] After the rollback window, remove unused game endpoints/clients from the portfolio only after checking consumers. Do not drop shared account tables or non-game resources.
- [ ] Retire only services proven unused, remove temporary origins/deploy credentials, and update both repositories' operational documentation.

**Done:** games run at `jeemzugames.com`, new games identities/scores belong to games-api, deployment is repeatable, and portfolio accounts/data remain intact.

## Evidence and remaining unknowns

- Current frontend: [application routes](../src/App.tsx), [game registry](../src/game-player/registry.ts), [build scripts](../package.json), and [Netlify configuration](../netlify.toml).
- Existing coupling: [scores and profiles](../src/utils/gameApi.ts), [game session ownership](../src/game-player/useGameSession.ts), [account requests](../src/utils/authApi.ts), and [editor production authentication](../src/utils/productionAuth.ts).
- Realtime contract: [network documentation](putt-party-network.md) and [WebSocket client](../src/games/puttparty/net/PuttClient.ts).
- `games-api` was not available at the checked local path; GitHub reads failed with `401 Bad credentials`. Its deployed services, database, current identity support, room persistence, and CI remain unverified. Phase 1 resolves these before provisioning.
- Provider references: [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/), [Render deployments and CI gating](https://render.com/docs/deploys), [Render WebSockets](https://render.com/docs/websocket), and [Render health checks](https://render.com/docs/health-checks).
