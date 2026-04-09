import { useSyncExternalStore } from 'react'

import type { BridgeManager } from '@/bridge/BridgeManager'
import type { SessionManager } from '@/session/SessionManager'

export type RoomEntryMode = 'create' | 'invite' | 'rejoin'
export type RoomShellStatus = 'lobby-formed' | 'runtime-loading' | 'runtime-ready' | 'runtime-error'

export interface RoomShellRecord {
  roomId: string
  inviteCode: string
  entryMode: RoomEntryMode
  roomStatus: RoomShellStatus
  hostLabel: string
  playerLabel: string
  playerCount: number
  playerCapacity: number
  summary: string
  activityNote: string
  memoryOnly: boolean
}

interface RuntimeSnapshot {
  activeRoom: RoomShellRecord | null
  lastRoom: RoomShellRecord | null
}

type Listener = () => void

function normalizePlayerLabel(value: string) {
  const trimmedValue = value.trim()

  if (trimmedValue.length > 0) {
    return trimmedValue
  }

  return 'Observer-01'
}

function normalizeInviteCode(value: string) {
  const normalizedValue = value.replace(/[^a-z0-9]/gi, '').toUpperCase()

  if (normalizedValue.length > 0) {
    return normalizedValue.slice(0, 6)
  }

  return createInviteCode()
}

function normalizeRoomId(value: string) {
  const normalizedValue = value.replace(/[^a-z0-9-]/gi, '').toLowerCase()

  if (normalizedValue.length > 0) {
    return normalizedValue
  }

  return `room-${createInviteCode().toLowerCase()}`
}

function createInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

function createRoomId(inviteCode: string) {
  return `room-${inviteCode.toLowerCase()}`
}

function deriveInviteCodeFromRoomId(roomId: string) {
  const roomToken = roomId.replace(/^room-/, '').replace(/-/g, '').toUpperCase()

  if (roomToken.length > 0) {
    return roomToken.slice(0, 6)
  }

  return createInviteCode()
}

function createRoomRecord(room: Omit<RoomShellRecord, 'roomStatus'>): RoomShellRecord {
  return {
    ...room,
    roomStatus: 'lobby-formed',
  }
}

function createFallbackRoom(roomId: string): RoomShellRecord {
  const normalizedRoomId = normalizeRoomId(roomId)
  const inviteCode = deriveInviteCodeFromRoomId(normalizedRoomId)

  return createRoomRecord({
    roomId: normalizedRoomId,
    inviteCode,
    entryMode: 'rejoin',
    hostLabel: 'Memory shell',
    playerLabel: 'Observer-01',
    playerCount: 2,
    playerCapacity: 5,
    summary: '로컬 더미/임시 동작 확인용 룸입니다.',
    activityNote: '방 입장, 채팅, 룸 전환과 같은 기본 동작 흐름 점검용 데이터입니다.',
    memoryOnly: true,
  })
}

class RuntimeStore {
  private listeners = new Set<Listener>()
  private snapshot: RuntimeSnapshot = {
    activeRoom: null,
    lastRoom: null,
  }

  connect(_bridgeManager: BridgeManager, _sessionManager: SessionManager) {}

  disconnect() {
    this.setSnapshot({
      activeRoom: null,
      lastRoom: this.snapshot.lastRoom,
    })
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

  createLocalRoom(playerLabel: string) {
    const normalizedPlayerLabel = normalizePlayerLabel(playerLabel)
    const inviteCode = createInviteCode()
    const room = createRoomRecord({
      roomId: createRoomId(inviteCode),
      inviteCode,
      entryMode: 'create',
      hostLabel: normalizedPlayerLabel,
      playerLabel: normalizedPlayerLabel,
      playerCount: 1,
      playerCapacity: 5,
      summary: '로컬 디버깅에서 사용하는 기본 템플릿 룸입니다.',
      activityNote: '게임 실행 전 상태 점검 및 연결 타임아웃 같은 기본 동작을 시험합니다.',
      memoryOnly: true,
    })

    this.activateRoom(room)

    return room
  }

  joinRoomByInvite(inviteCode: string, playerLabel: string) {
    const normalizedInviteCode = normalizeInviteCode(inviteCode)
    const normalizedPlayerLabel = normalizePlayerLabel(playerLabel)
    const room = createRoomRecord({
      roomId: createRoomId(normalizedInviteCode),
      inviteCode: normalizedInviteCode,
      entryMode: 'invite',
      hostLabel: 'Invite host',
      playerLabel: normalizedPlayerLabel,
      playerCount: 3,
      playerCapacity: 5,
      summary: '초대 코드 기반 룸 참가용 테스트 데이터입니다.',
      activityNote: '입장, 메시지 수신, 참여자 갱신 동작의 예비 경로를 점검합니다.',
      memoryOnly: true,
    })

    this.activateRoom(room)

    return room
  }

  rejoinLastRoom() {
    if (!this.snapshot.lastRoom) {
      return null
    }

    const room = {
      ...this.snapshot.lastRoom,
      entryMode: 'rejoin' as const,
      roomStatus: 'lobby-formed' as const,
      activityNote: '최근 나갔던 룸 상태로 다시 돌아갑니다.',
      memoryOnly: true,
    }

    this.activateRoom(room)

    return room
  }

  leaveActiveRoom() {
    this.setSnapshot({
      activeRoom: null,
      lastRoom: this.snapshot.activeRoom ?? this.snapshot.lastRoom,
    })
  }

  ensureRoomForRoute(roomId: string): RoomShellRecord | null {
    const nextRoom = this.getRoomPreview(roomId)

    if (this.snapshot.activeRoom?.roomId === nextRoom.roomId) {
      return this.snapshot.activeRoom
    }

    const entryMode: RoomEntryMode = this.snapshot.lastRoom?.roomId === nextRoom.roomId ? 'rejoin' : nextRoom.entryMode

    this.activateRoom({
      ...nextRoom,
      entryMode,
      roomStatus: 'lobby-formed',
    })

    return this.snapshot.activeRoom
  }

  getRoomPreview(roomId: string): RoomShellRecord {
    const normalizedRoomId = normalizeRoomId(roomId)

    if (this.snapshot.activeRoom?.roomId === normalizedRoomId) {
      return this.snapshot.activeRoom
    }

    if (this.snapshot.lastRoom?.roomId === normalizedRoomId) {
      const previewRoom: RoomShellRecord = {
        ...this.snapshot.lastRoom,
        entryMode: 'rejoin',
      }

      return previewRoom
    }

    return createFallbackRoom(normalizedRoomId)
  }

  private activateRoom(room: RoomShellRecord) {
    this.setSnapshot({
      activeRoom: room,
      lastRoom: room,
    })
  }

  private setSnapshot(nextSnapshot: RuntimeSnapshot) {
    this.snapshot = nextSnapshot
    this.emit()
  }

  private emit() {
    for (const listener of this.listeners) {
      listener()
    }
  }
}

export const runtimeStore = new RuntimeStore()

export function useRuntimeStore() {
  return useSyncExternalStore(
    runtimeStore.subscribe,
    runtimeStore.getSnapshot,
    runtimeStore.getSnapshot,
  )
}
