import { BridgeManager } from '@/bridge/BridgeManager'
import { unityWebGLTransport } from '@/bridge/UnityWebGLTransport'
import { SessionBridgeAdapter } from '@/session/SessionBridgeAdapter'
import { runtimeStore } from '@/stores/runtimeStore'

const bridgeManager = BridgeManager.getInstance()
const bridgeAdapter = SessionBridgeAdapter.getInstance()
let bootstrapped = false

export function bootstrapRuntime() {
  if (bootstrapped) {
    return
  }

  bridgeManager.init(unityWebGLTransport)
  bridgeAdapter.mount(bridgeManager)
  runtimeStore.connect(bridgeManager, bridgeAdapter.getManager())
  bootstrapped = true
}

export function teardownRuntime() {
  if (!bootstrapped) {
    return
  }

  runtimeStore.disconnect()
  bridgeAdapter.unmount()
  bridgeManager.dispose()
  bootstrapped = false
}
