# jeemzu.me

[jeemzu.me](https://jeemzu.me) is a personal portfolio and project hub for James Friedenberg. It brings together developer information, browser games, interactive programming projects, and Budgetize, a personal budgeting tool with an AI assistant. The site also includes accounts, game leaderboards, and administration features backed by a separate API repository.

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

## Technical Stack

### Frontend

- React 19, TypeScript 5.8, and Vite 6, with Wouter for routing.
- Material UI 7 for the component system and Zustand 5 for client state.
- Phaser 3 for JavaScript games; C++20 games and the algorithm visualizer compile to WebAssembly with Emscripten.
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
