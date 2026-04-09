import type { RouteObject } from 'react-router-dom'
import { Welcome, Lobby } from '@/pages/WelcomeLobbyBundle'
import LoadingScene from '@/pages/WelcomeLobbyBundle/LoadingScene'
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
