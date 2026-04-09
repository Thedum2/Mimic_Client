import type { MessageHandler, MessageSender } from '@/bridge/BaseMessageHandler'
import type { BridgeMessage, MessageDirection, MessageType, RuntimeLogEntry } from '@/bridge/model'
import type { BridgeTransport } from '@/bridge/transport'

interface PendingRequest {
  resolve: (message: BridgeMessage) => void
  reject: (error: Error) => void
  timeoutId: ReturnType<typeof setTimeout>
}

export class BridgeManager {
  private static instance: BridgeManager | null = null

  static getInstance() {
    if (!BridgeManager.instance) {
      BridgeManager.instance = new BridgeManager()
    }

    return BridgeManager.instance
  }

  private readonly handlers = new Map<string, MessageHandler>()
  private readonly pendingRequests = new Map<string, PendingRequest>()
  private readonly listeners = new Set<() => void>()
  private readonly logs: RuntimeLogEntry[] = []
  private transport: BridgeTransport | null = null
  private unsubscribeTransport: (() => void) | null = null
  private initialized = false
  private idIndex = 0

  private readonly sender: MessageSender = {
    request: (route, data, timeoutMs) => this.sendRequest(route, data, timeoutMs),
    notify: (route, data) => this.sendNotify(route, data),
  }

  private constructor() {}

  init(transport: BridgeTransport) {
    if (this.initialized) {
      return
    }

    this.transport = transport
    this.unsubscribeTransport = transport.subscribe((payload) => {
      this.receiveSerializedMessage(payload)
    })
    this.initialized = true
    this.pushLog('system', 'Bridge initialized', 'Loopback transport attached')
    this.emit()
  }

  dispose() {
    this.unsubscribeTransport?.()
    this.unsubscribeTransport = null
    this.transport = null
    this.initialized = false

    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeoutId)
      pending.reject(new Error('Bridge disposed'))
    }

    this.pendingRequests.clear()
    this.handlers.clear()
    this.pushLog('system', 'Bridge disposed', 'Handlers and pending requests cleared')
    this.emit()
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  registerHandler(handler: MessageHandler) {
    this.handlers.set(handler.getRoute(), handler)
    handler.bindSender(this.sender)
    this.pushLog('system', 'Handler registered', handler.getRoute())
    this.emit()
  }

  unregisterHandler(route: string) {
    this.handlers.delete(route)
    this.pushLog('system', 'Handler unregistered', route)
    this.emit()
  }

  async sendRequest(route: string, data: unknown, timeoutMs = 5_000) {
    const message = this.createMessage('REQ', 'R2U', route, data, true)

    const promise = new Promise<BridgeMessage>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(message.id)
        reject(new Error(`Request timed out for ${route}`))
      }, timeoutMs)

      this.pendingRequests.set(message.id, { resolve, reject, timeoutId })
    })

    this.sendMessage(message)
    return promise
  }

  sendNotify(route: string, data: unknown) {
    this.sendMessage(this.createMessage('NTY', 'R2U', route, data, true))
  }

  receiveMessage(message: BridgeMessage) {
    this.logInterfaceMessage('receive', message)
    this.pushLog(message.direction, `${message.type} ${message.route}`, JSON.stringify(message.data))

    switch (message.type) {
      case 'REQ':
        this.handleRequest(message.route, message)
        break
      case 'ACK':
        this.handleAcknowledge(message)
        break
      case 'NTY':
        this.handleNotify(message.route, message)
        break
    }

    this.emit()
  }

  receiveSerializedMessage(payload: string) {
    this.receiveMessage(JSON.parse(payload) as BridgeMessage)
  }

  getLogs() {
    return [...this.logs].reverse()
  }

  getHandlerRoutes() {
    return [...this.handlers.keys()]
  }

  injectReactRequest<TData>(type: MessageType, route: string, data: TData, id?: string) {
    this.receiveMessage(this.createMessage(type, 'R2U', route, data, true, id))
  }

  private handleRequest(routeName: string, message: BridgeMessage) {
    const handler = this.handlers.get(routeName)

    if (!handler) {
      this.sendAcknowledge(message.id, message.route, false, { error: `No handler for ${routeName}` })
      return
    }

    handler.handleRequest(
      message,
      (data) => this.sendAcknowledge(message.id, message.route, true, data),
      (error) => this.sendAcknowledge(message.id, message.route, false, { error }),
    )
  }

  private handleAcknowledge(message: BridgeMessage) {
    const pending = this.pendingRequests.get(message.id)

    if (!pending) {
      return
    }

    clearTimeout(pending.timeoutId)
    this.pendingRequests.delete(message.id)

    if (message.ok) {
      pending.resolve(message)
      return
    }

    pending.reject(new Error(String((message.data as { error?: string } | null)?.error ?? 'Unknown bridge error')))
  }

  private handleNotify(routeName: string, message: BridgeMessage) {
    this.handlers.get(routeName)?.handleNotify(message)
  }

  private sendAcknowledge(requestId: string, route: string, ok: boolean, data: unknown) {
    this.sendMessage(this.createMessage('ACK', 'U2R', route, data, ok, requestId))
  }

  private sendMessage(message: BridgeMessage) {
    this.logInterfaceMessage('send', message)
    this.pushLog(message.direction, `${message.type} ${message.route}`, JSON.stringify(message.data))

    if (!this.transport) {
      throw new Error('Bridge transport not initialized')
    }

    this.transport.send(JSON.stringify(message))
    this.emit()
  }

  private createMessage(type: MessageType, direction: MessageDirection, route: string, data: unknown, ok: boolean, customId?: string): BridgeMessage {
    return {
      id: customId ?? `${direction}-${++this.idIndex}`,
      type,
      direction,
      route,
      data,
      ok,
      timestamp: new Date().toISOString(),
    }
  }

  private pushLog(direction: RuntimeLogEntry['direction'], title: string, detail: string) {
    this.logs.push({
      id: `${Date.now()}-${this.logs.length + 1}`,
      direction,
      title,
      detail,
      at: new Date().toISOString(),
    })

    if (this.logs.length > 40) {
      this.logs.shift()
    }
  }

  private logInterfaceMessage(phase: 'send' | 'receive', message: BridgeMessage) {
    console.log(
      '[REACT][interface]',
      `${phase.toUpperCase()} ${message.direction} ${message.type} ${message.route}`,
      message.data,
    )
  }

  private emit() {
    this.listeners.forEach((listener) => {
      listener()
    })
  }
}
