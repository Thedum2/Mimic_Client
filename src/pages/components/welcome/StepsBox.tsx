import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import type { Step, StepExtra } from '@/types/common'
import { useUIStore } from '@/stores/uiStore'

interface StepsBoxProps {
  title: string
  stepSets: Array<(Step & StepExtra)[]>
  compact?: boolean
}

const FADE_MS = 3000
const PROGRESS_RADIUS = 8
const PROGRESS_CIRCUMFERENCE = +(2 * Math.PI * PROGRESS_RADIUS).toFixed(4)
const PROGRESS_VIEWBOX_SIZE = PROGRESS_RADIUS * 2 + 4
const progressRingFillStyle: CSSProperties & Record<string, string | number> = {
  animationDuration: `${FADE_MS}ms`,
  strokeDasharray: `${PROGRESS_CIRCUMFERENCE}`,
  strokeDashoffset: `${PROGRESS_CIRCUMFERENCE}`,
  '--steps-progress-start': `${PROGRESS_CIRCUMFERENCE}`,
}

export default function StepsBox({
  title,
  stepSets = [],
  compact = false,
}: StepsBoxProps) {
  const currentIndex = useUIStore((state) => state.stepsCurrentIndex)
  const setCurrentIndex = useUIStore((state) => state.setStepsCurrentIndex)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [progressTick, setProgressTick] = useState(0)
  const allSteps = useMemo(() => stepSets.flat(), [stepSets])

  const safeCurrentIndex =
    allSteps.length > 0
      ? ((currentIndex % allSteps.length) + allSteps.length) % allSteps.length
      : 0

  useEffect(() => {
    if (allSteps.length === 0) {
      return
    }

    if (currentIndex < 0 || currentIndex >= allSteps.length) {
      setCurrentIndex(0)
    }
  }, [allSteps.length, currentIndex, setCurrentIndex])

  const goNext = useCallback(() => {
    const nextIndex = safeCurrentIndex === allSteps.length - 1 ? 0 : safeCurrentIndex + 1

    setCurrentIndex(nextIndex)
    setProgressTick((previous) => previous + 1)
  }, [allSteps.length, safeCurrentIndex, setCurrentIndex])

  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    if (allSteps.length > 1) {
      setProgressTick((previous) => previous + 1)
      timerRef.current = setInterval(goNext, FADE_MS)
    }
  }, [allSteps.length, goNext])

  useEffect(() => {
    startTimer()

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [allSteps.length, startTimer])

  useEffect(() => {
    setCurrentIndex(0)
  }, [stepSets])

  const handleDotClick = (index: number) => {
    setCurrentIndex(index)
    setProgressTick((previous) => previous + 1)
    startTimer()
  }

  const cardGap = compact ? 'gap-2' : 'gap-3 md:gap-4'
  const contentPadding = compact ? 'pl-3 pr-3' : 'pl-5 pr-5'
  const panelHeight = compact ? 'h-[150px]' : 'h-[195px]'
  const panelPad = compact ? 'p-2' : 'p-3'
  const componentWidth = compact ? 'w-full' : 'w-full'
  const titleClass = compact ? 'text-lg' : 'text-xl'
  const descClass = compact ? 'text-xs' : 'text-sm'
  const previewHeight = compact ? 'h-[86px] md:h-[96px]' : 'h-[120px] md:h-[140px]'
  const iconPad = compact ? 'p-0.5' : 'p-1'
  const dotSize = compact ? 'h-3 w-3' : 'h-3 w-3'

  return (
    <div
      className={`relative z-50 mx-auto flex ${panelHeight} w-full ${componentWidth} flex-col rounded-2xl border border-white/50 bg-black ${panelPad} opacity-100`}
      aria-label={title}
    >
      <div className="relative flex-grow overflow-hidden rounded-xl">
        {allSteps.map((raw, index) => {
          const step = raw
          const isActive = index === safeCurrentIndex

          return (
            <div
              key={index}
              className={`absolute inset-0 pointer-events-none transition-opacity duration-500 will-change-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}
              aria-hidden={!isActive}
            >
              <div className={`h-full w-full rounded-2xl ${contentPadding}`}>
                <div className={`relative z-10 grid h-full grid-cols-12 ${cardGap}`}>
                  <div className="col-span-12 flex min-h-0 flex-col justify-center md:col-span-7">
                    <div className="flex items-start gap-3 md:gap-4">
                      <div className="relative shrink-0">
                        <div
                          className={`rounded-xl ${iconPad} ring-1 ring-white/20`}
                          style={{
                            backgroundColor: step.iconBgColor || 'rgba(255,255,255,0.08)',
                          }}
                        >
                          {step.icon}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <h3 className={`truncate ${titleClass} font-extrabold leading-tight`}>{step.title}</h3>
                        <p className={`mt-1 overflow-hidden text-ellipsis ${descClass} text-white/75 leading-snug`}>
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-12 flex min-h-0 flex-col justify-center md:col-span-5">
                    <div className={`relative ${previewHeight} w-full overflow-hidden rounded-lg border border-white/15 bg-white/5`}>
                      {step.media ? (
                        <div className="h-full w-full">{step.media}</div>
                      ) : null}
                      {!step.media && step.mediaUrl ? (
                        <img
                          src={step.mediaUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          style={
                            step.mediaOffsetY
                              ? {
                                  transform: `translateY(${step.mediaOffsetY}px)`,
                                }
                              : undefined
                          }
                          loading="lazy"
                        />
                      ) : !step.media ? (
                        <div className="relative h-full w-full">
                          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.04)_0_8px,transparent_8px_16px)]" />
                          <div className="absolute inset-0 grid place-items-center">
                            <div className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] text-white/75">
                              Preview
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex select-none cursor-default items-center justify-center gap-2.5">
        {allSteps.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleDotClick(index)}
            className={`group relative ${dotSize} cursor-pointer overflow-visible rounded-full border border-white/50 bg-transparent p-0 transition-all ${safeCurrentIndex === index ? 'scale-110 border-white/70' : 'bg-white/10 hover:border-white/70'}`}
            aria-label={`Step ${index + 1}`}
            aria-current={currentIndex === index}
          >
            {safeCurrentIndex === index ? (
              <span
                key={progressTick}
                className="absolute inset-0 steps-progress-track"
                style={{ animationDuration: `${FADE_MS}ms` }}
              >
                <svg
                  className="steps-progress-ring"
                  viewBox={`0 0 ${PROGRESS_VIEWBOX_SIZE} ${PROGRESS_VIEWBOX_SIZE}`}
                  aria-hidden="true"
                >
                  <circle
                    className="steps-progress-ring-bg"
                    cx={(PROGRESS_RADIUS + 2).toFixed(1)}
                    cy={(PROGRESS_RADIUS + 2).toFixed(1)}
                    r={PROGRESS_RADIUS}
                  />
                  <circle
                    className="steps-progress-ring-fill"
                    cx={(PROGRESS_RADIUS + 2).toFixed(1)}
                    cy={(PROGRESS_RADIUS + 2).toFixed(1)}
                    r={PROGRESS_RADIUS}
                    style={progressRingFillStyle}
                  />
                </svg>
              </span>
            ) : (
              <span
                className={`absolute inset-0 transition ${safeCurrentIndex > index ? 'bg-white/45' : ''}`}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
