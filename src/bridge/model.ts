export type MessageType = 'REQ' | 'ACK' | 'NTY'
export type MessageDirection = 'R2U' | 'U2R'
export type MessageEndpoint = 'R' | 'U'

export const BRIDGE_REQUEST_TIMEOUT_MS = 5_000

export interface BridgeMessage<TData = unknown> {
  id: string
  type: MessageType
  direction?: MessageDirection
  route: string
  data: TData
  ok: boolean
  timestamp: number
  from: MessageEndpoint
  to: MessageEndpoint
}

export interface PlayerRecord {
  playerIdx: number
  playerName: string
}

export interface PhaseDurationConfig {
  ready: number
  setup: number
  present: number
  input: number
  wait: number
  execute: number
  reveal: number
  cleanup: number
}

export interface InitializeRequest {
  sessionId: string
  playerInfo: PlayerRecord[]
}

export interface RegisterPluginRequest {
  miniGameIdx: string
  miniGameName: string
}

export interface StartRoundRequest {
  roundNumber: number
  miniGamePluginIdx: string
  phaseDuration: PhaseDurationConfig
  gameData?: Record<string, unknown>
}

export interface AbortRoundRequest {
  roundNumber: number
}

export interface ChatInputNotify {
  playerId: string
  message: string
}

export interface RoundResult {
  alivePlayers: string[]
  eliminatedPlayers: string[]
}

export interface RuntimeLogEntry {
  id: string
  direction: 'system' | MessageDirection
  title: string
  detail: string
  at: string
}
