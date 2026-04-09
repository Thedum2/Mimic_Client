import { useSyncExternalStore } from 'react'

import type { BridgeManager } from '@/bridge/BridgeManager'
import type { SessionManager } from '@/session/SessionManager'

export type RoomEntryMode = 'create' | 'invite' | 'rejoin'
export type RoomShellStatus = 'lobby-formed' | 'runtime-loading' | 'runtime-ready' | 'runtime-error'
export type UnityShellStatus = 'idle' | 'loading' | 'ready' | 'error'

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

export interface UnityShellState {
  status: UnityShellStatus
  progress: number
  errorMessage: string | null
}

interface RuntimeSnapshot {
  activeRoom: RoomShellRecord | null
  lastRoom: RoomShellRecord | null
  unity: UnityShellState
}

type Listener = () => void

function createInitialUnityState(): UnityShellState {
  return {
    status: 'idle',
    progress: 0,
    errorMessage: null,
  }
}

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

function deriveRoomStatus(unityStatus: UnityShellStatus): RoomShellStatus {
  switch (unityStatus) {
    case 'loading':
      return 'runtime-loading'
    case 'ready':
      return 'runtime-ready'
    case 'error':
      return 'runtime-error'
    case 'idle':
    default:
      return 'lobby-formed'
  }
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
    summary: '직접 연 룸 셸입니다. 실제 네트워크 확인 없이 현재 세션 안에서만 복원됩니다.',
    activityNote: '현재 세션에 남은 방 정보가 없어 경량 셸 메타데이터만 복원했습니다.',
    memoryOnly: true,
  })
}

class RuntimeStore {
  private listeners = new Set<Listener>()
  private snapshot: RuntimeSnapshot = {
    activeRoom: null,
    lastRoom: null,
    unity: createInitialUnityState(),
  }

  connect(_bridgeManager: BridgeManager, _sessionManager: SessionManager) {
  }

  disconnect() {
    this.setSnapshot({
      activeRoom: null,
      lastRoom: this.snapshot.lastRoom,
      unity: createInitialUnityState(),
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
      summary: '친구만 초대하는 프라이빗 셸을 만듭니다. 실제 매치 연결 전, 진입 흐름과 상태 표면만 먼저 확인합니다.',
      activityNote: '로컬 셸 방이 생성되었습니다. 3.1 매치 진입 전까지는 이 메모리 상태만 유지됩니다.',
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
      summary: '초대 코드로 셸에 합류합니다. 실제 네트워크 입장 대신, 문서 기준의 방 진입 감각만 먼저 이어집니다.',
      activityNote: '코드 확인 이후에는 로컬 셸 메타데이터만 유지됩니다.',
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
      activityNote: '앱 메모리에 남겨 둔 마지막 룸 셸로 다시 돌아왔습니다.',
      memoryOnly: true,
    }

    this.activateRoom(room)

    return room
  }

  leaveActiveRoom() {
    this.setSnapshot({
      activeRoom: null,
      lastRoom: this.snapshot.activeRoom ?? this.snapshot.lastRoom,
      unity: createInitialUnityState(),
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

  setUnityShellState(nextUnityState: Partial<UnityShellState>) {
    const unity = {
      ...this.snapshot.unity,
      ...nextUnityState,
    }
    const activeRoom = this.snapshot.activeRoom
      ? {
          ...this.snapshot.activeRoom,
          roomStatus: deriveRoomStatus(unity.status),
        }
      : null

    this.setSnapshot({
      activeRoom,
      lastRoom: activeRoom ?? this.snapshot.lastRoom,
      unity,
    })
  }

  private activateRoom(room: RoomShellRecord) {
    this.setSnapshot({
      activeRoom: room,
      lastRoom: room,
      unity: createInitialUnityState(),
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
  return useSyncExternalStore(runtimeStore.subscribe, runtimeStore.getSnapshot, runtimeStore.getSnapshot)
}
