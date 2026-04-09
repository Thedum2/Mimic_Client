import { unityLoaderUrl } from '@/unity/unityConfig'
import type { UnityConfig, UnityInstance } from '@/types/unity-webgl'

let loaderPromise: Promise<void> | null = null

async function ensureUnityLoader() {
  if (window.createUnityInstance) {
    return
  }

  if (!loaderPromise) {
    loaderPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${unityLoaderUrl}"]`)

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true })
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Unity loader')), { once: true })
        return
      }

      const script = document.createElement('script')
      script.src = unityLoaderUrl
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Unity loader'))
      document.body.append(script)
    })
  }

  await loaderPromise
}

export async function loadUnityWebGL(
  canvas: HTMLCanvasElement,
  config: UnityConfig,
  onProgress?: (progress: number) => void,
) {
  await ensureUnityLoader()

  if (!window.createUnityInstance) {
    throw new Error('Unity loader did not expose createUnityInstance')
  }

  return window.createUnityInstance(canvas, config, onProgress)
}

export async function unloadUnityWebGL(instance: UnityInstance | null) {
  if (!instance) {
    return
  }

  await instance.Quit()
}
