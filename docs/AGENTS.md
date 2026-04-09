# DOCS KNOWLEDGE BASE

## OVERVIEW
`docs/` holds normative docs used by implementation work.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| RGF wire contract | `../../docs/protocol.md` | Canonical payloads, routes, timing, mismatch list |

## CONVENTIONS
- Prefer one authoritative doc per protocol/domain.
- Capture actual implementation mismatches explicitly.
- Use concrete JSON examples over prose-only descriptions.

## ANTI-PATTERNS
- Do not document speculative payloads.
- Do not copy stale sample JSON without reconciling with real Unity code.
- Do not split one protocol across many tiny markdown files unless scale forces it.

## NOTES
- `../../docs/protocol.md` is intended to drive future bridge refactors.
