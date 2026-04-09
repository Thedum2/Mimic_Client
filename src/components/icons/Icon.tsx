import * as React from 'react'
import * as LucideIcons from 'lucide-react'
import type { LucideProps } from 'lucide-react'

import type { IconProps } from '@/types/common'

type SVGRComponent = React.ComponentType<React.SVGProps<SVGSVGElement> & { title?: string }>

const lazyModules = import.meta.glob('../../assets/svg/**/*.svg') as Record<
  string,
  () => Promise<{ default: SVGRComponent }>
>
const eagerModules = import.meta.glob('../../assets/svg/**/*.svg', {
  eager: true,
  import: 'default',
}) as Record<string, SVGRComponent>

type LazyReg = Record<string, () => Promise<{ default: SVGRComponent }>>
type EagerReg = Record<string, SVGRComponent>
type LucideCandidate = React.ComponentType<React.ComponentProps<'svg'>> & {
  $$typeof?: symbol
  render?: unknown
}

const buildLazyRegistry = (): LazyReg => {
  const reg: LazyReg = {}
  for (const path in lazyModules) {
    const base = path.split('/').pop()!.replace(/\.svg$/i, '')
    if (!reg[base]) reg[base] = lazyModules[path]
  }
  return reg
}

const buildEagerRegistry = (): EagerReg => {
  const reg: EagerReg = {}
  for (const path in eagerModules) {
    const base = path.split('/').pop()!.replace(/\.svg$/i, '')
    const Cmp = eagerModules[path]
    if (!reg[base]) reg[base] = Cmp
  }
  return reg
}

const LAZY_REG = buildLazyRegistry()
const EAGER_REG = buildEagerRegistry()

const LUCIDE_REG = LucideIcons as Record<string, unknown>
const ALIAS_TO_CUSTOM: Record<string, string> = { close: 'x' }

function normalizeCustomName(name: string) {
  return ALIAS_TO_CUSTOM[name] ?? name
}

function FallbackBox({
  size = '1em',
  color = 'currentColor',
  className,
}: Pick<IconProps, 'size' | 'color' | 'className'>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-hidden="true" className={className}>
      <rect x="3" y="3" width="18" height="18" fill="none" stroke={color} strokeWidth="1.5" />
      <path d="M7 7l10 10M17 7L7 17" stroke={color} strokeWidth="1.5" />
    </svg>
  )
}

function getLucideIcon(name: string) {
  const candidate = LUCIDE_REG[name]
  if (!candidate) return null
  if (typeof candidate === 'function' || (typeof candidate === 'object' && candidate !== null && '$$typeof' in candidate)) {
    return candidate as LucideCandidate
  }
  return null
}

function isLucideIcon(name: string) {
  return getLucideIcon(name) !== null
}

function normalizeIconName(name: string) {
  return name.trim()
}

export default function Icon({
  name,
  size = '1em',
  color = 'currentColor',
  className,
  strokeWidth = 2,
  type = 'auto',
  mode = 'lazy',
  style,
  ...rest
}: IconProps & { type?: 'auto' | 'lucide' | 'custom' }) {
  const iconName = normalizeIconName(name)

  if (!iconName) {
    return <FallbackBox size={size} color={color} className={className} />
  }

  // lucide 우선 처리
  if (type === 'lucide') {
    const LucideIconComponent = getLucideIcon(iconName)
    if (!LucideIconComponent) {
      console.warn(`Lucide icon \"${iconName}\" not found`)
      return <FallbackBox size={size} color={color} className={className} />
    }
    return (
      <LucideIconComponent
        size={size}
        color={color}
        strokeWidth={strokeWidth}
        className={className}
        role="img"
        style={style}
        {...(rest as Omit<LucideProps, 'size' | 'color'>)}
      />
    )
  }

  const customName = normalizeCustomName(iconName)
  const hasCustom = mode === 'eager' ? !!EAGER_REG[customName] : !!LAZY_REG[customName]

  // custom 렌더링 (명시 custom이거나 lucide 미존재인 auto에서 대체)
  if (type === 'custom' || (!isLucideIcon(iconName) && hasCustom)) {
    if (!hasCustom) {
      console.warn(`Custom icon \"${customName}\" not found`)
      return <FallbackBox size={size} color={color} className={className} />
    }

    if (mode === 'eager') {
      const Cmp = EAGER_REG[customName]
      return (
        <Cmp
          width={size}
          height={size}
          className={className}
          role="img"
          style={{ color, ...style }}
          {...rest}
        />
      )
    }

    const LazyCmp = React.useMemo(() => React.lazy(LAZY_REG[customName] as () => Promise<{ default: SVGRComponent }>), [customName])
    return (
      <React.Suspense fallback={<FallbackBox size={size} color={color} className={className} />}>
        <LazyCmp
          width={size}
          height={size}
          className={className}
          role="img"
          style={{ color, ...style }}
          {...rest}
        />
      </React.Suspense>
    )
  }

  // auto: lucide가 있으면 먼저 렌더
  const LucideIconComponent = getLucideIcon(iconName)
  if (LucideIconComponent) {
    return (
      <LucideIconComponent
        size={size}
        color={color}
        strokeWidth={strokeWidth}
        className={className}
        role="img"
        style={style}
        {...(rest as Omit<LucideProps, 'size' | 'color'>)}
      />
    )
  }

  // fallback
  return <FallbackBox size={size} color={color} className={className} />
}

export function IconWithName(name?: string | null) {
  if (!name) return null
  return <Icon name={name} />
}
