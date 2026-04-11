import { useSyncExternalStore } from 'react'

import { BaseMessageHandler } from '@/bridge/BaseMessageHandler'
import type { BridgeManager } from '@/bridge/BridgeManager'
import type { BridgeMessage } from '@/bridge/model'
import { BRIDGE_ROUTES } from '@/bridge/interface'
import type {
  BridgeError,
  ChatMessage,
  LobbyChatMessageReceivedNotify,
  LobbyChatSubmitMessageAck,
  LobbyChatSubmitMessageRequest,
  LobbyChatSystemMessageNotify,
  MatchManagerCreateRoomAck,
  MatchManagerCreateRoomRequest,
  MatchManagerJoinRoomAck,
  MatchManagerJoinRoomRequest,
  MatchManagerParticipantPresenceChangedNotify,
  MatchManagerRuntimeReadyNotify,
  PlayerBase,
} from '@/bridge/interface'
import { parseRoute } from '@/bridge/route'

type Listener = () => void
type LobbyEntryMode = 'create' | 'join'
type CreateRoomStatus = 'idle' | 'requesting' | 'ready' | 'error'
type ChatKind = 'user' | 'system'

export interface LobbyChatMessageRecord {
  id: string
  author: string
  authorPlayerId?: string
  text: string
  createdAt: string
  kind: ChatKind
  clientMessageId?: string
}

interface SessionSnapshot {
  playerId: string
  playerName: string
  activeRoomId: string | null
  activeInviteCode: string | null
  lobbyEntryMode: LobbyEntryMode | null
  createRoomStatus: CreateRoomStatus
  createRoomError: string | null
  createRoomRequested: boolean
  runtimeReadyNotified: boolean
  runtimeReadyAt: number
  entryStagedAt: number
  maxPlayerCount: number
  participants: PlayerBase[]
  chatMessages: LobbyChatMessageRecord[]
}

interface StageCreateRoomInput {
  inviteCode: string
  playerName: string
}

interface StageJoinRoomInput {
  inviteCode: string
  playerName: string
}

interface LobbyChatSubmitAckData {
  result?: boolean
  roomId?: string
  clientMessageId?: string
  message?: ChatMessage
  error?: BridgeError
}

function createPlayerId() {
  return `player_${Math.random().toString(36).slice(2, 10)}`
}

function createInitialSnapshot(): SessionSnapshot {
  return {
    playerId: createPlayerId(),
    playerName: '',
    activeRoomId: null,
    activeInviteCode: null,
    lobbyEntryMode: null,
    createRoomStatus: 'idle',
    createRoomError: null,
    createRoomRequested: false,
    runtimeReadyNotified: false,
    runtimeReadyAt: 0,
    entryStagedAt: 0,
    maxPlayerCount: 10,
    participants: [],
    chatMessages: [],
  }
}

