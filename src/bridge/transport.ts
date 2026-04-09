export interface BridgeTransport {
  send: (payload: string) => void
  subscribe: (listener: (payload: string) => void) => () => void
}
