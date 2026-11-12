<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

> Full project documentation lives in [`docs/`](./docs/README.md) (one file per topic: architecture, api, database, design, …). Keep it in sync with every behaviour/structure/API/env change.

## Technology Stack
- Next.js
- React
- TypeScript
- Tailwind CSS

## APIs
- Mapbox
- Liteapi
- OSRM
- Overpass
- SNCF
- Travel payouts
- Open railway routing


## File Structure

````
src/
├── adapters/          # For mapping external API payloads to internal data types
├── app/               # Routing Layer
│   └── api/           # Next.js Route Handlers
├── components/        # UI Presentation Layer
├── config/            # API configurations
├── hooks/             # Custom React Hooks
├── lib/               # 3rd-party clients
├── services/          # Data Fetching Layer
├── styles/            # Styling
├── types/             # TypeScript definitions
└── utils/             # Logic Layer
    ├── algorithms/    # Pure math and logic functions
    └── constants/     # Static datasets
````