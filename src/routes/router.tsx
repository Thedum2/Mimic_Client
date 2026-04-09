import { createBrowserRouter } from 'react-router-dom'

import { routes } from '@/routes/config'

const basePath = import.meta.env.VITE_BASE_PATH || '/'

export const router = createBrowserRouter(routes, {
  basename: basePath.replace(/\/+$/, '') || '/',
})
