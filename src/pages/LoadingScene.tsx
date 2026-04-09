import { useEffect, useMemo, type ComponentType } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import * as ReactProgressBar from '@ramonak/react-progress-bar'
import type { ProgressBarProps } from '@ramonak/react-progress-bar'

import { buildLobbyPath } from '@/routes/paths'
import logoImage from '@/assets/logo.png'
import { SessionBridgeAdapter } from '@/session/SessionBridgeAdapter'
import { useSessionStore } from '@/session/SessionManager'
import { useUIStore } from '@/stores/uiStore'
import { useUnityStore } from '@/stores/unityStore'
import { useUnityLayoutStore } from '@/stores/unityLayoutStore'

type LobbyEntryMode = 'create' | 'join'

interface LobbyRouteState {
  mode: LobbyEntryMode
  inviteCode: string
}

interface WelcomeRouteState {
  toast?: {
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
    duration?: number
  }
}

type LoadingUnityStatus = 'idle' | 'loading' | 'ready' | 'error'

const INVITE_CODE_PATTERN = /^[A-Z0-9]{5}$/

type ModuleLike = {
  default?: unknown
  ProgressBar?: unknown
}

function isReactComponent(value: unknown): value is ComponentType<ProgressBarProps> {
  return typeof value === 'function'
}

function FallbackProgressBar(props: ProgressBarProps) {
  const { completed, transitionDuration, transitionTimingFunction } = props
  const percent =
    typeof completed === 'number'
      ? Math.max(0, Math.min(100, completed))
      : Number.isNaN(Number(completed))
        ? 0
        : Math.max(0, Math.min(100, Number(completed)))

  return (
    <div className="w-full overflow-hidden rounded-full bg-white/12">
      <div
        className="h-full bg-[#ffde59] transition-[width]"
        style={{
          width: `${percent}%`,
          height: '10px',
          borderRadius: '9999px',
          transition: `width ${transitionDuration ?? '250ms'} ${transitionTimingFunction ?? 'ease-in-out'}`,
        }}
      />
    </div>
  )
}

const ResolvedProgressBar = (() => {
  const moduleLike = ReactProgressBar as ModuleLike

  if (isReactComponent(moduleLike.default)) {
    return moduleLike.default
  }

  if (
    moduleLike.default &&
    typeof moduleLike.default === 'object' &&
    isReactComponent((moduleLike.default as { default?: unknown }).default)
  ) {
    return (moduleLike.default as { default: ComponentType<ProgressBarProps> }).default
  }

  if (isReactComponent(moduleLike.ProgressBar)) {
    return moduleLike.ProgressBar
  }

  return FallbackProgressBar
})()

const ProgressBar = ResolvedProgressBar

function formatPercent(progress: number) {
  const normalized = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0
  return `${Math.round(normalized * 100)}%`
}

function getCompositeLoadingProgress(
  unityStatus: LoadingUnityStatus,
  unityProgress: number,
  createRoomStatus: 'idle' | 'requesting' | 'ready' | 'error',
  runtimeReadyNotified: boolean,
) {
  const normalizedUnityProgress = Number.isFinite(unityProgress)
    ? Math.min(1, Math.max(0, unityProgress))
    : 0
  const unityPhase = normalizedUnityProgress * 0.7
  const runtimePhase = runtimeReadyNotified ? 0.15 : 0
  const requestPhase =
    createRoomStatus === 'ready'
      ? 0.15
      : createRoomStatus === 'requesting'
        ? 0.08
        : 0

  if (
    unityStatus === 'ready' &&
    runtimeReadyNotified &&
    createRoomStatus === 'ready'
  ) {
    return 1
  }

  return Math.min(0.98, unityPhase + runtimePhase + requestPhase)
}

