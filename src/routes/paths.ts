export const PATHS = {
  lobby: 'room/:roomId?',
  modalTest: 'modal-test',
  unityBridgeTest: 'unity-bridge-test',
} as const

export function buildLobbyPath(roomId: string) {
  return `/room/${roomId}`
}
