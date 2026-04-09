import { useEffect, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import Loading from "./Loading";
import { buildLobbyPath } from "@/routes/paths";
import { SessionBridgeAdapter } from "@/session/SessionBridgeAdapter";
import { useSessionStore } from "@/session/SessionManager";
import { useUIStore } from "@/stores/uiStore";
import { useUnityStore } from "@/stores/unityStore";
import { UnityWebGLView } from "@/unity/UnityWebGLView";

type LobbyEntryMode = "create" | "join";

interface LobbyRouteState {
  mode: LobbyEntryMode;
  inviteCode: string;
}

interface WelcomeRouteState {
  toast?: {
    type: "success" | "error" | "warning" | "info";
    message: string;
    duration?: number;
  };
}

function LobbyLoadingFallback({
  roomCode,
  nickname,
  createRoomStatus,
  runtimeReadyNotified,
}: {
  roomCode: string
  nickname: string
  createRoomStatus: "idle" | "requesting" | "ready" | "error"
  runtimeReadyNotified: boolean
}) {
  return (
    <section className="absolute inset-3 z-10 rounded-[24px] border border-white/15 bg-black/75 p-5 text-white shadow-2xl backdrop-blur">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black tracking-[-0.04em]">
          Lobby
        </h1>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
          Room: {roomCode}
        </span>
      </div>
      <div className="grid gap-2 text-sm text-white/75">
        <p>Player: {nickname || "Guest"}</p>
        <p>
          RuntimeReady: {runtimeReadyNotified ? "received" : "waiting"}
        </p>
        <p>
          Lobby ACK:{" "}
          {createRoomStatus === "ready"
            ? "OK"
            : createRoomStatus.toUpperCase()}
        </p>
      </div>
    </section>
  );
}

const INVITE_CODE_PATTERN = /^[A-Z0-9]{5}$/;

function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase();
}

