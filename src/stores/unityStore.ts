import { create } from 'zustand'

import type { UnityInstance } from '@/types/unity-webgl'

export type UnityStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface UnityState {
  status: UnityStatus
  progress: number
  errorMessage: string | null
  unityInstance: UnityInstance | null
}

export interface UnityActions {
  setUnityShellState: (
    next: Partial<
      Pick<UnityState, 'status' | 'progress' | 'errorMessage'>
    >,
  ) => void
  setUnityInstance: (next: UnityInstance | null) => void
  resetUnityShellState: () => void
}

export type UnityStore = UnityState & UnityActions

const createInitialUnityState: UnityState = {
  status: 'idle',
  progress: 0,
  errorMessage: null,
  unityInstance: null,
}

export const useUnityStore = create<UnityStore>((set) => ({
  ...createInitialUnityState,
  setUnityShellState(next) {
    set((state) => ({
      status: next.status ?? state.status,
      progress: next.progress ?? state.progress,
      errorMessage: next.errorMessage ?? state.errorMessage,
      unityInstance: state.unityInstance,
    }))
  },
  setUnityInstance(next) {
    set({ unityInstance: next })
  },
  resetUnityShellState() {
    set(createInitialUnityState)
  },
}))
