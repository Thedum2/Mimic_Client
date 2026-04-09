import type { MessageType, MessageDirection, MessageEndpoint } from '@/bridge/model'

export const BRIDGE_ROUTES = {
  MatchManager_CreateRoom: 'MatchManager_CreateRoom',
  MatchManager_JoinRoomByInviteCode: 'MatchManager_JoinRoomByInviteCode',
  MatchManager_RejoinRoom: 'MatchManager_RejoinRoom',
  MatchManager_RuntimeReady: 'MatchManager_RuntimeReady',
  LobbyChatManager_SubmitMessage: 'LobbyChatManager_SubmitMessage',
  LobbyChatManager_MessageReceived: 'LobbyChatManager_MessageReceived',
  MathManager_Add: 'MathManager_Add',
  MathManager_Subtract: 'MathManager_Subtract',
} as const

export type BridgeRoute = (typeof BRIDGE_ROUTES)[keyof typeof BRIDGE_ROUTES]

export type MessageSource = MessageEndpoint
export type MessageTarget = MessageEndpoint
export type MessageDirectionAlias = MessageDirection
export type MessageKind = MessageType

export interface MatchManagerCreateRoomRequest {
  hostPlayerId: string
  hostPlayerName: string
  roomCode: string
  maxPlayerCount: number
  region: string
  isPrivate: boolean
}

export interface MatchManagerCreateRoomAck {
  result: boolean
  roomId: string
  inviteCode: string
}

export interface MatchManagerJoinRoomRequest {
  playerId: string
  playerName: string
  inviteCode: string
}

export interface MatchManagerJoinRoomAck {
  result: boolean
  roomId: string
  joinedPlayerCount: number
}

export interface MatchManagerRejoinRoomRequest {
  playerId?: string
  roomId?: string
  sessionId?: string
}

export interface MatchManagerRejoinRoomAck {
  result: boolean
  roomId: string
  matchStatus: string
}

export interface MatchManagerRuntimeReadyNotify {
  roomId?: string
  unityReady: boolean
  sceneName: string
}

export interface LobbyChatSubmitMessageRequest {
  roomId: string
  senderPlayerId: string
  senderDisplayName: string
  messageText: string
  clientMessageId: string
}

export interface LobbyChatSubmitMessageAck {
  result: boolean
  roomId: string
  clientMessageId: string
  messageId: string
  recordedAt: string
}

export interface LobbyChatMessage {
  messageId: string
  senderPlayerId: string
  senderDisplayName: string
  messageText: string
  messageType: 'USER' | 'SYSTEM'
  createdAt: string
}

export interface LobbyChatMessageReceivedNotify {
  roomId: string
  message: LobbyChatMessage
}