export default function LoadingScene() {
  const location = useLocation();
  const { mode: routeMode, roomId: routeRoomId } = useParams<{
    mode?: LobbyEntryMode;
    roomId?: string;
  }>();
  const lobbyState = location.state as LobbyRouteState | null;
  const navigate = useNavigate();

  const nickname = useUIStore((state) => state.nickname);
  const unityStatus = useUnityStore((state) => state.status);
  const unityProgress = useUnityStore((state) => state.progress);
  const unityErrorMessage = useUnityStore((state) => state.errorMessage);

  const sessionManager = SessionBridgeAdapter.getInstance().getManager();
  const session = useSessionStore(sessionManager);

  const mode = useMemo<LobbyEntryMode>(
    () => lobbyState?.mode ?? (routeMode === "join" ? "join" : "create"),
    [lobbyState?.mode, routeMode],
  );

  const inviteCode = useMemo(
    () =>
      normalizeInviteCode(
        lobbyState?.inviteCode ?? routeRoomId ?? session.activeInviteCode ?? "",
      ),
    [lobbyState?.inviteCode, routeRoomId, session.activeInviteCode],
  );
  const normalizedNickname = useMemo(() => nickname.trim(), [nickname]);

  useEffect(() => {
    if (!normalizedNickname) {
      return;
    }

    if (mode === "join" && !INVITE_CODE_PATTERN.test(inviteCode)) {
      navigate("/", {
        replace: true,
        state: {
          toast: {
            type: "error",
            message:
              "초대코드는 영문 대문자/숫자 조합 5자리로 입력해주세요.",
            duration: 1800,
          },
        } satisfies WelcomeRouteState,
      });
    }
  }, [inviteCode, mode, navigate, normalizedNickname]);

  useEffect(() => {
    if (mode === "join" && !INVITE_CODE_PATTERN.test(inviteCode)) {
      return;
    }

    if (!inviteCode || !normalizedNickname) {
      return;
    }

    if (
      session.lobbyEntryMode === mode &&
      session.activeInviteCode === inviteCode &&
      session.playerName === normalizedNickname
    ) {
      return;
    }

    if (mode === "join") {
      sessionManager.stageJoinRoom({
        inviteCode,
        playerName: normalizedNickname,
      });
      return;
    }

    sessionManager.stageCreateRoom({
      inviteCode,
      playerName: normalizedNickname,
    });
  }, [
    inviteCode,
    mode,
    normalizedNickname,
    session.lobbyEntryMode,
    session.activeInviteCode,
    session.playerName,
    sessionManager,
  ]);

  useEffect(() => {
    if (mode === "join" && !INVITE_CODE_PATTERN.test(inviteCode)) {
      return;
    }

    if (!session.runtimeReadyNotified || !inviteCode || !normalizedNickname) {
      return;
    }

    if (session.createRoomStatus !== "idle") {
      return;
    }

    if (
      session.lobbyEntryMode !== mode ||
      session.activeInviteCode !== inviteCode ||
      session.playerName !== normalizedNickname
    ) {
      if (mode === "join") {
        sessionManager.stageJoinRoom({
          inviteCode,
          playerName: normalizedNickname,
        });
      } else {
        sessionManager.stageCreateRoom({
          inviteCode,
          playerName: normalizedNickname,
        });
      }

      return;
    }

    console.log("[REACT][interface]", `TRIGGER R2U REQ MatchManager_${mode === "join" ? "JoinRoomByInviteCode" : "CreateRoom"}`, {
      mode,
      inviteCode,
      playerName: normalizedNickname,
    });

    void sessionManager.requestMatchRoom();
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
  ]);

  useEffect(() => {
    if (session.createRoomStatus !== "error") {
      return;
    }

    navigate("/", {
      replace: true,
      state: {
        toast: {
          type: "error",
          message:
            session.createRoomError ??
            "요청이 실패했습니다. 잠시 후 다시 시도해 주세요.",
          duration: 2200,
        },
      } satisfies WelcomeRouteState,
    });
  }, [navigate, session.createRoomError, session.createRoomStatus]);

  useEffect(() => {
    if (session.createRoomStatus !== "ready" || !session.runtimeReadyNotified) {
      return;
    }

    const nextCode = session.activeInviteCode ?? inviteCode;

    if (!nextCode) {
      return;
    }

    navigate(buildLobbyPath(nextCode), {
      state: {
        mode,
        inviteCode: nextCode,
      } satisfies LobbyRouteState,
    });
  }, [
    session.createRoomStatus,
    session.runtimeReadyNotified,
    session.activeInviteCode,
    inviteCode,
    mode,
    navigate,
  ]);

  if (!inviteCode || !normalizedNickname) {
    return (
      <main className="fixed inset-0 z-40 overflow-hidden bg-black p-6 text-white">
        <section className="w-full max-w-lg rounded-[24px] border border-white/20 bg-black/70 p-6 text-center">
          <p className="text-xl font-black">입장 정보가 올바르지 않습니다.</p>
          <p className="mt-2 text-sm text-white/70">
            새로고침 후 다시 시도하거나 웰컴 화면으로 돌아가 주세요.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-40 overflow-hidden bg-black/70">
      <UnityWebGLView className="absolute inset-0 -z-10 opacity-0" />
      {unityStatus === "error" ? (
        <LobbyLoadingFallback
          roomCode={inviteCode}
          nickname={normalizedNickname}
          createRoomStatus={session.createRoomStatus}
          runtimeReadyNotified={session.runtimeReadyNotified}
        />
      ) : null}
      <div className="flex h-full items-center justify-center p-4">
        <Loading
          unityStatus={unityStatus}
          unityProgress={unityProgress}
          unityErrorMessage={unityErrorMessage}
          createRoomStatus={session.createRoomStatus}
          runtimeReadyNotified={session.runtimeReadyNotified}
        />
      </div>
    </main>
  );
}
