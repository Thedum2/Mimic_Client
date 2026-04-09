# BRIDGE KNOWLEDGE BASE

## OVERVIEW
`src/bridge/` owns wire-level concerns: message envelope, route parsing, transport contract, and bridge manager behavior.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Wire model | `model.ts` | message and payload primitives |
| Route parsing | `route.ts` | `route_action` split/join |
| Transport contract | `transport.ts` | send/subscribe abstraction |
| Local transport | `LocalLoopbackTransport.ts` | dev/runtime shim |
| Base handler | `BaseMessageHandler.ts` | sender binding + helper methods |
| Bridge hub | `BridgeManager.ts` | pending requests, handler registry, dispatch |

## CONVENTIONS
- Bridge layer should stay JSON-envelope-centric.
- Handler registration is route-root based.
- One place should own ID/timestamp generation.

## ANTI-PATTERNS
- Do not add React component logic here.
- Do not change timeout/id/timestamp format without updating `../../../docs/protocol.md`.
- Do not bypass route parsing with ad-hoc string slicing in many files.

## NOTES
- This folder should eventually match Unity semantics more closely than generic frontend event buses.
