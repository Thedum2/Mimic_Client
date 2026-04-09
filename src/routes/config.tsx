import type { RouteObject } from 'react-router-dom'
import Welcome from '@/pages/Welcome'
import Lobby from '@/pages/Lobby'
import ModalTest from '@/pages/ModalTest'
import UnityBridgeTest from '@/pages/UnityBridgeTest'

import AppLayout from '@/layouts/AppLayout'
import { PATHS } from './paths'

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Welcome />,
      },
      {
        path: PATHS.lobby,
        element: <Lobby />,
      },
      {
        path: PATHS.modalTest,
        element: <ModalTest />,
      },
      {
        path: PATHS.unityBridgeTest,
        element: <UnityBridgeTest />,
      },
    ],
  },
]
