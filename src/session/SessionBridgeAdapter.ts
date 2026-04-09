import type { BridgeManager } from '@/bridge/BridgeManager'
import { SessionManager } from '@/session/SessionManager'

export class SessionBridgeAdapter {
  private static instance: SessionBridgeAdapter | null = null
  private manager = new SessionManager()

  static getInstance() {
    if (!SessionBridgeAdapter.instance) {
      SessionBridgeAdapter.instance = new SessionBridgeAdapter()
    }

    return SessionBridgeAdapter.instance
  }

  mount(_bridgeManager: BridgeManager) {
    this.manager.mount(_bridgeManager)
  }

  unmount() {
    this.manager.unmount()
  }

  getManager() {
    return this.manager
  }
}
