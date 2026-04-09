import { create } from 'zustand'
import { useEffect, useMemo } from 'react'

import type { FitMode } from '@/types/common'

interface ScaleViewportState {
  vw: number
  vh: number
  setViewport: (vw: number, vh: number) => void
}

const useScaleViewportStore = create<ScaleViewportState>((set) => ({
  vw: 0,
  vh: 0,
  setViewport(nextVw, nextVh) {
    set({ vw: nextVw, vh: nextVh })
  },
}))

export function useScaleFit(
  designW: number,
  designH: number,
  mode: FitMode = 'contain',
  opts?: { minScale?: number; maxScale?: number; bleedRatio?: number },
) {
  const vw = useScaleViewportStore((state) => state.vw)
  const vh = useScaleViewportStore((state) => state.vh)
  const setViewport = useScaleViewportStore((state) => state.setViewport)

  useEffect(() => {
    function onResize() {
      setViewport(window.innerWidth, window.innerHeight)
    }

    onResize()
    window.addEventListener('resize', onResize)

    return () => window.removeEventListener('resize', onResize)
  }, [setViewport])

  const safeVw = vw > 0 ? vw : designW
  const safeVh = vh > 0 ? vh : designH

  const scale = useMemo(() => {
    const sx = safeVw / designW
    const sy = safeVh / designH
    const containScale = Math.min(sx, sy)
    const coverScale = Math.max(sx, sy)

    let nextScale =
      mode === 'contain'
        ? containScale
        : mode === 'cover'
          ? coverScale
          : mode === 'width'
            ? sx
            : mode === 'height'
              ? sy
              : containScale + (coverScale - containScale) * clamp(opts?.bleedRatio ?? 0.18, 0, 1)

    if (opts?.maxScale != null) {
      nextScale = Math.min(nextScale, opts.maxScale)
    }

    if (opts?.minScale != null) {
      nextScale = Math.max(nextScale, opts.minScale)
    }

    return nextScale
  }, [designH, designW, mode, opts?.bleedRatio, opts?.maxScale, opts?.minScale, safeVh, safeVw])

  return {
    scale,
    scaledW: designW * scale,
    scaledH: designH * scale,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
