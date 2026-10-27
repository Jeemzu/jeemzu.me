# Level Editor MCP

## Implemented scope

The local companion exposes authoring in the open Level Editor, without mouse
automation, a cloud service, or direct access to browser-profile files.

```text
MCP client --stdio--> TypeScript companion
                          |
                 paired loopback WebSocket
                          |
                    browser editor
                          |
             shared LevelDocument commands
```

Implemented in the first authoring increment:

- Centralized level rules, runtime validation, and corrected schema documentation.
- Shared UI/agent commands, revisions, atomic edits, safe resize, and undo/redo.
- Explicit browser pairing, session discovery, and bounded requests.
- MCP tools/resources for inspection, construction, rendering, import, and local save.

Next, in order:

1. Make WASM preview lifecycle reliable: empty-level loading, platformer dimensions,
   teardown, and restart. Then expose revision-bound preview state and controls.
2. Add opening saved drafts and explicit saved-level updates, if needed.
3. Add guided prompts and richer diagnostics. Deterministic playability analysis
   requires actual simulation support; structural validation is not a proof.

Existing manual Play remains available. This increment does not expose game
input or modify physics. Shipping a level writes repository files only; see
[Shipping a level](#shipping-a-level).

## Local setup

Requirements: Node.js 20.19+ or 22.12+ and the repository's installed dependencies.
The API is not required for ordinary local authoring; signing in is needed for
the existing Admin-only controls.

1. Run `npm install`, then `npm run dev` from the repository root.
2. Configure your MCP client to launch the companion over **stdio**. For VS Code,
   merge this entry into its MCP configuration; do not replace other servers:

   ```json
   {
     "servers": {
       "impossible-level-editor": {
         "type": "stdio",
         "command": "node",
         "args": [
           "C:\\dev\\jeemzu.me\\node_modules\\tsx\\dist\\cli.mjs",
           "C:\\dev\\jeemzu.me\\mcp\\editor\\server.ts"
         ]
       }
     }
   }
   ```

   Adjust both absolute paths for your checkout. Other clients may use
   `mcpServers` rather than `servers`; use that client's configuration format.
   `npm run mcp:editor` also launches the process for development, but use the
   direct Node invocation in stdio client configurations to avoid npm banners
   on the protocol stream.

3. Have the agent call `editor_connection_info` and display its port and pairing
   code. Open `http://localhost:5173/play/impossible/editor`, choose **Agent**, enter both values,
   and choose **Connect**.
4. Call `editor_list_sessions` and inspect the target session before editing.
   The connection dialog displays the tab's session ID.
5. Use **Agent > Disconnect** to revoke access. Closing the tab also disconnects.
   Pairing codes are kept only in memory and change when the companion restarts.

The default bridge binds **127.0.0.1:43187** and accepts exactly
`http://localhost:5173` and `http://127.0.0.1:5173` as browser origins.
For another local frontend port, set these in the MCP server's `env`:

```json
{
  "EDITOR_BRIDGE_PORT": "43188",
  "EDITOR_ORIGIN": "http://localhost:5174"
}
```

`EDITOR_ORIGIN` replaces the default allowlist and must be an exact HTTP loopback
origin, with no path or credentials. A second companion needs a distinct port.
The Agent control is not displayed on the public site's non-loopback host.

## Level contract

[LevelSchema.ts](../src/lib/LevelSchema.ts) is the TypeScript source of truth.
Dimensions must also match [main.cpp](../cpp/platformer/main.cpp).

| Property | Rule |
| --- | --- |
| Document | `version: 1`, integer `number`, string `name`, `cols`, `cells` |
| Number | Nonnegative in files; zero identifies a custom level |
| Grid | 32 px tiles; 960 x 720 viewport; zero-based rows and columns |
| Width | 30-400 columns; new drafts use 100 |
| Platform | Rows 1-19 |
| Spike | Rows 1-20 |
| Pit / finish | Row 20 |
| Occupancy | One explicit type per coordinate; columns must be inside width |
| Finish | At most one; placing another moves it |
| Ground | Implicit; erasing a cell restores ground rather than creating a pit |

Imports are validated before replacement; malformed input leaves the draft
unchanged. Imports preserve file metadata, including its number, as the existing
UI import does. Direct number editing and JSON export retain the Admin role
requirement; importing metadata does not publish an official level.

Platform/spike vertical coordinates and contiguous span merging are unchanged.
The runtime interprets columns as spawn-scroll thresholds rather than a
conventional world map. `cols` is not a runtime ending; missing finish tiles use
the existing game fallback and generate a validation warning.

The editor rejects a width reduction that would exclude cells unless cropping
is explicit. UI cropping asks for confirmation; agent cropping requires both
`crop: true` and browser approval. Clear retains the name, number, and width.

## MCP contract

The companion pins the official TypeScript SDK and uses its negotiated protocol
support. Its browser bridge is private application messaging, **not** a new MCP
transport. Diagnostics go to stderr; stdout is reserved for MCP.

### Tools

| Tool | Purpose |
| --- | --- |
| `editor_connection_info` | Port, allowed browser origins, and pairing code |
| `editor_list_sessions` | Paired tab IDs and pairing timestamps |
| `editor_get_rules` | Coordinate rules and JSON schema |
| `editor_command` | Typed commands below; returns structured data or an explicit tool error |
| `editor_publish_shipped_level` | Add the current level to `public/levels`; see [Shipping a level](#shipping-a-level) |

Every `editor_command` takes `sessionId`, a UUID `requestId`, and `command`.
Use a new request ID for every new operation, including fresh reads. Mutation
commands require the `expectedRevision` returned by `get_level`.

| Command `action` | Additional input | Result / behavior |
| --- | --- | --- |
| `get_level` | None | Document, revision, undo/redo state, capabilities, warnings |
| `get_saved_levels` | None | Saved IDs, names, widths, and timestamps, without cell payloads |
| `validate` | None | Structural status, warnings, `playability: "not_checked"` |
| `get_view` | None | Current horizontal column |
| `set_view` | `scrollCol` | Clamped horizontal column; document revision unchanged |
| `render` | Optional `scrollCol` | PNG of a 30-column viewport plus document revision; does not move the user's view |
| `edit` | `expectedRevision`, `operations` | Atomic edit result |
| `import` | `expectedRevision`, `level` | Validated replacement; browser approval |
| `undo` / `redo` | `expectedRevision` | Restore shared history as a new revision |
| `save` | `expectedRevision` | Append browser-local copy; return its ID and summary |
| `export` | `expectedRevision` | Admin-only JSON document and suggested filename; no filesystem write |
| `delete_saved` | Saved `id` | Delete after browser approval |
| `check_production_admin` | None | Production sign-in dialog; returns `isAdmin`, `username`, `verifiedUntil` |

The single typed command tool deliberately avoids maintaining duplicate schemas
for separate UI buttons. Its discriminated input describes all actions to the
model. Resource reads also have corresponding command actions for clients that
do not automatically supply resources.

Supported `edit.operations`:

- `set_cells`: explicit `{row, col, type}` cells; replaces existing cells.
- `erase_cells`: explicit `{row, col}` positions.
- `fill_region`: inclusive `fromRow`, `toRow`, `fromCol`, `toCol`, `type`.
  Finish is excluded; use `set_finish`.
- `erase_region`: the same inclusive bounds.
- `set_finish`: target `col`.
- `set_metadata`: optional `name` and/or `number`; direct number changes require Admin.
- `resize`: `cols` and optional `crop` (false by default).
- `clear_cells`: remove all explicit cells, with browser approval.

Each batch is one undo step and returns `revision`, `changedCells`, changed
`bounds` (null for metadata-only/no-op changes), and warnings. A mouse paint
stroke is also one undo step. History retains at most 100 steps. No-op edits do
not increment revisions. Invalid batches leave both document and history intact.
The draft/history stay in tab memory; use Save for persistence.

### Resources

- `impossible://rules`
- `impossible://sessions`
- `impossible://sessions/{sessionId}/level`
- `impossible://sessions/{sessionId}/saved-levels`
- `impossible://sessions/{sessionId}/validation`
- `impossible://shipped-levels`: the repository's `public/levels/manifest.json`

Resources are read on demand; subscriptions and guided prompts are not included
in this increment.

### Shipping a level

Flow for the agent:

1. Ask the user to confirm the level is finished, then `save` it.
2. Call `check_production_admin`. The editor asks the user to sign in against the
   production API (`VITE_PRODUCTION_API_URL`, default `https://api.jeemzu.me/api`).
   Stop if the user cancels or `isAdmin` is false.
3. Call `editor_publish_shipped_level` with the current `expectedRevision`. The
   editor asks the user to approve adding the level as the next number.
4. The companion writes `public/levels/<n>.json` and appends `manifest.json`.
   It does not commit or deploy; the level ships with the next Netlify deploy.

Notes:

- Production sign-in uses `credentials: "omit"` and keeps only the username,
  role, and token expiry in tab memory for that pairing. The token and password
  are discarded. Verification expires with the production access token.
- Production CORS must allow the editor origin; `http://localhost:5173` is allowed.
- Each sign-in creates a production refresh-token record that this flow cannot
  revoke; it expires normally.
- The admin check gates the agent flow. Anyone with write access to the repo can
  still edit `public/levels` directly; repository and deploy access remain the
  real publishing boundary.
- `EDITOR_LEVELS_DIR` overrides the target directory (used by tests).
- Publishing fails without writing if the next number changed, the file exists,
  the level is unnamed or empty, or the user declines. A failed manifest write
  removes the new level file.

## Reliability and permissions

- The user explicitly pairs a tab; the companion cannot access browser
  `localStorage` independently.
- Exact origin and Host checks, a random pairing token, a five-second pairing
  deadline, eight-connection limit, and 2 MiB message limit bound the bridge.
- Requests have a 30-second deadline, or five minutes for commands that may wait
  on the user (edit, import, delete, production sign-in, publish). Expired requests
  are rejected before execution, and approval dialogs recheck the deadline.
- The tab caches up to 1,000 request outcomes for that connection. Reusing an ID
  with different arguments fails. At the limit, disconnect and pair a new session;
  do not replay old operations.
- A timeout/disconnect means the outcome may be unconfirmed. For a timeout on a
  still-connected session, retry only the identical request ID and arguments.
  Never automatically replay mutations after a new pairing.
- Human edits increment the same revision and stale agent edits fail. Agent
  document changes are rejected while a human paint stroke is active.
- Import, clear, crop, saved-level deletion, and shipping require browser approval.
  Successful agent mutations and errors produce existing-style notifications.
- Saved levels remain scoped to the browser profile and origin. Save appends a
  new UUID-identified copy; legacy timestamp IDs remain readable. Corrupt storage
  and quota failures are reported, not silently replaced with empty storage.
- No shell execution, arbitrary JavaScript, cloud tokens, or progress unlock
  changes are exposed. The only filesystem write is appending to `public/levels`.

## Focused validation

- `npx tsc -p tsconfig.app.json --noEmit`
- `npm run mcp:typecheck`
- `npm run test:editor` after approval to run tests

The focused suite covers schemas, loader coordinates, atomic edits, history,
storage failures, request deduplication, permissions, pairing boundaries,
production-admin gating, shipped-level file writes, and an actual stdio MCP
discovery/paired-edit/save/publish round-trip.
