import type { BridgeMessage } from '@/bridge/model'
import { buildRoute } from '@/bridge/route'

export interface MessageSender {
  request(route: string, data: unknown, timeoutMs?: number): Promise<BridgeMessage>
  notify(route: string, data: unknown): void
}

export interface MessageHandler {
  getRoute(): string
  bindSender(sender: MessageSender): void
  handleRequest(message: BridgeMessage, onSuccess: (data: unknown) => void, onError: (error: string) => void): void
  handleAcknowledge(message: BridgeMessage): void
  handleNotify(message: BridgeMessage): void
}

export abstract class BaseMessageHandler implements MessageHandler {
  #sender: MessageSender | null = null

  constructor(private readonly route: string) {}

  getRoute() {
    return this.route
  }

  bindSender(sender: MessageSender) {
    this.#sender = sender
  }

  protected req(action: string, data: unknown, timeoutMs?: number) {
    return this.#sender?.request(this.buildRoute(action), data, timeoutMs)
  }

  protected nty(action: string, data: unknown) {
    this.#sender?.notify(this.buildRoute(action), data)
  }

  protected buildRoute(action?: string) {
    return buildRoute(this.route, action)
  }

  handleRequest(_message: BridgeMessage, _onSuccess: (data: unknown) => void, _onError: (error: string) => void) {}

  handleAcknowledge(_message: BridgeMessage) {}

  handleNotify(_message: BridgeMessage) {}
}
