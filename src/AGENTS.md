# SRC KNOWLEDGE BASE

## OVERVIEW
`src/` contains the React app shell plus the Unity-facing runtime graph.

## STRUCTURE
```text
src/
+-- app/       # top-level React shell
+-- bridge/    # transport, envelope, route parsing, manager
+-- session/   # session/runtime coordination layer
+-- runtime/   # runtime composition/bootstrap
+-- services/  # cross-cutting runtime helpers
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| React mount | `main.tsx` | root entry |
| App shell | `app/App.tsx` | RouterProvider + bootstrap lifecycle |
| Runtime composition | `runtime/bootstrap.ts` | bridge + session adapter + state hookup |
| Wire envelope | `bridge/model.ts` | message shapes |
| Bridge routing | `bridge/route.ts`, `bridge/BridgeManager.ts` | route split + dispatch |
| Session layer | `session/` | runtime coordination placeholder |

## CONVENTIONS
- Domain-first folders beat generic UI buckets here.
- Bridge and session layer should stay decoupled by explicit interfaces.
- Runtime bootstrap should remain a thin composition layer.

## ANTI-PATTERNS
- Do not leak UI concerns into `bridge/` or `session/`.
- Do not duplicate protocol constants in multiple folders.
- Do not hide runtime side effects in random React components; bootstrap them centrally.

## NOTES
- If implementation grows, the next likely AGENTS split points are `bridge/` and `session/`.

## CODE SAFETY CHECKS
- Keep string literals in source files valid UTF-8 with correct closing quotes.
- For bridge logs, verify `type`, `route`, `from`, `to`, and `direction` stay aligned with envelope data.
- Do a quick parser sanity check after editing JSX string state lines (e.g., `useState('...')`) to prevent Vite transform parse errors.
