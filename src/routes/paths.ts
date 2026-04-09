export const PATHS = {
  lobby: 'room/:roomId?',
  loading: 'loading/:mode/:roomId?',
  modalTest: 'modal-test',
  unityBridgeTest: 'unity-bridge-test',
} as const

export function buildLobbyPath(roomId: string) {
  return `/room/${roomId}`
}

export function buildLoadingPath(mode: 'create' | 'join', roomId: string) {
  return `/loading/${mode}/${roomId}`
}
