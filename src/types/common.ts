import type React from 'react'

export type IconProps = {
  name: string
  size?: number | string
  color?: string
  title?: string
  className?: string
  strokeWidth?: number
  type?: 'lucide' | 'custom'
  mode?: 'lazy' | 'eager'
} & Omit<React.SVGProps<SVGSVGElement>, 'width' | 'height' | 'color' | 'title'>

export interface Step {
  icon: React.ReactElement
  title: string
  desc: string
  iconBgColor?: string
}

export interface StepExtra {
  mediaUrl?: string
  media?: React.ReactNode
  progress?: number
  accent?: string
  mediaOffsetY?: number
}

export type BackgroundType = 'image' | 'video'

export interface BackgroundProps {
  bgSrc?: string
  bgAlt?: string
  bgPosition?: 'center' | 'top' | 'bottom' | 'left' | 'right' | string
  className?: string
  overlayOpacity?: number
  bgType?: BackgroundType | 'unknown'
}

export interface RibbonProps {
  text: string
  rotate?: number
  top?: string
  speedSec?: number
  theme?: 'black' | 'white'
}

export type FitMode = 'contain' | 'cover' | 'width' | 'height' | 'bleed'

export interface FitStageProps {
  mode?: FitMode
  bleedRatio?: number
  className?: string
  children: React.ReactNode
}
