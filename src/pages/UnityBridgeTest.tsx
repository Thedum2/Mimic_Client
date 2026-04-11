import { useEffect, useMemo, useState } from 'react'

import { BridgeManager } from '@/bridge/BridgeManager'
import { BRIDGE_ROUTES } from '@/bridge/interface'
import { BRIDGE_REQUEST_TIMEOUT_MS } from '@/bridge/model'
import { useUnityStore } from '@/stores/unityStore'
import { UnityWebGLView } from '@/unity/UnityWebGLView'

type BridgeLogKind = 'REQ' | 'ACK' | 'NTY' | 'OTHER'

type MathSampleAck = {
  result: boolean
  sum?: number
  error?: string
}

function parseNumber(raw: string) {
  const value = Number(raw)
  if (!Number.isFinite(value)) {
    return { ok: false as const, value: 0 }
  }

  return { ok: true as const, value }
}

type ParsedLogEnvelope = {
  type?: 'REQ' | 'ACK' | 'NTY'
  route?: string
  from?: string
  to?: string
  ok?: boolean
  id?: string
  data?: unknown
  timestamp?: unknown
}

function parseLogEnvelope(detail: string): ParsedLogEnvelope | null {
  const trimmed = detail.trim()

  if (!trimmed) {
    return null
  }

  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object') {
      return parsed as ParsedLogEnvelope
    }
  } catch {
    // intentionally ignored
  }

  return null
}

function detectLogKind(title: string, detail: string): BridgeLogKind {
  const parsed = parseLogEnvelope(detail)
  if (parsed?.type === 'REQ' || parsed?.type === 'ACK' || parsed?.type === 'NTY') {
    return parsed.type
  }

  if (title.includes('REQ ')) return 'REQ'
  if (title.includes('ACK ')) return 'ACK'
  if (title.includes('NTY ')) return 'NTY'

  const inlineType = /"(?:type)"\s*:\s*"(REQ|ACK|NTY)"/.exec(detail)
  if (inlineType?.[1]) {
    return inlineType[1] as BridgeLogKind
  }

  return 'OTHER'
}

function extractLogRoute(log: { title: string; detail: string }) {
  const parsed = parseLogEnvelope(log.detail)
  if (parsed?.route) {
    return parsed.route
  }

  return log.title.replace(/^(REQ|ACK|NTY)\s+/, '')
}

function prettyLog(detail: string) {
  try {
    return JSON.stringify(JSON.parse(detail), null, 2)
  } catch {
    return detail
  }
}

function formatDirectionLabel(direction: string, detail: string) {
  const parsed = parseLogEnvelope(detail)
  if (parsed?.from && parsed?.to) {
    return `${parsed.from}->${parsed.to}`
  }

  return direction
}

function getDirectionStyle(direction: string) {
  if (direction === 'R2U') {
    return { label: 'R2U', className: 'bg-emerald-500/15 text-emerald-200 border-emerald-300/40' }
  }

  if (direction === 'U2R') {
    return { label: 'U2R', className: 'bg-sky-500/15 text-sky-200 border-sky-300/40' }
  }

  return { label: direction, className: 'bg-white/12 text-white/75 border-white/25' }
}

function getKindStyle(kind: BridgeLogKind) {
  if (kind === 'REQ') {
    return { label: 'REQ', className: 'bg-indigo-500/15 text-indigo-100 border-indigo-300/40' }
  }

  if (kind === 'ACK') {
    return { label: 'ACK', className: 'bg-emerald-500/15 text-emerald-100 border-emerald-300/40' }
  }

  if (kind === 'NTY') {
    return { label: 'NTY', className: 'bg-yellow-500/15 text-yellow-100 border-yellow-300/40' }
  }

  return { label: 'OTHER', className: 'bg-white/12 text-white/75 border-white/25' }
}