function getLoadingDescription(
  unityStatus: LoadingUnityStatus,
  createRoomStatus: 'idle' | 'requesting' | 'ready' | 'error',
  runtimeReadyNotified: boolean,
  unityErrorMessage: string | null,
) {
  if (unityStatus === 'error') {
    return unityErrorMessage ?? '로딩 중 문제가 발생했습니다.'
  }

  if (createRoomStatus === 'requesting') {
    return '방 입장 요청을 처리하고 있습니다.'
  }

  if (createRoomStatus === 'ready' && !runtimeReadyNotified) {
    return 'RuntimeReady 이벤트를 기다리고 있습니다.'
  }

  return '게임 리소스를 불러오고 입장 준비를 진행 중입니다.'
}

export default function LoadingScene() {
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams<{ mode?: LobbyEntryMode; roomId?: string }>()
  const lobbyState = location.state as LobbyRouteState | null

  const nickname = useUIStore((state) => state.nickname)
  const normalizedNickname = useMemo(() => nickname.trim(), [nickname])
  const setUnityMode = useUnityLayoutStore((state) => state.setMode)

  const sessionManager = SessionBridgeAdapter.getInstance().getManager()
  const session = useSessionStore(sessionManager)

  const mode = useMemo<LobbyEntryMode>(
    () => lobbyState?.mode ?? (params.mode === 'join' ? 'join' : 'create'),
    [lobbyState?.mode, params.mode],
  )
  const inviteCode = useMemo(
    () =>
      ((lobbyState?.inviteCode ?? params.roomId ?? session.activeInviteCode ?? '').trim() as string)
        .toUpperCase(),
    [lobbyState?.inviteCode, params.roomId, session.activeInviteCode],
  )

  const unityStatus = useUnityStore((state) => state.status)
  const unityProgress = useUnityStore((state) => state.progress)
  const unityErrorMessage = useUnityStore((state) => state.errorMessage)
  const loadingProgress = useMemo(
    () =>
      getCompositeLoadingProgress(
        unityStatus,
        unityProgress,
        session.createRoomStatus,
        session.runtimeReadyNotified,
      ),
    [
      unityStatus,
      unityProgress,
      session.createRoomStatus,
      session.runtimeReadyNotified,
    ],
  )

  useEffect(() => {
    setUnityMode("loading")

    return () => {
      setUnityMode("hidden")
    }
  }, [setUnityMode])

  useEffect(() => {
    if (mode === 'join' && !INVITE_CODE_PATTERN.test(inviteCode)) {
      navigate('/', {
        replace: true,
        state: {
          toast: {
            type: 'error',
            message: '입장 코드는 영문 대문자/숫자 5자리여야 합니다.',
            duration: 1800,
          },
        } satisfies WelcomeRouteState,
      })
    }
  }, [inviteCode, mode, navigate])

  useEffect(() => {
    if (mode === 'join' && !INVITE_CODE_PATTERN.test(inviteCode)) {
      return
    }

    if (!inviteCode || !normalizedNickname) {
      return
    }

    if (session.createRoomRequested || session.createRoomStatus !== 'idle') {
      return
    }

    if (
      session.lobbyEntryMode === mode &&
      session.activeInviteCode === inviteCode &&
      session.playerName === normalizedNickname
    ) {
      return
    }

    if (mode === 'join') {
      sessionManager.stageJoinRoom({ inviteCode, playerName: normalizedNickname })
      return
    }

    sessionManager.stageCreateRoom({ inviteCode, playerName: normalizedNickname })
  }, [
    inviteCode,
    mode,
    normalizedNickname,
    session.createRoomRequested,
    session.createRoomStatus,
    session.lobbyEntryMode,
    session.activeInviteCode,
    session.playerName,
    sessionManager,
  ])

  useEffect(() => {
    if (mode === 'join' && !INVITE_CODE_PATTERN.test(inviteCode)) {
      return
    }

    if (!session.runtimeReadyNotified || !inviteCode || !normalizedNickname) {
      return
    }

    if (session.createRoomStatus !== 'idle') {
      return
    }

    if (
      session.lobbyEntryMode !== mode ||
      session.activeInviteCode !== inviteCode ||
      session.playerName !== normalizedNickname
    ) {
      if (mode === 'join') {
        sessionManager.stageJoinRoom({ inviteCode, playerName: normalizedNickname })
      } else {
        sessionManager.stageCreateRoom({ inviteCode, playerName: normalizedNickname })
      }
      return
    }

    void sessionManager.requestMatchRoom()
  }, [
    inviteCode,
    mode,
    normalizedNickname,
    session.lobbyEntryMode,
    session.activeInviteCode,
    session.playerName,
    session.runtimeReadyNotified,
    session.createRoomStatus,
    sessionManager,
  ])

  useEffect(() => {
    if (session.createRoomStatus !== 'error') {
      return
    }

    navigate('/', {
      replace: true,
      state: {
        toast: {
          type: 'error',
          message:
            session.createRoomError ??
            '방 입장 처리 중 오류가 발생했습니다.',
          duration: 2200,
        },
      } satisfies WelcomeRouteState,
    })
  }, [session.createRoomStatus, session.createRoomError, navigate])

  useEffect(() => {
    if (session.createRoomStatus !== 'ready') {
      return
    }

    const nextCode = session.activeInviteCode ?? inviteCode
    if (!nextCode) {
      return
    }

    navigate(buildLobbyPath(nextCode), {
      state: {
        mode,
        inviteCode: nextCode,
      } satisfies LobbyRouteState,
    })
  }, [
    mode,
    inviteCode,
    session.createRoomStatus,
    session.activeInviteCode,
    navigate,
  ])

  if (!inviteCode || !normalizedNickname) {
    return (
      <main className="pointer-events-auto fixed inset-0 z-40 overflow-hidden bg-black p-6 text-white">
        <section className="w-full max-w-lg rounded-[24px] border border-white/20 bg-black/70 p-6 text-center">
          <p className="text-xl font-black">입력된 정보가 부족합니다.</p>
          <p className="mt-2 text-sm text-white/70">
            방 코드와 닉네임을 확인하고 다시 시작해주세요.
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="pointer-events-auto fixed inset-0 z-40 overflow-hidden bg-black">
      <div className="flex h-full items-center justify-center p-4">
        <section className="w-[min(540px,88%)] rounded-[22px] border border-white/10 bg-black px-6 py-8">
          <div className="mb-5 flex justify-center">
            <img
              src={logoImage}
              alt="Mimic logo"
              className="h-20 w-auto object-contain"
              loading="eager"
            />
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
            Unity Loading
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-[-0.03em] text-white">
            로비 입장을 준비 중입니다
          </h2>

          <p className="mt-3 text-sm leading-6 text-white/70">
            {getLoadingDescription(
              unityStatus,
              session.createRoomStatus,
              session.runtimeReadyNotified,
              unityErrorMessage,
            )}
          </p>

          <div className="mt-5">
            <ProgressBar
              completed={Math.min(100, Math.max(0, Math.round(loadingProgress * 100)))}
              maxCompleted={100}
              isLabelVisible={false}
              animateOnRender={false}
              bgColor="#ffde59"
              baseBgColor="rgba(255, 255, 255, 0.12)"
              height="10px"
              borderRadius="9999px"
              transitionDuration="250ms"
              transitionTimingFunction="ease-in-out"
              className="w-full"
            />
          </div>

          <p className="mt-2 text-xs text-white/55">{formatPercent(loadingProgress)}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                session.createRoomStatus === 'ready'
                  ? 'bg-green-500/15 text-green-100'
                  : session.createRoomStatus === 'error'
                    ? 'bg-red-500/15 text-red-100'
                    : 'bg-white/8 text-white/70'
              }`}
            >
              Room ACK: {session.createRoomStatus === 'ready' ? 'OK' : session.createRoomStatus.toUpperCase()}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                session.runtimeReadyNotified
                  ? 'bg-green-500/15 text-green-100'
                  : 'bg-white/8 text-white/70'
              }`}
            >
              RuntimeReady: {session.runtimeReadyNotified ? 'OK' : 'WAIT'}
            </span>
          </div>

          {unityStatus === 'error' ? (
            <p className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {unityErrorMessage ?? 'Unity가 준비되지 않았습니다.'}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  )
}
