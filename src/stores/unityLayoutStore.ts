import { create } from 'zustand'

type UnityLayoutMode = 'hidden' | 'loading' | 'lobby'

interface LobbyRect {
  x: number
  y: number
  width: number
  height: number
}

interface UnityLayoutState {
  mode: UnityLayoutMode
  lobbyRect: LobbyRect | null
}

interface UnityLayoutActions {
  setMode: (mode: UnityLayoutMode) => void
  setLobbyRect: (rect: LobbyRect | null) => void
}

export type UnityLayoutStore = UnityLayoutState & UnityLayoutActions

const createInitialState: UnityLayoutState = {
  mode: 'loading',
  lobbyRect: null,
}

export const useUnityLayoutStore = create<UnityLayoutStore>((set) => ({
  ...createInitialState,
  setMode(mode) {
    set({ mode })
  },
  setLobbyRect(lobbyRect) {
    set({ lobbyRect })
  },
}))
