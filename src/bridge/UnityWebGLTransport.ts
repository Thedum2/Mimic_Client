import type { BridgeTransport } from '@/bridge/transport'
import { unityBridgeTarget } from '@/unity/unityConfig'
import type { UnityInstance } from '@/types/unity-webgl'

class UnityWebGLTransport implements BridgeTransport {
  private readonly listeners = new Set<(payload: string) => void>()
  private unityInstance: UnityInstance | null = null

  constructor() {
    window.dispatchReactUnityEvent = (eventNameOrPayload: string, payload?: string) => {
      const nextPayload = typeof payload === 'string' ? payload : eventNameOrPayload
      if (typeof nextPayload !== 'string' || nextPayload.length === 0) {
        return
      }

      this.emit(nextPayload)
    }

    this.flushQueuedMessages()

    window.addEventListener('unity-bridge-message', this.handleUnityBridgeEvent as EventListener)
  }

  attach(instance: UnityInstance) {
    this.unityInstance = instance
    this.flushQueuedMessages()
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
    this.flushQueuedMessages()

    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit(payload: string) {
    this.listeners.forEach((listener) => {
      listener(payload)
    })
  }

  private flushQueuedMessages() {
    const queue = window.__reactBridgeQueue
    if (!Array.isArray(queue) || queue.length === 0) {
      return
    }

    const buffered = queue.splice(0, queue.length)
    buffered.forEach((entry) => {
      if (entry && typeof entry.payload === 'string' && entry.payload.length > 0) {
        this.emit(entry.payload)
      }
    })
  }

  private handleUnityBridgeEvent = (event: Event) => {
    const customEvent = event as CustomEvent<string>
    const payload = customEvent?.detail
    if (typeof payload !== 'string' || payload.length === 0) {
      return
    }

    this.emit(payload)
  }
}

export const unityWebGLTransport = new UnityWebGLTransport()
