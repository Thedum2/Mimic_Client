import { create } from 'zustand'

export type UnityStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface UIState {
  isBackgroundVisible: boolean
  activeCharacterIndex: number
  nickname: string
  isNicknameConfirmed: boolean
  roomCode: string
  roundDuration: number
  stepsCurrentIndex: number
  unityProgress: number
  unityStatus: UnityStatus
  unityErrorMessage: string | null
}

export interface UIActions {
  setBackgroundVisible: (next: boolean) => void
  setActiveCharacterIndex: (next: number) => void
  setNickname: (next: string) => void
  setNicknameConfirmed: (next: boolean) => void
  setRoomCode: (next: string) => void
  setRoundDuration: (next: number) => void
  setStepsCurrentIndex: (next: number) => void
  setUnityShellState: (next: Partial<Pick<UIState, 'unityProgress' | 'unityStatus' | 'unityErrorMessage'>>) => void
}

export type UIStore = UIState & UIActions

const createInitialState: UIState = {
  isBackgroundVisible: true,
  activeCharacterIndex: 0,
  nickname: '',
  isNicknameConfirmed: false,
  roomCode: '',
  roundDuration: 45,
  stepsCurrentIndex: 0,
  unityProgress: 0,
  unityStatus: 'idle',
  unityErrorMessage: null,
}

export const useUIStore = create<UIStore>((set) => ({
  ...createInitialState,
  setBackgroundVisible(next) {
    set({ isBackgroundVisible: next })
  },
  setActiveCharacterIndex(next) {
    set({ activeCharacterIndex: next })
  },
  setNickname(next) {
    set({ nickname: next })
  },
  setNicknameConfirmed(next) {
    set({ isNicknameConfirmed: next })
  },
  setRoomCode(next) {
    set({ roomCode: next })
  },
  setRoundDuration(next) {
    set({ roundDuration: Math.min(360, Math.max(10, next)) })
  },
  setStepsCurrentIndex(next) {
    set({ stepsCurrentIndex: next })
  },
  setUnityShellState(next) {
    set((state) => ({
      ...next,
      unityProgress: next.unityProgress ?? state.unityProgress,
      unityStatus: next.unityStatus ?? state.unityStatus,
      unityErrorMessage: next.unityErrorMessage ?? state.unityErrorMessage,
    }))
  },
}))
