import type { MessageDirection, MessageType } from './model'

export const messageDirections = new Set<MessageDirection>(['R2U', 'U2R'])
export const messageTypes = new Set<MessageType>(['REQ', 'ACK', 'NTY'])
export function isMessageDirection(value: unknown): value is MessageDirection {
  return typeof value === 'string' && messageDirections.has(value as MessageDirection)
}

export function isMessageType(value: unknown): value is MessageType {
  return typeof value === 'string' && messageTypes.has(value as MessageType)
}

export function buildRoute(route: string, action?: string) {
  const normalizedRoute = String(route ?? '').trim()
  return action ? `${normalizedRoute}_${action}` : normalizedRoute
}

export function parseRoute(fullRoute: string) {
  const trimmedRoute = String(fullRoute ?? '').trim()
  if (!trimmedRoute) {
    return {
      direction: null as MessageDirection | null,
      route: '',
      manager: '',
      action: '',
      type: null as MessageType | null,
    }
  }

  const parts = trimmedRoute.split('_').filter(Boolean)
  const first = parts[0]
  let direction = null as MessageDirection | null
  let offset = 0
  if (isMessageDirection(first)) {
    direction = first as MessageDirection
    offset = 1
  }

  if (parts[offset] === 'BridgeManager') {
    offset += 1
  }

  const routeParts = parts.slice(offset)

  if (routeParts.length === 0) {
    return {
      direction: null as MessageDirection | null,
      route: '',
      manager: '',
      action: '',
      type: null as MessageType | null,
    }
  }

  const lastPart = routeParts[routeParts.length - 1]
  const includeType = isMessageType(lastPart)
  const bodyParts = includeType ? routeParts.slice(0, -1) : routeParts
  const manager = bodyParts[0] ?? ''

  if (!manager) {
    return {
      direction: null as MessageDirection | null,
      route: '',
      manager: '',
      action: '',
      type: null as MessageType | null,
    }
  }

  const action = bodyParts.slice(1).join('_')

  return {
    direction,
    route: bodyParts.join('_'),
    manager,
    action,
    type: includeType ? (lastPart as MessageType) : null,
  }
}
