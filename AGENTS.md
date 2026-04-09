# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-08 Asia/Seoul

## OVERVIEW
Vite + React + TypeScript app intended to mimic Unity RGF wiring. Current focus: bridge protocol, runtime graph, and protocol docs.

## STRUCTURE
```text
.
├── ../docs/       # repo-level protocol and architecture-facing docs
├── src/           # app/runtime code
├── public/        # static assets
├── package.json   # dev/build/test entrypoints
├── tsconfig.json  # TS + path alias rules
└── vite.config.ts # Vite + Vitest config
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Bridge wire schema | `../docs/protocol.md` | Source of truth for RGF↔React payloads |
| App bootstrap | `src/main.tsx`, `src/app/App.tsx` | React mount + runtime start/stop |
| Runtime startup | `src/runtime/bootstrap.ts` | Bridge/RGF/store orchestration |
| Bridge core | `src/bridge/` | envelope, routing, transport, manager |
| RGF state engine | `src/rgf/` | phase/state/plugin graph |
| Build/test commands | `package.json` | `dev`, `build`, `test` |

## CONVENTIONS
- ESM project.
- Path alias: `@/* -> src/*`.
- Build gate: `tsc --noEmit && vite build`.
- Tests: Vitest + jsdom.
- Protocol docs live under the repo-level `../docs/`, not scattered comments.

## ANTI-PATTERNS (THIS PROJECT)
- Do not invent a second bridge schema when `../docs/protocol.md` already defines one.
- Do not change wire payload casing casually; Unity contract is case-sensitive in practice.
- Do not use ISO timestamps for wire messages.
- Do not introduce app-level routing names that collide with bridge route names.
- Do not leave config pointing at missing files.

## UNIQUE STYLES
- Structure is domain-first, not generic React component-first.
- Unity concepts are mapped explicitly: BridgeManager, handler, RGF manager, phase/state engine.

## COMMANDS
```bash
npm run dev
npm run build
npm run test
```

## NOTES
- Existing scans show protocol docs are stronger than the current scaffold; keep implementation aligned to docs.
- `src/bridge/` and `src/rgf/` are the main architectural centers.
