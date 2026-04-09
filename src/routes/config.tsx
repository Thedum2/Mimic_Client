import type { RouteObject } from 'react-router-dom'
import Welcome from '@/pages/Welcome'
import Lobby from '@/pages/Lobby'
import LoadingScene from '@/pages/LoadingScene'
import ModalTest from '@/pages/ModalTest'

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
        path: PATHS.loading,
        element: <LoadingScene />,
      },
      {
        path: PATHS.modalTest,
        element: <ModalTest />,
      },
    ],
  },
]
