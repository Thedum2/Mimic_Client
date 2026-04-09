import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'

import { bootstrapRuntime, teardownRuntime } from '@/runtime/bootstrap'
import { router } from '@/routes/router'

export function App() {
  useEffect(() => {
    bootstrapRuntime()

    return () => {
      teardownRuntime()
    }
  }, [])

  return <RouterProvider router={router} />
}
