import type { BridgeTransport } from '@/bridge/transport'
import { unityBridgeTarget } from '@/unity/unityConfig'
import type { UnityInstance } from '@/types/unity-webgl'

class UnityWebGLTransport implements BridgeTransport {
  private readonly listeners = new Set<(payload: string) => void>()
  private unityInstance: UnityInstance | null = null

  constructor() {
    window.dispatchReactUnityEvent = (eventNameOrPayload: string, payload?: string) => {
      const nextPayload = typeof payload === 'string' ? payload : eventNameOrPayload
      this.emit(nextPayload)
    }
  }

  attach(instance: UnityInstance) {
    this.unityInstance = instance
  }

  detach() {
    this.unityInstance = null
  }

  send(payload: string) {
    if (!this.unityInstance) {
      throw new Error('Unity instance not attached')
    }

    this.unityInstance.SendMessage(unityBridgeTarget.gameObject, unityBridgeTarget.methodName, payload)
  }

  subscribe(listener: (payload: string) => void) {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit(payload: string) {
    this.listeners.forEach((listener) => {
      listener(payload)
    })
  }
}

export const unityWebGLTransport = new UnityWebGLTransport()
