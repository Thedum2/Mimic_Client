import { useEffect, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import Loading from "./Loading";
import { buildLobbyPath } from "@/routes/paths";
import { SessionBridgeAdapter } from "@/session/SessionBridgeAdapter";
import { useSessionStore } from "@/session/SessionManager";
import { useUIStore } from "@/state/uiStore";
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
  const unityStatus = useUIStore((state) => state.unityStatus);
  const unityProgress = useUIStore((state) => state.unityProgress);
  const unityErrorMessage = useUIStore((state) => state.unityErrorMessage);

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
            message: "珥덈? 肄붾뱶??5?먮━ ?곷Ц ?臾몄옄? ?レ옄 議고빀?댁뼱???⑸땲??",
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
    if (mode !== "join" || session.createRoomStatus !== "error") {
      return;
    }

    navigate("/", {
      replace: true,
      state: {
        toast: {
          type: "error",
          message:
            session.createRoomError ??
            "諛⑹씠 ?녾굅??諛⑹씠 媛??李⑥꽌 ?낆옣?????놁뒿?덈떎.",
          duration: 2200,
        },
      } satisfies WelcomeRouteState,
    });
  }, [mode, navigate, session.createRoomError, session.createRoomStatus, normalizedNickname]);

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
          <p className="text-xl font-black">?낆옣 ?뺣낫瑜??뺤씤?????놁뒿?덈떎.</p>
          <p className="mt-2 text-sm text-white/70">
            ?댁쟾 ?붾㈃?쇰줈 ?뚯븘媛 ?ㅼ떆 ?쒕룄??二쇱꽭??
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-40 overflow-hidden bg-black/70">
      <UnityWebGLView className="absolute inset-0 -z-10 opacity-0" />
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
