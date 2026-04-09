import type { UnityConfig } from '@/types/unity-webgl'

export const unityBridgeTarget = {
  gameObject: 'ReactBridge',
  methodName: 'ReceiveMessage',
}

function resolveUnityAssetPath(fileName: string) {
  const baseUrl = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`

  return `${baseUrl}build/unity/${fileName}`
}

export function createUnityConfig(showBanner?: UnityConfig['showBanner']): UnityConfig {
  return {
    dataUrl: resolveUnityAssetPath('WebGL.data'),
    frameworkUrl: resolveUnityAssetPath('WebGL.framework.js'),
    codeUrl: resolveUnityAssetPath('WebGL.wasm'),
    streamingAssetsUrl: resolveUnityAssetPath('StreamingAssets'),
    companyName: 'Mimic',
    productName: 'Mimic React',
    productVersion: '0.1.0',
    showBanner,
  }
}

export const unityLoaderUrl = resolveUnityAssetPath('WebGL.loader.js')