function parseTimestamp(timestamp: string | number | undefined): string {
  if (timestamp == null) {
    return fallbackTime()
  }

  const numeric = Number(timestamp)
  const asIso = Number.isFinite(numeric) && `${numeric}`.length >= 12
    ? new Date(numeric).toISOString()
    : String(timestamp)

  return new Date(asIso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function fallbackTime(): string {
  return parseTimestamp(new Date().toISOString())
}

function toUserFacingBridgeError(error: BridgeError | undefined, fallback: string) {
  if (!error?.code) {
    return error?.message ?? fallback
  }

  switch (error.code) {
    case 'ROOM_NOT_FOUND':
      return 'Room not found. Please check invite code and try again.'
    case 'ROOM_FULL':
      return 'Room is full. Please try another room.'
    case 'RUNTIME_NOT_READY':
      return 'Runtime is not ready yet. Please try again shortly.'
    case 'INVALID_ARGUMENT':
      return error.message || 'Request payload is invalid.'
    case 'NOT_INITIALIZED':
      return 'Runtime is not initialized yet. Please retry.'
    case 'TIMEOUT':
      return 'Request timed out. Please retry.'
    case 'INTERNAL_ERROR':
      return 'A server error occurred. Please retry.'
    default:
      return error.message || fallback
  }
}

function parseBridgeErrorFromUnknown(error: unknown): BridgeError | undefined {
  if (error == null) {
    return undefined
  }

  if (typeof error === 'string') {
    const trimmed = error.trim()
    if (!trimmed) {
      return undefined
    }

    try {
      return parseBridgeErrorValue(JSON.parse(trimmed))
    } catch {
      return undefined
    }
  }

  if (typeof error === 'object') {
    const asRecord = error as Record<string, unknown>
    return parseBridgeErrorValue(
      typeof asRecord.error === 'object' && asRecord.error !== null
        ? (asRecord.error as Record<string, unknown>)
        : asRecord,
    )
  }

  if (!(error instanceof Error)) {
    return undefined
  }

  const trimmed = error.message.trim()
  if (!trimmed) {
    return undefined
  }

  try {
    return parseBridgeErrorValue(JSON.parse(trimmed))
  } catch {
    // noop
  }

  return undefined
}

function parseBridgeErrorValue(value: Record<string, unknown>) {
  const code = value?.code
  const message = value?.message

  if (typeof code === 'string' && typeof message === 'string') {
    return {
      code,
      message,
      retryable:
        typeof value.retryable === 'boolean'
          ? value.retryable
          : undefined,
      details:
        typeof value.details === 'object' && value.details !== null
          ? (value.details as Record<string, unknown>)
          : undefined,
    } as BridgeError
  }

  return undefined
}

class MatchManagerNotifyHandler extends BaseMessageHandler {
  constructor(private readonly manager: SessionManager) {
    super('MatchManager')
  }

  override handleNotify(message: BridgeMessage) {
    const parsed = parseRoute(message.route)
    const normalizedAction = parsed.action.toLowerCase()
    const routeContainsRuntimeReady = message.route
      .toLowerCase()
      .includes('runtimeready'.toLowerCase())
    const routeContainsParticipantPresenceChanged = message.route
      .toLowerCase()
      .includes('participantpresencechanged'.toLowerCase())

    if (
      (parsed.manager === 'MatchManager' && normalizedAction === 'runtimeready') ||
      routeContainsRuntimeReady
    ) {
      this.manager.handleRuntimeReadyNotify(message.data as MatchManagerRuntimeReadyNotify)
      return
    }

    if (
      (parsed.manager === 'MatchManager' &&
        normalizedAction === 'participantpresencechanged') ||
      routeContainsParticipantPresenceChanged
    ) {
      this.manager.handleParticipantPresenceChangedNotify(
        message.data as MatchManagerParticipantPresenceChangedNotify,
      )
    }
  }
}

class LobbyChatManagerNotifyHandler extends BaseMessageHandler {
  constructor(private readonly manager: SessionManager) {
    super('LobbyChatManager')
  }

  override handleNotify(message: BridgeMessage) {
    const { action } = parseRoute(message.route)

    if (action === 'MessageReceived') {
      this.manager.handleLobbyChatMessageReceived(
        message.data as LobbyChatMessageReceivedNotify,
      )
      return
    }

    if (action === 'SystemMessage') {
      this.manager.handleLobbyChatSystemMessage(message.data as LobbyChatSystemMessageNotify)
    }
  }

  override handleAcknowledge(message: BridgeMessage) {
    const { action } = parseRoute(message.route)
    if (action === 'SubmitMessage') {
      this.manager.handleLobbyChatSubmitAcknowledge(
        message.data as LobbyChatSubmitMessageAck,
      )
    }
  }
}

export class SessionManager {
  private listeners = new Set<Listener>()
  private bridgeManager: BridgeManager | null = null
  private snapshot = createInitialSnapshot()
  private readonly matchManagerNotifyHandler = new MatchManagerNotifyHandler(this)
  private readonly lobbyChatManagerNotifyHandler =
    new LobbyChatManagerNotifyHandler(this)

  mount(bridgeManager: BridgeManager) {
    this.bridgeManager = bridgeManager
    bridgeManager.registerHandler(this.matchManagerNotifyHandler)
    bridgeManager.registerHandler(this.lobbyChatManagerNotifyHandler)
  }

  unmount() {
    if (!this.bridgeManager) {
      return
    }

    this.bridgeManager.unregisterHandler(this.matchManagerNotifyHandler.getRoute())
    this.bridgeManager.unregisterHandler(
      this.lobbyChatManagerNotifyHandler.getRoute(),
    )
    this.bridgeManager = null
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = () => {
    return this.snapshot
  }

  stageCreateRoom(input: StageCreateRoomInput) {
    const playerName = input.playerName.trim()
    const normalizedInviteCode = input.inviteCode.trim().toUpperCase()

    this.setSnapshot({
      ...this.snapshot,
      playerName,
      lobbyEntryMode: 'create',
      activeInviteCode:
        normalizedInviteCode.length > 0 ? normalizedInviteCode : null,
      activeRoomId: normalizedInviteCode.length > 0 ? normalizedInviteCode : null,
      createRoomStatus: 'idle',
      createRoomError: null,
      createRoomRequested: false,
      runtimeReadyNotified: false,
      runtimeReadyAt: this.snapshot.runtimeReadyAt,
      entryStagedAt: Date.now(),
      maxPlayerCount: 10,
      participants: [],
      chatMessages: [],
    })
  }

  stageJoinRoom(input: StageJoinRoomInput) {
    const playerName = input.playerName.trim()
    const normalizedInviteCode = input.inviteCode.trim().toUpperCase()

    this.setSnapshot({
      ...this.snapshot,
      playerName,
      lobbyEntryMode: 'join',
      activeInviteCode:
        normalizedInviteCode.length > 0 ? normalizedInviteCode : null,
      activeRoomId: normalizedInviteCode.length > 0 ? normalizedInviteCode : null,
      createRoomStatus: 'idle',
      createRoomError: null,
      createRoomRequested: false,
      runtimeReadyNotified: false,
      runtimeReadyAt: this.snapshot.runtimeReadyAt,
      entryStagedAt: Date.now(),
      maxPlayerCount: 10,
      participants: [],
      chatMessages: [],
    })
  }

  requestMatchRoom() {
    if (!this.snapshot.runtimeReadyNotified) {
      return
    }
    if (this.snapshot.runtimeReadyAt < this.snapshot.entryStagedAt) {
      return
    }

    if (this.snapshot.lobbyEntryMode === 'create') {
      void this.requestCreateRoom()
      return
    }

    if (this.snapshot.lobbyEntryMode === 'join') {
      void this.requestJoinRoom()
    }
  }

  private async requestCreateRoom() {
    if (
      !this.bridgeManager ||
      this.snapshot.createRoomRequested ||
      this.snapshot.lobbyEntryMode !== 'create' ||
      !this.snapshot.activeInviteCode ||
      this.snapshot.playerName.trim().length === 0 ||
      !this.snapshot.runtimeReadyNotified
    ) {
      return
    }

    this.setSnapshot({
      ...this.snapshot,
      createRoomRequested: true,
      createRoomStatus: 'requesting',
      createRoomError: null,
    })

    try {
      const requestPayload: MatchManagerCreateRoomRequest = {
        hostPlayer: {
          playerId: this.snapshot.playerId,
          playerNickname: this.snapshot.playerName,
          isHost: true,
        },
        roomCode: this.snapshot.activeInviteCode,
        maxPlayerCount: 10,
        region: 'KR',
        isPrivate: true,
      }
      const ack = await this.bridgeManager.sendRequest(
        BRIDGE_ROUTES.MatchManager_CreateRoom,
        requestPayload,
      )

      const ackData = ack.data as MatchManagerCreateRoomAck
      if (ackData.result === false) {
        this.setSnapshot({
          ...this.snapshot,
          createRoomStatus: 'error',
          createRoomError: toUserFacingBridgeError(
            ackData.error,
            'Create room request failed. Please try again in a moment.',
          ),
          createRoomRequested: false,
        })
        return
      }

      const nextParticipants =
        ackData.participants && ackData.participants.length > 0
          ? ackData.participants
          : [
              {
                playerId: this.snapshot.playerId,
                playerNickname: this.snapshot.playerName,
                isHost: true,
              },
            ]

      this.setSnapshot({
        ...this.snapshot,
        activeRoomId: ackData.roomId ?? this.snapshot.activeRoomId,
        activeInviteCode: ackData.inviteCode ?? this.snapshot.activeInviteCode,
        createRoomStatus: 'ready',
        createRoomError: null,
        createRoomRequested: false,
        participants: nextParticipants,
      })
    } catch (error) {
      const bridgeError = parseBridgeErrorFromUnknown(error)
      this.setSnapshot({
        ...this.snapshot,
        createRoomStatus: 'error',
        createRoomError: bridgeError
          ? toUserFacingBridgeError(
              bridgeError,
              'Create room request failed. Please try again in a moment.',
            )
          : error instanceof Error
            ? error.message
            : 'Create room request failed. Please try again in a moment.',
        createRoomRequested: false,
      })
    }
  }

  private async requestJoinRoom() {
    if (
      !this.bridgeManager ||
      this.snapshot.createRoomRequested ||
      this.snapshot.lobbyEntryMode !== 'join' ||
      !this.snapshot.activeInviteCode ||
      this.snapshot.playerName.trim().length === 0
    ) {
      return
    }

    this.setSnapshot({
      ...this.snapshot,
      createRoomRequested: true,
      createRoomStatus: 'requesting',
      createRoomError: null,
    })

    try {
      const requestPayload: MatchManagerJoinRoomRequest = {
        player: {
          playerId: this.snapshot.playerId,
          playerNickname: this.snapshot.playerName,
          isHost: false,
        },
        inviteCode: this.snapshot.activeInviteCode,
      }
      const ack = await this.bridgeManager.sendRequest(
        BRIDGE_ROUTES.MatchManager_JoinRoomByInviteCode,
        requestPayload,
      )

      const ackData = ack.data as MatchManagerJoinRoomAck
      if (ackData.result === false) {
        this.setSnapshot({
          ...this.snapshot,
          createRoomStatus: 'error',
          createRoomError: toUserFacingBridgeError(
            ackData.error,
            'Join room request failed. Please check invite code and retry.',
          ),
          createRoomRequested: false,
        })
        return
      }

      this.setSnapshot({
        ...this.snapshot,
        activeRoomId: ackData.roomId ?? this.snapshot.activeRoomId,
        createRoomStatus: 'ready',
        createRoomError: null,
        createRoomRequested: false,
        participants: ackData.participants ?? this.snapshot.participants,
      })
    } catch (error) {
      const bridgeError = parseBridgeErrorFromUnknown(error)
      this.setSnapshot({
        ...this.snapshot,
        createRoomStatus: 'error',
        createRoomError: bridgeError
          ? toUserFacingBridgeError(
              bridgeError,
              'Join room request failed. Please check invite code and retry.',
            )
          : error instanceof Error
            ? error.message
            : 'Join room request failed. Please check invite code and retry.',
        createRoomRequested: false,
      })
    }
  }

  async submitLobbyMessage(text: string) {
    if (!this.bridgeManager) {
      return
    }

    const trimmedText = text.trim()
    if (
      trimmedText.length === 0 ||
      !this.snapshot.activeRoomId ||
      this.snapshot.createRoomStatus !== 'ready' ||
      !this.snapshot.runtimeReadyNotified
    ) {
      return
    }

    const clientMessageId = `client_msg_${Date.now()}`
    const requestPayload: LobbyChatSubmitMessageRequest = {
      roomId: this.snapshot.activeRoomId,
      sender: {
        playerId: this.snapshot.playerId,
        playerNickname: this.snapshot.playerName,
        isHost: false,
      },
      message: {
        messageId: `msg_${Date.now()}`,
        senderPlayerId: this.snapshot.playerId,
        senderPlayerNickname: this.snapshot.playerName,
        messageText: trimmedText,
        createdAt: new Date().toISOString(),
      },
      clientMessageId,
    }

    try {
      const ack = await this.bridgeManager.sendRequest(
        BRIDGE_ROUTES.LobbyChatManager_SubmitMessage,
        requestPayload,
      )
      this.handleLobbyChatSubmitAcknowledge(ack.data as LobbyChatSubmitMessageAck)
    } catch (error) {
      const bridgeError = parseBridgeErrorFromUnknown(error)
      this.appendChatMessage({
        id: `system_${Date.now()}`,
        author: 'SYSTEM',
        text: bridgeError
          ? toUserFacingBridgeError(
              bridgeError,
              'Failed to send lobby message.',
            )
          : 'Failed to send lobby message.',
        createdAt: fallbackTime(),
        kind: 'system',
      })
    }
  }

  handleLobbyChatSubmitAcknowledge(data: LobbyChatSubmitAckData) {
    if (!this.canHandleRoomScopedEvent(data.roomId)) {
      return
    }

    if (data.result === false) {
      this.appendChatMessage({
        id: `system_${Date.now()}`,
        author: 'SYSTEM',
        text: toUserFacingBridgeError(
          data.error,
          'Send message failed. Please retry.',
        ),
        createdAt: parseTimestamp(
          data.message?.createdAt ?? new Date().toISOString(),
        ),
        kind: 'system',
      })
    }

    if (data.message) {
      this.upsertParticipant({
        playerId: data.message.senderPlayerId,
        playerNickname: data.message.senderPlayerNickname,
        isHost: false,
      })
    }
  }

  handleLobbyChatSystemMessage(data: LobbyChatSystemMessageNotify) {
    if (!this.canHandleRoomScopedEvent(data.roomId)) {
      return
    }

    if (!data.message) {
      return
    }

    this.appendChatMessage({
      id: `system_msg_${Date.now()}`,
      author: 'SYSTEM',
      text: data.message,
      createdAt: parseTimestamp(new Date().toISOString()),
      kind: 'system',
    })
  }

  handleRuntimeReadyNotify(data: MatchManagerRuntimeReadyNotify | null | undefined) {
    // Some Unity builds send RuntimeReady with empty data. Treat missing flag as ready.
    if (data?.unityReady === false) {
      return
    }

    if (
      this.snapshot.activeRoomId &&
      data?.roomId &&
      data.roomId !== this.snapshot.activeRoomId &&
      this.snapshot.createRoomStatus === 'ready'
    ) {
      return
    }

    this.setSnapshot({
      ...this.snapshot,
      runtimeReadyNotified: true,
      runtimeReadyAt: Date.now(),
      activeRoomId: data?.roomId ?? this.snapshot.activeRoomId,
    })
  }

  handleParticipantPresenceChangedNotify(
    data: MatchManagerParticipantPresenceChangedNotify | null | undefined,
  ) {
    if (!data || !this.canHandleRoomScopedEvent(data.roomId)) {
      return
    }

    const eventType = String(data.eventType ?? '').toUpperCase()
    if (eventType !== 'JOIN' && eventType !== 'LEAVE') {
      return
    }

    let nextParticipants = this.snapshot.participants

    if (Array.isArray(data.participants)) {
      nextParticipants = this.sanitizeParticipants(data.participants)
    } else if (data.participant?.playerId) {
      if (eventType === 'JOIN') {
        nextParticipants = this.mergeParticipant(
          this.snapshot.participants,
          this.normalizeParticipant(data.participant),
        )
      } else {
        nextParticipants = this.snapshot.participants.filter(
          (participant) => participant.playerId !== data.participant?.playerId,
        )
      }
    }

    this.setSnapshot({
      ...this.snapshot,
      participants: nextParticipants,
      maxPlayerCount:
        typeof data.maxPlayerCount === 'number' && data.maxPlayerCount > 0
          ? data.maxPlayerCount
          : this.snapshot.maxPlayerCount,
    })
  }

  handleLobbyChatMessageReceived(data: LobbyChatMessageReceivedNotify) {
    if (!this.canHandleRoomScopedEvent(data.roomId)) {
      return
    }

    if (!data.message?.messageId) {
      return
    }

    if (
      this.snapshot.activeRoomId &&
      data.roomId &&
      data.roomId !== this.snapshot.activeRoomId
    ) {
      return
    }

    console.log('[CHAT_NTY_RECEIVED]', {
      route: BRIDGE_ROUTES.LobbyChatManager_MessageReceived,
      roomId: data.roomId,
      messageId: data.message.messageId,
      senderPlayerId: data.message.senderPlayerId,
      senderPlayerNickname: data.message.senderPlayerNickname,
      createdAt: data.message.createdAt,
      messageText: data.message.messageText,
    })

    this.appendChatMessage({
      id: data.message.messageId,
      author: data.message.senderPlayerNickname ?? 'UNKNOWN',
      authorPlayerId: data.message.senderPlayerId,
      text: data.message.messageText ?? '',
      createdAt: parseTimestamp(data.message.createdAt ?? new Date().toISOString()),
      kind: 'user',
    })

    this.upsertParticipant({
      playerId: data.message.senderPlayerId,
      playerNickname: data.message.senderPlayerNickname ?? data.message.senderPlayerId,
      isHost: false,
    })
  }

  private appendChatMessage(nextMessage: LobbyChatMessageRecord) {
    if (
      this.snapshot.chatMessages.some((message) => message.id === nextMessage.id) ||
      (nextMessage.clientMessageId &&
        this.snapshot.chatMessages.some(
          (message) => message.clientMessageId === nextMessage.clientMessageId,
        ))
    ) {
      return
    }

    this.setSnapshot({
      ...this.snapshot,
      chatMessages: [...this.snapshot.chatMessages, nextMessage],
    })
  }

  private upsertParticipant(next: PlayerBase) {
    if (!next?.playerId) {
      return
    }

    const nextParticipants = this.mergeParticipant(
      this.snapshot.participants,
      this.normalizeParticipant(next),
    )

    this.setSnapshot({
      ...this.snapshot,
      participants: nextParticipants,
    })
  }

  private mergeParticipant(currentParticipants: PlayerBase[], next: PlayerBase) {
    const index = currentParticipants.findIndex(
      (participant) => participant.playerId === next.playerId,
    )

    if (index < 0) {
      return [...currentParticipants, next]
    }

    const current = currentParticipants[index]
    const merged: PlayerBase = {
      ...current,
      playerNickname:
        next.playerNickname?.trim().length
          ? next.playerNickname
          : current.playerNickname,
      isHost: Boolean(current.isHost || next.isHost),
    }

    const nextParticipants = [...currentParticipants]
    nextParticipants[index] = merged
    return nextParticipants
  }

  private sanitizeParticipants(participants: PlayerBase[]) {
    const byId = new Map<string, PlayerBase>()
    for (const participant of participants) {
      const normalized = this.normalizeParticipant(participant)
      if (!normalized.playerId) {
        continue
      }

      const current = byId.get(normalized.playerId)
      if (!current) {
        byId.set(normalized.playerId, normalized)
        continue
      }

      byId.set(
        normalized.playerId,
        {
          ...current,
          playerNickname:
            normalized.playerNickname?.trim().length
              ? normalized.playerNickname
              : current.playerNickname,
          isHost: Boolean(current.isHost || normalized.isHost),
        },
      )
    }

    return [...byId.values()]
  }

  private normalizeParticipant(participant: PlayerBase): PlayerBase {
    const playerId = participant.playerId?.trim() ?? ''
    const fallbackName = playerId || 'UNKNOWN'
    const playerNickname =
      participant.playerNickname?.trim().length
        ? participant.playerNickname.trim()
        : fallbackName

    return {
      playerId,
      playerNickname,
      isHost: Boolean(participant.isHost),
    }
  }

  private canHandleRoomScopedEvent(roomId?: string) {
    if (!this.snapshot.runtimeReadyNotified) {
      return false
    }

    if (!this.snapshot.activeRoomId) {
      return false
    }

    if (roomId && roomId !== this.snapshot.activeRoomId) {
      return false
    }

    return true
  }

  private setSnapshot(nextSnapshot: SessionSnapshot) {
    this.snapshot = nextSnapshot
    this.emit()
  }

  private emit() {
    for (const listener of this.listeners) {
      listener()
    }
  }
}

export function useSessionStore(manager: SessionManager) {
  return useSyncExternalStore(
    manager.subscribe,
    manager.getSnapshot,
    manager.getSnapshot,
  )
}
