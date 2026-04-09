import type { FitStageProps } from '@/types/common'

import { useScaleFit } from './useScaleFit'

const DEFAULT_W = 1920
const DEFAULT_H = 1080

export default function FitStage({ mode = 'contain', bleedRatio = 0.18, className, children }: FitStageProps) {
  const { scale, scaledW, scaledH } = useScaleFit(DEFAULT_W, DEFAULT_H, mode, { bleedRatio })

  return (
    <div
      className="fixed inset-0 overflow-hidden bg-transparent"
      style={{ zIndex: 20 }}
    >
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 will-change-transform"
        style={{
          width: scaledW,
          height: scaledH,
          contain: 'layout paint size',
        }}
      >
        <div
          className={`h-[1080px] w-[1920px] ${className ?? ''}`}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            willChange: 'transform',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
