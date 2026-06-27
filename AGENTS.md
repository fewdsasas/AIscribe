# AIscribe — Agent Guide

AI novel-writing platform. Electron + React + SQLite (sql.js WASM) + TipTap editor.

## Commands

```bash
npm run dev             # electron-vite dev server (hot reload)
npm run build           # electron-vite production build
npm run test            # vitest watch mode
npm run test:run        # vitest single run
npm run test:coverage   # coverage (main + shared only — renderer excluded)
npm run typecheck       # tsc --noEmit
npm run package         # electron-builder (see electron-builder.yml)
# Single test file:
npx vitest run tests/path/to/file.test.ts
```

No linter or formatter configured.

## Architecture

Three Electron processes, each with its own vite entry:

- **main** (`src/main/`) — Node.js. DB (sql.js WASM), LLM calls, file I/O, skill execution. CSP set in `createWindow()`.
- **preload** (`src/preload/`) — Thin bridge exposing `window.aiscribe` API via `contextBridge`. No business logic.
- **renderer** (`src/renderer/`) — React SPA, Zustand store, TipTap editor, Tailwind CSS.

All cross-process communication goes through IPC.

### Key directories

| Path | Purpose |
|---|---|
| `src/main/ipc/` | One handler file per domain, registered via `registerIpcHandlers(ipcMain)` |
| `src/main/engine/` | LLM provider abstraction + skill loader |
| `src/main/learning/` | Trajectory recording, pattern detection, writer model, skill evolution |
| `src/main/memory/` | sql.js database with versioned migrations |
| `skills/` | Markdown-based skill definitions loaded at runtime by SkillLoader |
| `src/shared/types/` | All TS interfaces |
| `src/renderer/store/` | Zustand slices: chatSlice, learningSlice |

### Path aliases

Must stay in sync across `tsconfig.json`, `electron.vite.config.ts`, and `vitest.config.ts`:

- `@shared/*` → `src/shared/*` (all processes)
- `@main/*` → `src/main/*` (main + preload only)
- `@renderer/*` → `src/renderer/*` (renderer only)

## Data model domain hierarchy

```
Project → Novel → Chapter
  ├── Character (traits, arcs, relationships)
  ├── World (geography, history, society, power systems)
  ├── PlotStructure (narrative framework + beats)
  ├── Outline (sections with phases)
  └── Checkpoint (snapshots for versioning)
```

All entities use UUID string IDs. Core types in `src/shared/types/index.ts`.

## IPC conventions

- Main handlers in `src/main/ipc/<domain>.ipc.ts`, preload maps `ipcRenderer.invoke('channel-name', args)` → `window.aiscribe.*`
- **No `IPC_CHANNELS` constant** — channels defined inline in preload and handler files
- **Critical**: All handlers must use `wrap()` (auto-strips Electron event). Only `llm:chat-stream` (needs `event.sender`) uses `wrapEvent()`. Never write `wrap(async (event, data) => ...)` — this captures the event object as data. The first handler argument after `wrap()` is always the user data.

## Database

sql.js WASM (not native SQLite). File saved to Electron `userData` dir. Schema + versioned migration system in `src/main/memory/database.ts`.

- Bump `SCHEMA_VERSION` and add a function to `MIGRATIONS` array when adding tables/columns
- Write operations debounced at 300ms
- Test DB files go in `tests/temp/`, auto-cleaned in `afterAll`

## Skills

Markdown-based skill system. Each skill is a directory under `skills/` containing `SKILL.md` with YAML frontmatter (`name`, `description`, `category`). Loaded at runtime by `src/main/engine/skill-loader.ts`. To add a new one: create `skills/<name>/SKILL.md`.

## LLM Integration

Supports: openai, claude, mimo, wenxin, tongyi, custom. Provider config stored encrypted on disk (`src/main/secure-config.ts`, AES-256-GCM with machine-derived key). API keys loaded at startup via `LLMProvider.initFromStorage()`. Streaming uses SSE via `fetch` with `ReadableStream`.

## TypeScript

Strict mode. `noUnusedLocals` and `noUnusedParameters` enforced. Target ES2022. Module resolution: `bundler`.

## Testing

- Vitest with `jsdom` environment. Tests mirror `src/` under `tests/`.
- `testId()` in `tests/setup.ts` generates unique IDs for DB and temp files
- `afterAll` must be defensive: guard against `beforeAll` failures with `try/catch`
- Use `afterEach` (not manual cleanup) for global state restoration like `vi.unstubAllGlobals()`

## Novel structure (TipTap extension)

The `sceneBlock` node in `NovelStructure.ts` creates empty paragraphs via `{ type: 'paragraph' }` (no text content array) to avoid ProseMirror's "Empty text nodes are not allowed" error.

## Build

- `electron-vite` handles the three-process build
- `electron-builder` packages the app (see `electron-builder.yml`)
- Skills bundled via `files` config in `electron-builder.yml`
- Output: `dist/` (packaged app), `out/` (vite build output)
- sql.js WASM must be unpacked from asar (`asarUnpack` config)

## Code Quality

- ESLint + Prettier configured. Run `npm run lint` and `npm run format` before committing
- TypeScript strict mode enabled. Run `npm run typecheck` to verify
- All core code must pass `tsc --noEmit`

## Architecture Changes

### Repository Pattern (2026-06-25)
- `Database` class refactored to use Repository pattern under `src/main/memory/repositories/`
- Common CRUD extracted to `BaseRepository`, row mapping to `row-mapper.ts`
- `Database` now acts as a facade delegating to specialized repositories

### LLM Provider Strategy (2026-06-25)
- OpenAI-like strategies share `buildOpenAILikeRequestBody`, `extractOpenAILikeContent`, `extractOpenAILikeUsage` helpers
- Reduces code duplication across `openai`, `mimo`, `wenxin`, `tongyi` strategies