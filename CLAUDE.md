# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Start dev server (electron-vite, hot reload)
npm run build          # Production build (electron-vite)
npm run test           # Vitest watch mode
npm run test:run       # Vitest single run
npx vitest run tests/path/to/file.test.ts  # Single test file
npm run test:coverage  # Coverage (main + shared only)
npm run typecheck      # tsc --noEmit
npm run package        # electron-builder packaging
```

There is no linter or formatter configured.

## Architecture

Electron app with three processes, each with its own vite entry:

- **main** (`src/main/`) — Node.js process. Database (sql.js WASM), LLM calls (OpenAI/Claude/MiMo/Wenxin/Tongyi), file I/O, skill execution.
- **preload** (`src/preload/`) — Thin bridge exposing `window.aiscribe` API via `contextBridge`. No business logic.
- **renderer** (`src/renderer/`) — React SPA with Zustand store, TipTap editor, Tailwind CSS, Chinese web-novel themed design.

### Key directores

| Path | Purpose |
|---|---|
| `src/main/ipc/` | One handler file per domain (character, chat, db, export, learning, novel, project, skill, world, writer) |
| `src/main/engine/` | LLM provider abstraction + skill loader |
| `src/main/learning/` | Trajectory recording, pattern detection, writer model, skill evolution |
| `src/main/memory/` | sql.js database with versioned migrations |
| `skills/` | Markdown-based skill definitions loaded at runtime by SkillLoader |
| `src/renderer/components/` | Editor (TipTap), AI chat, character form, project management, studio tools |
| `src/renderer/store/` | Zustand slices: chatSlice, learningSlice |
| `src/shared/types/` | All TypeScript interfaces (Project, Novel, Chapter, Character, World, etc.) |

### Path aliases

Keep these in sync across `tsconfig.json`, `electron.vite.config.ts`, and `vitest.config.ts`:

- `@shared/*` → `src/shared/*`
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

All entities use UUID string IDs.

## Database conventions

sql.js WASM, not native SQLite. File saved to Electron `userData` dir.

- Schema version + migration system in `src/main/memory/database.ts`
- Bump `SCHEMA_VERSION` and add a function to `MIGRATIONS` array when adding tables/columns
- Write operations debounced at 300ms
- Test DB files go in `tests/temp/` and auto-cleanup in `afterAll`

## IPC conventions

- Preload maps `ipcRenderer.invoke('channel-name', args)` → `window.aiscribe.*`
- Main handlers in `src/main/ipc/<domain>.ipc.ts`, registered via `registerIpcHandlers(ipcMain)`
- No IPC_CHANNELS constant — channels are defined inline in preload and handler files
- **Critical**: All IPC handlers must use `wrap()` (auto-strips Electron event). The one handler needing the event object (`llm:chat-stream`) uses `wrapEvent()`. Never write `wrap(async (event, data) => ...)` — this captures the event object as data. The first handler argument after `wrap()` is always the user data.

## Novel structure (TipTap extension)

The `sceneBlock` node in `NovelStructure.ts` creates empty paragraphs via `{ type: 'paragraph' }` (no text content array) to avoid ProseMirror's "Empty text nodes are not allowed" error.

## Testing

- Vitest with `jsdom` environment
- Tests mirror `src/` structure under `tests/`
- Coverage scoped to `src/main/` and `src/shared/` only
- `testId()` helper in `tests/setup.ts` generates unique IDs for DB and temp files
- `afterAll` must be defensive: guard against `beforeAll` failures with `try/catch`
- Use `afterEach` (not manual cleanup calls) for global state restoration like `vi.unstubAllGlobals()`
