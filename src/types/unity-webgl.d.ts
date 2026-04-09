export interface UnityInstance {
  SendMessage(gameObject: string, methodName: string, parameter?: string): void
  SetFullscreen(fullscreen: number): void
  Quit(): Promise<void>
}

export interface UnityConfig {
  dataUrl: string
  frameworkUrl: string
  codeUrl: string
  streamingAssetsUrl?: string
  companyName?: string
  productName?: string
  productVersion?: string
  showBanner?: (message: string, type: 'error' | 'warning') => void
}

declare global {
  interface Window {
    createUnityInstance?: (
      canvas: HTMLCanvasElement,
      config: UnityConfig,
      onProgress?: (progress: number) => void,
    ) => Promise<UnityInstance>
    dispatchReactUnityEvent?: (eventNameOrPayload: string, payload?: string) => void
    __reactBridgeQueue?: Array<{ name: string; payload: string }>
  }
}

export {}
