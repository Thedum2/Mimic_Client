import type { MessageHandler, MessageSender } from '@/bridge/BaseMessageHandler'
import { BRIDGE_REQUEST_TIMEOUT_MS } from '@/bridge/model'
import type { BridgeMessage, MessageDirection, MessageEndpoint, MessageType, RuntimeLogEntry } from '@/bridge/model'
import type { BridgeTransport } from '@/bridge/transport'
import { isMessageDirection, isMessageType, parseRoute } from '@/bridge/route'

interface PendingRequest {
  route: string
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

  async sendRequest(route: string, data: unknown, timeoutMs = BRIDGE_REQUEST_TIMEOUT_MS) {
    const message = this.createMessage('REQ', 'R2U', route, data, true)

    const promise = new Promise<BridgeMessage>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(message.id)
        reject(new Error(`Request timed out for ${route}`))
      }, timeoutMs)

      this.pendingRequests.set(message.id, {
        route: message.route,
        resolve,
        reject,
        timeoutId,
      })
    })

    this.sendMessage(message)
    return promise
  }

  sendNotify(route: string, data: unknown) {
    this.sendMessage(this.createMessage('NTY', 'R2U', route, data, true))
  }

  receiveMessage(message: BridgeMessage) {
    const normalizedMessage = this.normalizeIncomingMessage(message)
    const logDirection = normalizedMessage.direction ?? this.getDirectionFromEndpoints(normalizedMessage.from, normalizedMessage.to)

    this.logInterfaceMessage('receive', normalizedMessage)
    this.pushLog(
      logDirection ?? 'system',
      `${normalizedMessage.type} ${normalizedMessage.route}`,
      JSON.stringify(normalizedMessage),
    )

    switch (normalizedMessage.type) {
      case 'REQ':
        this.handleRequest(normalizedMessage)
        break
      case 'ACK':
        this.handleAcknowledge(normalizedMessage)
        break
      case 'NTY':
        this.handleNotify(normalizedMessage)
        break
    }

    this.emit()
  }

  receiveSerializedMessage(payload: string) {
    let parsed: unknown

    try {
      parsed = JSON.parse(payload)
    } catch (error) {
      this.pushLog('system', 'Failed to parse bridge payload', String(error))
      return
    }

    if (!parsed || typeof parsed !== 'object') {
      this.pushLog('system', 'Invalid bridge payload shape', String(parsed))
      return
    }

    const route = (parsed as { route?: unknown }).route
    const messageType = (parsed as { type?: unknown }).type
    const messageId = (parsed as { id?: unknown }).id
    const ok = (parsed as { ok?: unknown }).ok
    const from = (parsed as { from?: unknown }).from
    const to = (parsed as { to?: unknown }).to
    const direction = (parsed as { direction?: unknown }).direction
    const timestamp = (parsed as { timestamp?: unknown }).timestamp

    if (typeof route !== 'string' || !isMessageType(messageType) || !route) {
      this.pushLog('system', 'Invalid bridge message envelope', JSON.stringify(parsed))
      return
    }

    if (ok !== undefined && typeof ok !== 'boolean') {
      this.pushLog('system', 'Invalid bridge message envelope', JSON.stringify(parsed))
      return
    }

    const parsedRoute = parseRoute(route)
    const normalizedRoute = parsedRoute.route || parsedRoute.manager || route.trim()
    if (!normalizedRoute) {
      this.pushLog('system', 'Invalid bridge message envelope', JSON.stringify(parsed))
      return
    }

    const messageFrom = this.toEndpoint(from)
    const messageTo = this.toEndpoint(to)
    const providedDirection = isMessageDirection(direction) ? direction : undefined
    const expectedEndpoints = providedDirection
      ? this.getEndpointsFromDirection(providedDirection)
      : this.getEndpointsFromDirection(this.getDefaultDirection(messageType))

    this.receiveMessage({
      ...(parsed as Omit<BridgeMessage, 'direction' | 'route' | 'from' | 'to' | 'type' | 'id' | 'ok' | 'timestamp'>),
      id:
        typeof messageId === 'string' && messageId.trim().length > 0
          ? messageId.trim()
          : this.createMessageId(),
      direction: providedDirection,
      from: messageFrom ?? expectedEndpoints.from,
      to: messageTo ?? expectedEndpoints.to,
      ok: ok ?? true,
      route: normalizedRoute,
      type: messageType,
      timestamp: this.normalizeTimestamp(timestamp),
    })
  }

  clearLogs() {
    this.logs.splice(0)
    this.emit()
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

  private handleRequest(message: BridgeMessage) {
    const handler = this.handlers.get(this.getHandlerKey(message.route))

    if (!handler) {
      this.pushLog('system', 'No bridge handler found for route', message.route)
      this.sendAcknowledge(message.id, message.route, false, { error: `No handler for ${message.route}` })
      return
    }

    handler.handleRequest(
      message,
      (data) => this.sendAcknowledge(message.id, message.route, true, data),
      (error) => this.sendAcknowledge(message.id, message.route, false, { error }),
    )
  }

  private handleAcknowledge(message: BridgeMessage) {
    const pending =
      this.pendingRequests.get(message.id) ??
      this.findPendingByRoute(message.route)

    if (!pending) {
      this.pushLog('system', 'Unknown ACK (no pending request)', JSON.stringify(message))
      return
    }

    clearTimeout(pending.timeoutId)
    this.deletePendingRequest(pending)

    if (message.ok) {
      pending.resolve(message)
      return
    }

    const data = message.data as { error?: unknown } | null
    const error = data?.error
    const errorText =
      typeof error === 'string'
        ? error
        : error != null
          ? JSON.stringify(error)
          : 'Unknown bridge error'

    pending.reject(new Error(errorText))
  }

  private handleNotify(message: BridgeMessage) {
    const handler = this.handlers.get(this.getHandlerKey(message.route))
    if (!handler) {
      this.pushLog('system', 'No bridge handler found for route', message.route)
      return
    }

    handler.handleNotify(message)
  }

  private sendAcknowledge(requestId: string, route: string, ok: boolean, data: unknown) {
    this.sendMessage(this.createMessage('ACK', 'U2R', route, data, ok, requestId))
  }

  private sendMessage(message: BridgeMessage) {
    const wireMessage = this.toWireMessage(message)
    this.logInterfaceMessage('send', wireMessage)
    this.pushLog(
      message.direction ?? this.getDefaultDirection(message.type),
      `${message.type} ${message.route}`,
      JSON.stringify(wireMessage),
    )

    if (!this.transport) {
      this.pushLog('system', 'Bridge transport not initialized', JSON.stringify(message))
      throw new Error('Bridge transport not initialized')
    }

    this.transport.send(JSON.stringify(wireMessage))
    this.emit()
  }

  private createMessage(type: MessageType, direction: MessageDirection, route: string, data: unknown, ok: boolean, customId?: string): BridgeMessage {
    const normalizedRoute = parseRoute(route)
    const routeName = normalizedRoute.route || normalizedRoute.manager || route.trim()

    return {
      id: customId ?? this.createMessageId(),
      type,
      route: routeName,
      data,
      ok,
      timestamp: Date.now(),
      from: direction === 'R2U' ? 'R' : 'U',
      to: direction === 'R2U' ? 'U' : 'R',
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

  private logInterfaceMessage(
    phase: 'send' | 'receive',
    message: Omit<BridgeMessage, 'direction'> & { direction?: MessageDirection },
  ) {
    const direction =
      message.direction ??
      (message.type === 'REQ'
        ? 'R2U'
        : message.type === 'ACK'
          ? 'U2R'
          : 'U2R')

    console.log(
      '[REACT][interface]',
      `${phase.toUpperCase()} ${direction} ${message.type} ${message.route}`,
      message,
    )
  }

  private normalizeIncomingMessage(message: BridgeMessage) {
    const messageRoute = message.route.trim()
    const parsedRoute = parseRoute(messageRoute)
    const normalizedRoute = parsedRoute.route || parsedRoute.manager || messageRoute
    const providedDirection = isMessageDirection(message.direction) ? message.direction : undefined
    const endpoints = providedDirection
      ? this.getEndpointsFromDirection(providedDirection)
      : this.getEndpointsFromDirection(this.getDefaultDirection(message.type))

    return {
      ...message,
      direction: providedDirection,
      route: normalizedRoute,
      from: this.toEndpoint(message.from) ?? endpoints.from,
      to: this.toEndpoint(message.to) ?? endpoints.to,
      timestamp: this.normalizeTimestamp(message.timestamp),
    }
  }

  private isMessageEndpoint(value: unknown): value is MessageEndpoint {
    return value === 'R' || value === 'U'
  }

  private getDirectionFromEndpoints(
    from: MessageEndpoint | undefined,
    to: MessageEndpoint | undefined,
  ) {
    if (from === 'R' && to === 'U') {
      return 'R2U' as const
    }

    if (from === 'U' && to === 'R') {
      return 'U2R' as const
    }

    return undefined
  }

  private getDefaultDirection(type: MessageType): MessageDirection {
    return type === 'REQ' ? 'R2U' : type === 'ACK' ? 'U2R' : 'U2R'
  }

  private getEndpointsFromDirection(direction: MessageDirection) {
    return direction === 'R2U' ? { from: 'R' as const, to: 'U' as const } : { from: 'U' as const, to: 'R' as const }
  }

  private toEndpoint(value: unknown): MessageEndpoint | undefined {
    return this.isMessageEndpoint(value) ? value : undefined
  }

  private normalizeTimestamp(timestamp: unknown) {
    if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
      return timestamp
    }

    if (typeof timestamp === 'string' && timestamp.trim().length > 0) {
      const numeric = Number(timestamp)
      if (Number.isFinite(numeric)) {
        return numeric
      }

      const parsed = Date.parse(timestamp)
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }

    return Date.now()
  }

  private getHandlerKey(routeName: string) {
    const parsed = parseRoute(routeName)
    const candidates = [routeName, parsed.route, parsed.manager].filter(Boolean)

    for (const candidate of candidates) {
      if (this.handlers.has(candidate)) {
        return candidate
      }
    }

    return parsed.route || parsed.manager || routeName
  }

  private createMessageId() {
    return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  }

  private findPendingByRoute(route: string) {
    for (const pending of this.pendingRequests.values()) {
      if (pending.route === route) {
        return pending
      }
    }

    return null
  }

  private deletePendingRequest(target: PendingRequest) {
    for (const [id, pending] of this.pendingRequests.entries()) {
      if (pending === target) {
        this.pendingRequests.delete(id)
        return
      }
    }
  }

  private toWireMessage(message: BridgeMessage) {
    const { direction: _direction, ...wireMessage } = message
    return wireMessage
  }

  private emit() {
    this.listeners.forEach((listener) => {
      listener()
    })
  }
}
