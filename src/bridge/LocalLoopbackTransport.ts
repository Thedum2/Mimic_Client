import type { BridgeTransport } from '@/bridge/transport'

export function createLocalTransport(): BridgeTransport {
  const listeners = new Set<(payload: string) => void>()

  return {
    send(payload) {
      for (const listener of listeners) {
        listener(payload)
      }
    },
    subscribe(listener) {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
  }
}
