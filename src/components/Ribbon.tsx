import { useMemo } from 'react'

import type { RibbonProps } from '@/types/common'

export default function Ribbon({
  text,
  rotate = 0,
  top = '10%',
  speedSec = 60,
  theme = 'black',
}: RibbonProps) {
  const isBlackTheme = theme === 'black'

  const content = useMemo(() => {
    const repeated = Array.from({ length: 18 }, () => text).join('   * * *   ')

    return `${text}   * * *   ${repeated}`
  }, [text])

  const animation = `ribbon-scroll ${speedSec}s linear infinite`
  const transform = `translateX(-50%) rotate(${rotate}deg)`
  const boxShadow =
    isBlackTheme
      ? '0 2px 16px rgba(0, 0, 0, 0.45)'
      : '0 2px 16px rgba(0, 0, 0, 0.2)'
  const textShadow =
    isBlackTheme
      ? '0 2px 6px rgba(255,255,255,0.25)'
      : '0 2px 6px rgba(0,0,0,0.2)'

  const bandClasses =
    isBlackTheme
      ? 'bg-black text-white border-white/25'
      : 'bg-white text-black border-black/25'

  const ribbonTextStyle = {
    animation,
    fontSize: 'clamp(0.68rem, 1.2vw, 0.9rem)',
    lineHeight: 1,
    padding: '0.4rem 1rem',
    letterSpacing: '0.2em',
  } as const

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed left-1/2 z-[4] w-[260vmax] select-none overflow-hidden border ${bandClasses}`}
      style={{
        top,
        transform,
        transformOrigin: 'center',
        paddingTop: '0.16rem',
        paddingBottom: '0.16rem',
        paddingLeft: '0.4rem',
        paddingRight: '0.4rem',
        boxShadow,
        textShadow,
      }}
    >
      <div className="whitespace-nowrap flex">
        <span
          className="inline-block whitespace-nowrap font-black"
          style={ribbonTextStyle}
        >
          {content}
        </span>
        <span
          className="inline-block whitespace-nowrap font-black"
          style={ribbonTextStyle}
          aria-hidden
        >
          {content}
        </span>
      </div>
      <style>{`
        @keyframes ribbon-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
