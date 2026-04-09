import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import bgImage from '@/assets/bg.jpg'
import Background from '@/components/Background'
import { useUIStore } from '@/stores/uiStore'
import { UnityWebGLView } from '@/unity/UnityWebGLView'
import { useUnityLayoutStore } from '@/stores/unityLayoutStore'

function buildUnityStageStyle(mode: 'hidden' | 'loading' | 'lobby', lobbyRect: { x: number; y: number; width: number; height: number } | null) {
  if (mode === 'loading') {
    return {
      left: 0,
      top: 0,
      width: '100%',
      height: '100%',
      borderRadius: '0px',
      overflow: 'hidden' as const,
      display: 'block',
      pointerEvents: 'none' as const,
      opacity: 0,
    }
  }

  if (mode === 'lobby' && lobbyRect) {
    const slotWidth = Math.max(1, Math.floor(lobbyRect.width))
    const slotHeight = Math.max(1, Math.floor(lobbyRect.height))
    const width = slotWidth
    const height = slotHeight
    const left = Math.max(0, Math.floor(lobbyRect.x))
    const top = Math.max(0, Math.floor(lobbyRect.y))

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      borderRadius: '24px',
      overflow: 'hidden' as const,
      display: 'block',
      pointerEvents: 'auto' as const,
      opacity: 1,
    }
  }

  return { display: 'none' as const, opacity: 0 }
}

export default function AppLayout() {
  const location = useLocation()
  const isBackgroundVisible = useUIStore((state) => state.isBackgroundVisible)
  const setBackgroundVisible = useUIStore((state) => state.setBackgroundVisible)
  const mode = useUnityLayoutStore((state) => state.mode)
  const isUnityStageRoute = /^\/(loading|room)(\/|$)/.test(location.pathname)
  const isLoadingRoute = location.pathname.startsWith('/loading')
  const lobbyRect = useUnityLayoutStore((state) => state.lobbyRect)
  const unityStyle = buildUnityStageStyle(mode, lobbyRect)

  useEffect(() => {
    const pref = window.localStorage.getItem('mimic:background-visible')

    if (pref !== null) {
      setBackgroundVisible(pref === 'true')
    }
  }, [setBackgroundVisible])

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-black text-white">
      {isBackgroundVisible && !isLoadingRoute && (
        <Background
          bgSrc={bgImage}
          bgPosition="center"
          overlayOpacity={0.35}
        />
      )}
      {isUnityStageRoute ? (
        <div
          className="fixed z-10"
          style={{
            left: typeof unityStyle.left === 'number' ? `${unityStyle.left}px` : unityStyle.left,
            top: typeof unityStyle.top === 'number' ? `${unityStyle.top}px` : unityStyle.top,
            width: unityStyle.width,
            height: unityStyle.height,
            borderRadius: unityStyle.borderRadius,
            overflow: unityStyle.overflow,
            display: unityStyle.display,
            pointerEvents: unityStyle.pointerEvents,
            opacity: unityStyle.opacity,
          }}
        >
          <UnityWebGLView className="h-full w-full" />
        </div>
      ) : null}
      <div className="pointer-events-none relative z-30 min-h-screen w-full">
        <Outlet />
      </div>
    </div>
  )
}