export default function UnityBridgeTest() {
  const bridgeManager = BridgeManager.getInstance()
  const unityStatus = useUnityStore((state) => state.status)
  const unityErrorMessage = useUnityStore((state) => state.errorMessage)

  const [timeoutMs, setTimeoutMs] = useState(BRIDGE_REQUEST_TIMEOUT_MS)
  const [logs, setLogs] = useState(bridgeManager.getLogs())
  const [statusMessage, setStatusMessage] = useState('Math sample test is ready')

  const [aText, setAText] = useState('3')
  const [bText, setBText] = useState('2')
  const [expectedText, setExpectedText] = useState('5')
  const [mathResultText, setMathResultText] = useState('5')
  const [mathStatus, setMathStatus] = useState('Math status is ready')

  const [logKinds, setLogKinds] = useState<Record<BridgeLogKind, boolean>>({
    REQ: true,
    ACK: true,
    NTY: true,
    OTHER: true,
  })
  const normalizedTimeout = useMemo(() => Number(timeoutMs) || BRIDGE_REQUEST_TIMEOUT_MS, [timeoutMs])
  const pageOpenAt = useMemo(() => Date.now(), [])
  const isBridgeTrafficLog = (direction: string) => direction === 'R2U' || direction === 'U2R'

  const mathRequestRoute = BRIDGE_ROUTES.MathManager_Add

  function refreshLogs(nextKinds = logKinds) {
    setLogs(
      bridgeManager
        .getLogs()
        .filter((log) => new Date(log.at).getTime() >= pageOpenAt)
        .filter((log) => isBridgeTrafficLog(log.direction))
        .filter((log) => nextKinds[detectLogKind(log.title, log.detail)]),
    )
  }

  useEffect(() => {
    refreshLogs()

    const unsubscribe = bridgeManager.subscribe(() => {
      refreshLogs()
    })

    return unsubscribe
  }, [bridgeManager, pageOpenAt])

  useEffect(() => {
    refreshLogs(logKinds)
  }, [logKinds, bridgeManager, pageOpenAt])

  function toggleLogKind(kind: BridgeLogKind) {
    setLogKinds((nextKinds) => ({
      ...nextKinds,
      [kind]: !nextKinds[kind],
    }))
  }

  function setMathPreset(aValue: string, bValue: string, expectedValue: string) {
    setAText(aValue)
    setBText(bValue)
    setExpectedText(expectedValue)
    setStatusMessage(`Preset loaded: ${aValue} + ${bValue} (expected ${expectedValue})`)
  }

  async function sendMathRequest() {
    const a = parseNumber(aText)
    const b = parseNumber(bText)
    const expected = parseNumber(expectedText)

    if (!a.ok || !b.ok) {
      setMathStatus('Input must be numeric.')
      return
    }

    setMathStatus('Sending Math REQ...')
    setMathResultText('')

    try {
      const ack = await bridgeManager.sendRequest(
        mathRequestRoute,
        {
          a: a.value,
          b: b.value,
        },
        normalizedTimeout,
      )

      const data = ack.data as MathSampleAck
      if (data.result === true && typeof data.sum === 'number') {
        setMathResultText(String(data.sum))
        if (expected.ok) {
          setMathStatus(
            data.sum === expected.value
              ? `PASS: expected ${expected.value}, result ${data.sum}`
              : `FAIL: expected ${expected.value}, got ${data.sum}`,
          )
        } else {
          setMathStatus(`ACK response: sum = ${data.sum}`)
        }
      } else {
        setMathStatus(`ACK failed: ${data.error ?? 'Unknown error'}`)
      }
    } catch (error) {
      setMathResultText('N/A')
      setMathStatus(`Exception: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <main className="relative h-full overflow-hidden bg-black p-2 text-white">
      <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col gap-2">
        <header className="shrink-0 rounded-[16px] bg-black/35 px-4 py-3 backdrop-blur-md">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-white/45">UNITY MATH SAMPLE TEST</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl font-black tracking-[-0.03em] text-white">Unity Math Sample Test</h1>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">Status: {unityStatus}</span>
          </div>
        </header>

        <section className="grid min-h-0 flex-1 grid-cols-[420px_minmax(0,1fr)] gap-2">
          <article className="rounded-[16px] bg-black/35 p-4 backdrop-blur-md">
            <h2 className="text-lg font-black">Math Test (3+2=5)</h2>
            <p className="mt-1 text-xs text-white/70">
              `MathManager_Add` request expects ACK `MathManager_Add` response
            </p>
            <div className="mt-3 grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1">
                  <span className="text-xs">A</span>
                  <input
                    type="number"
                    value={aText}
                    onChange={(event) => setAText(event.target.value)}
                    className="rounded-md border border-white/20 bg-black/50 px-3 py-2"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs">B</span>
                  <input
                    type="number"
                    value={bText}
                    onChange={(event) => setBText(event.target.value)}
                    className="rounded-md border border-white/20 bg-black/50 px-3 py-2"
                  />
                </label>
              </div>
              <label className="grid gap-1">
                <span className="text-xs">Expected Result</span>
                <input
                  type="number"
                  value={expectedText}
                  onChange={(event) => setExpectedText(event.target.value)}
                  className="rounded-md border border-white/20 bg-black/50 px-3 py-2"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs">Timeout (ms)</span>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  value={timeoutMs}
                  onChange={(event) => setTimeoutMs(Number(event.target.value))}
                  className="rounded-md border border-white/20 bg-black/50 px-3 py-2"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMathPreset('3', '2', '5')}
                  className="rounded-full border border-white/30 px-3 py-2 text-xs font-bold"
                >
                  Preset 3+2
                </button>
                <button
                  type="button"
                  onClick={() => setMathPreset('10', '5', '15')}
                  className="rounded-full border border-white/30 px-3 py-2 text-xs font-bold"
                >
                  Preset 10+5
                </button>
              </div>
              <button
                type="button"
                onClick={sendMathRequest}
                className="h-[38px] rounded-full bg-[#ffde59] font-black text-black"
              >
                MathManager_Add Send
              </button>
              <div className="rounded-lg border border-white/15 bg-white/8 p-2">
                <p className="text-[11px] text-white/55">Math Status</p>
                <p className="mt-1 text-sm font-black">{mathStatus}</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/8 p-2">
                <p className="text-[11px] text-white/55">Result</p>
                <p className="mt-1 text-sm font-black">{mathResultText}</p>
              </div>
              <p className="rounded-[10px] border border-white/10 bg-white/[0.05] p-2 text-xs text-white/85">{statusMessage}</p>
              {unityErrorMessage ? <p className="text-xs text-white/65">Unity Error: {unityErrorMessage}</p> : null}
            </div>
          </article>

          <section className="grid min-h-0 grid-rows-[1fr_190px] gap-2">
            <article className="rounded-[16px] bg-black/35 p-4 backdrop-blur-md">
              <h2 className="text-lg font-black">Bridge Logs</h2>
              <p className="mt-1 text-xs text-white/70">REQ / ACK / NTY logs by message type</p>
              <div className="mt-2 flex justify-between text-[10px] text-white/60">
                <span>{logs.length} logs</span>
                <span>REQ/ACK/NTY/OTHER shown</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.keys(logKinds) as BridgeLogKind[]).map((kind) => {
                  const style = getKindStyle(kind)
                  const enabled = logKinds[kind]
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => toggleLogKind(kind)}
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${
                        enabled ? style.className : 'bg-white/8 text-white/35 border-white/12'
                      }`}
                    >
                      {style.label}
                    </button>
                  )
                })}
              </div>
              <div className="mt-2 h-full min-h-0 overflow-auto rounded-md border border-white/10 bg-black/35 p-2">
                {logs.length === 0 ? (
                  <p className="text-xs text-white/50">No logs yet.</p>
                ) : (
                  logs.map((log) => (
                    (() => {
                      const kind = detectLogKind(log.title, log.detail)
                      const kindStyle = getKindStyle(kind)
                      const directionStyle = getDirectionStyle(log.direction)
                      const envelope = parseLogEnvelope(log.detail)
                      const routeName = extractLogRoute(log)
                      const fromTo = envelope?.from && envelope?.to ? `${envelope.from}->${envelope.to}` : null

                      return (
                        <div
                          key={log.id}
                          className="mb-2 rounded-md border border-white/12 bg-white/5 p-2 text-[11px]"
                        >
                          <div className="mb-2 flex flex-wrap gap-2">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${directionStyle.className}`}
                            >
                              {formatDirectionLabel(log.direction, log.detail)}
                            </span>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${kindStyle.className}`}
                            >
                              {kindStyle.label}
                            </span>
                            {fromTo ? (
                              <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] text-white/70">
                                {fromTo}
                              </span>
                            ) : null}
                            {envelope?.id ? (
                              <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] text-white/50">
                                {envelope.id}
                              </span>
                            ) : null}
                            <span className="text-[10px] text-white/45">
                              {new Date(log.at).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="mb-1 break-words text-[11px] text-white/90">{routeName}</p>
                          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md border border-white/10 bg-black/45 p-2 text-[11px] text-white/75">
                            {prettyLog(log.detail)}
                          </pre>
                        </div>
                      )
                    })()
                  ))
                )}
              </div>
            </article>

            <div className="rounded-[16px] bg-black/35 p-2 backdrop-blur-md">
              <h2 className="px-2 pb-2 text-sm font-black">Unity View</h2>
              <div className="h-[190px] w-full overflow-hidden rounded-md">
                <UnityWebGLView className="h-full w-full" />
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  )
}

