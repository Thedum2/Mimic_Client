import { createPortal } from 'react-dom'

import type { RibbonProps } from '@/types/common'
import Ribbon from './Ribbon'

type RibbonOverlayProps = RibbonProps

export default function RibbonOverlay(props: RibbonOverlayProps) {
  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(<Ribbon {...props} />, document.body)
}
