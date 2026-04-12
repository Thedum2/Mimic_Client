import type { MessageType, MessageDirection, MessageEndpoint } from '@/bridge/model'

export const BRIDGE_ROUTES = {
  MatchManager_CreateRoom: 'MatchManager_CreateRoom',
  MatchManager_JoinRoomByInviteCode: 'MatchManager_JoinRoomByInviteCode',
  MatchManager_RejoinRoom: 'MatchManager_RejoinRoom',
  MatchManager_RuntimeReady: 'MatchManager_RuntimeReady',
  MatchManager_ParticipantPresenceChanged: 'MatchManager_ParticipantPresenceChanged',
  ConversationManager_OpenConversation: 'ConversationManager_OpenConversation',
  LobbyChatManager_SubmitMessage: 'LobbyChatManager_SubmitMessage',
  LobbyChatManager_MessageReceived: 'LobbyChatManager_MessageReceived',
  LobbyChatManager_SystemMessage: 'LobbyChatManager_SystemMessage',
  MathManager_Add: 'MathManager_Add',
  MathManager_Subtract: 'MathManager_Subtract',
} as const

export type BridgeRoute = (typeof BRIDGE_ROUTES)[keyof typeof BRIDGE_ROUTES]

export type MessageSource = MessageEndpoint
export type MessageTarget = MessageEndpoint
export type MessageDirectionAlias = MessageDirection
export type MessageKind = MessageType

export type BridgeErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'INVALID_ARGUMENT'
  | 'RUNTIME_NOT_READY'
  | 'NOT_INITIALIZED'
  | 'TIMEOUT'
  | 'INTERNAL_ERROR'
  | string

export interface PlayerBase {
  playerId: string
  playerNickname: string
  isHost?: boolean
}

export interface BridgeError {
  code: BridgeErrorCode
  message: string
  retryable?: boolean
  details?: Record<string, unknown>
}

export interface MatchManagerCreateRoomRequest {
  hostPlayer: PlayerBase
  roomCode: string
  maxPlayerCount: number
  region: string
  isPrivate: boolean
}

export interface MatchManagerCreateRoomAck {
  result: boolean
  roomId: string
  inviteCode: string
  joinedPlayerCount?: number
  participants?: PlayerBase[]
  error?: BridgeError
}

export interface MatchManagerJoinRoomRequest {
  player: PlayerBase
  inviteCode: string
}

export interface MatchManagerJoinRoomAck {
  result: boolean
  roomId: string
  joinedPlayerCount?: number
  participants: PlayerBase[]
  error?: BridgeError
}

export interface MatchManagerRejoinRoomRequest {
  player: PlayerBase
  roomId: string
  sessionId: string
}

export interface MatchManagerRejoinRoomAck {
  result: boolean
  roomId: string
  matchStatus: string
  error?: BridgeError
}

export interface MatchManagerRuntimeReadyNotify {
  roomId?: string
  unityReady: boolean
  sceneName: string
}

export type MatchManagerParticipantPresenceEventType = 'JOIN' | 'LEAVE'

export interface MatchManagerParticipantPresenceChangedNotify {
  roomId: string
  eventType: MatchManagerParticipantPresenceEventType
  participant?: PlayerBase
  participants?: PlayerBase[]
  joinedPlayerCount?: number
  maxPlayerCount?: number
}

export interface ChatMessage {
  messageId: string
  senderPlayerId: string
  senderPlayerNickname: string
  messageText: string
  createdAt: string
}

export interface LobbyChatSubmitMessageRequest {
  roomId: string
  sender: PlayerBase
  message: Omit<ChatMessage, 'messageId' | 'createdAt'> & {
    messageId?: string
    createdAt?: string
  }
  clientMessageId: string
}

export interface LobbyChatSubmitMessageAck {
  result: boolean
  roomId: string
  clientMessageId: string
  message: ChatMessage
  error?: BridgeError
}

export interface LobbyChatMessageReceivedNotify {
  roomId: string
  message: ChatMessage
}

export interface LobbyChatSystemMessageNotify {
  roomId?: string
  message: string
}

export interface ConversationManagerOpenConversationNotify {
  conversationId: string
  participants: PlayerBase[]
  observerPlayerIds?: string[]
  status?: string
}
