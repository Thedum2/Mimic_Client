import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'

import bgImage from '@/assets/bg.jpg'
import Background from '@/components/Background'
import { useUIStore } from '@/state/uiStore'

export default function AppLayout() {
  const isBackgroundVisible = useUIStore((state) => state.isBackgroundVisible)
  const setBackgroundVisible = useUIStore((state) => state.setBackgroundVisible)

  useEffect(() => {
    const pref = window.localStorage.getItem('mimic:background-visible')

    if (pref !== null) {
      setBackgroundVisible(pref === 'true')
    }
  }, [setBackgroundVisible])

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-black text-white">
      {isBackgroundVisible && (
        <Background
          bgSrc={bgImage}
          bgPosition="center"
          overlayOpacity={0.35}
        />
      )}
      <div className="relative z-30 min-h-screen w-full">
        <Outlet />
      </div>
    </div>
  )
}
