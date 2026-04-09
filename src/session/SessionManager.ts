import { useSyncExternalStore } from 'react'

import { BaseMessageHandler } from '@/bridge/BaseMessageHandler'
import type { BridgeManager } from '@/bridge/BridgeManager'
import type { BridgeMessage } from '@/bridge/model'
import { BRIDGE_ROUTES } from '@/bridge/interface'
import { parseRoute } from '@/bridge/route'

type Listener = () => void
type LobbyEntryMode = 'create' | 'join'
type CreateRoomStatus = 'idle' | 'requesting' | 'ready' | 'error'
type ChatKind = 'user' | 'system'
type ChatMessageType = 'USER' | 'SYSTEM'

export interface LobbyChatMessageRecord {
  id: string
  author: string
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

interface CreateRoomAckData {
  result?: boolean
  roomId?: string
  inviteCode?: string
}

interface JoinRoomAckData {
  result?: boolean
  roomId?: string
  joinedPlayerCount?: number
  error?: {
    code?: string
    message?: string
    retryable?: boolean
  }
}

interface RuntimeReadyNotifyData {
  roomId?: string
  unityReady?: boolean
  sceneName?: string
}

interface LobbyChatSubmitAckData {
  result?: boolean
  roomId?: string
  clientMessageId?: string
  messageId?: string
  recordedAt?: string
}

interface LobbyChatMessagePayload {
  messageId: string
  senderPlayerId?: string
  senderDisplayName?: string
  messageText?: string
  messageType?: ChatMessageType
  createdAt?: string
}

interface LobbyChatMessageReceivedNotifyData {
  roomId?: string
  message?: LobbyChatMessagePayload
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

function toChatKind(messageType: string | undefined): ChatKind {
  return messageType === 'SYSTEM' ? 'system' : 'user'
}

function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase()
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

    if (
      (parsed.manager === 'MatchManager' && normalizedAction === 'runtimeready') ||
      routeContainsRuntimeReady
    ) {
      this.manager.handleRuntimeReadyNotify(message.data as RuntimeReadyNotifyData)
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
        message.data as LobbyChatMessageReceivedNotifyData,
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
    const normalizedInviteCode = normalizeInviteCode(input.inviteCode)

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
      chatMessages: [],
    })
  }

  stageJoinRoom(input: StageJoinRoomInput) {
    const playerName = input.playerName.trim()
    const normalizedInviteCode = normalizeInviteCode(input.inviteCode)

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
      chatMessages: [],
    })
  }

  requestMatchRoom() {
    if (!this.snapshot.runtimeReadyNotified) {
      return
    }

    if (this.snapshot.lobbyEntryMode === 'create') {
      void this.requestCreateRoom()
      return
    }

    if (this.snapshot.lobbyEntryMode === 'join') {
      void this.requestJoinRoom()
      return
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
      const ack = await this.bridgeManager.sendRequest(
        BRIDGE_ROUTES.MatchManager_CreateRoom,
        {
          hostPlayerId: this.snapshot.playerId,
          hostPlayerName: this.snapshot.playerName,
          roomCode: this.snapshot.activeInviteCode,
          maxPlayerCount: 10,
          region: 'KR',
          isPrivate: true,
        },
      )

      const ackData = ack.data as CreateRoomAckData
      if (ackData.result === false) {
        this.setSnapshot({
          ...this.snapshot,
          createRoomStatus: 'error',
          createRoomError:
            'Create room request failed. Please try again in a moment.',
          createRoomRequested: false,
        })
        return
      }

      this.setSnapshot({
        ...this.snapshot,
        activeRoomId: ackData.roomId ?? this.snapshot.activeRoomId,
        activeInviteCode: ackData.inviteCode ?? this.snapshot.activeInviteCode,
        createRoomStatus: 'ready',
        createRoomError: null,
      })
    } catch (error) {
      this.setSnapshot({
        ...this.snapshot,
        createRoomStatus: 'error',
        createRoomError:
          error instanceof Error
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
      const ack = await this.bridgeManager.sendRequest(
        BRIDGE_ROUTES.MatchManager_JoinRoomByInviteCode,
        {
          playerId: this.snapshot.playerId,
          playerName: this.snapshot.playerName,
          inviteCode: this.snapshot.activeInviteCode,
        },
      )

      const ackData = ack.data as JoinRoomAckData
      if (ackData.result === false) {
        this.setSnapshot({
          ...this.snapshot,
          createRoomStatus: 'error',
          createRoomError:
            ackData.error?.message ??
            'Join room request failed. Please check invite code and retry.',
          createRoomRequested: false,
        })
        return
      }

      this.setSnapshot({
        ...this.snapshot,
        activeRoomId: ackData.roomId ?? this.snapshot.activeRoomId,
        createRoomStatus: 'ready',
        createRoomError: null,
      })
    } catch (error) {
      this.setSnapshot({
        ...this.snapshot,
        createRoomStatus: 'error',
        createRoomError:
          error instanceof Error
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
    try {
      const ack = await this.bridgeManager.sendRequest(
        BRIDGE_ROUTES.LobbyChatManager_SubmitMessage,
        {
          roomId: this.snapshot.activeRoomId,
          senderPlayerId: this.snapshot.playerId,
          senderDisplayName: this.snapshot.playerName,
          messageText: trimmedText,
          clientMessageId,
        },
      )

      const ackData = ack.data as LobbyChatSubmitAckData
      if (ackData.result === false) {
        this.appendChatMessage({
          id: `system_${Date.now()}`,
          author: 'SYSTEM',
          text: 'Send message failed. Please retry.',
          createdAt: fallbackTime(),
          kind: 'system',
        })
        return
      }

      this.appendChatMessage({
        id: ackData.messageId ?? clientMessageId,
        author: this.snapshot.playerName || 'Me',
        text: trimmedText,
        createdAt: parseTimestamp(ackData.recordedAt ?? new Date().toISOString()),
        kind: 'user',
        clientMessageId,
      })
    } catch {
      this.appendChatMessage({
        id: `system_${Date.now()}`,
        author: 'SYSTEM',
        text: 'Failed to send lobby message.',
        createdAt: fallbackTime(),
        kind: 'system',
      })
    }
  }

  handleRuntimeReadyNotify(data: RuntimeReadyNotifyData) {
    if (
      this.snapshot.activeRoomId &&
      data.roomId &&
      data.roomId !== this.snapshot.activeRoomId &&
      this.snapshot.createRoomStatus === 'ready'
    ) {
      return
    }

    this.setSnapshot({
      ...this.snapshot,
      runtimeReadyNotified: true,
      activeRoomId: data.roomId ?? this.snapshot.activeRoomId,
    })
  }

  handleLobbyChatMessageReceived(data: LobbyChatMessageReceivedNotifyData) {
    if (!this.canHandleRoomScopedEvent(data.roomId)) {
      return
    }

    if (!data.message?.messageId) {
      return
    }

    if (this.snapshot.activeRoomId && data.roomId && data.roomId !== this.snapshot.activeRoomId) {
      return
    }

    this.appendChatMessage({
      id: data.message.messageId,
      author: data.message.senderDisplayName ?? 'UNKNOWN',
      text: data.message.messageText ?? '',
      createdAt: parseTimestamp(data.message.createdAt ?? new Date().toISOString()),
      kind: toChatKind(data.message.messageType),
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
