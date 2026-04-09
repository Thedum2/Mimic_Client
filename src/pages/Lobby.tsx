import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import Scrollbar from "smooth-scrollbar";

import { ParticipantList } from "./components/lobby/ParticipantList";
import { RoundTimeSetting } from "./components/lobby/RoundTimeSetting";
import { StartGameButton } from "./components/lobby/StartGameButton";
import Icon from "@/components/icons/Icon";
import { ImprovedToastContainer } from "@/components/modals/ImprovedToast";
import { SessionBridgeAdapter } from "@/session/SessionBridgeAdapter";
import { useSessionStore } from "@/session/SessionManager";
import { useUIStore } from "@/stores/uiStore";
import { useUnityLayoutStore } from "@/stores/unityLayoutStore";
import type { ParticipantListItem } from "@/types/domain/participant";

type ToastItem = {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
};

const MAX_PARTICIPANTS = 10;

function createToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function Lobby() {
  const location = useLocation();
  const { roomId } = useParams<{ roomId?: string }>();
  const routeState = location.state as { inviteCode?: string } | null;
  const inviteCode = (routeState?.inviteCode ?? roomId ?? "").trim().toUpperCase();

  const roundDuration = useUIStore((state) => state.roundDuration);
  const setRoundDuration = useUIStore((state) => state.setRoundDuration);
  const nickname = useUIStore((state) => state.nickname).trim();

  const sessionManager = SessionBridgeAdapter.getInstance().getManager();
  const session = useSessionStore(sessionManager);

  const [chatDraft, setChatDraft] = useState("");
  const chatScrollHostRef = useRef<HTMLDivElement | null>(null);
  const chatScrollbarRef = useRef<Scrollbar | null>(null);
  const lobbyRuntimeHostRef = useRef<HTMLDivElement | null>(null);
  const setUnityMode = useUnityLayoutStore((state) => state.setMode);
  const setLobbyRect = useUnityLayoutStore((state) => state.setLobbyRect);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const measureLobbyArea = () => {
      const node = lobbyRuntimeHostRef.current;
      if (!node) {
        return;
      }

      const rect = node.getBoundingClientRect();
      setLobbyRect({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      });
    };

    setUnityMode("lobby");
    const frame = requestAnimationFrame(measureLobbyArea);
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measureLobbyArea);

    if (lobbyRuntimeHostRef.current && observer) {
      observer.observe(lobbyRuntimeHostRef.current);
    }

    window.addEventListener("resize", measureLobbyArea);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", measureLobbyArea);
      setLobbyRect(null);
      setUnityMode("hidden");
    };
  }, [setLobbyRect, setUnityMode]);

  const participants = useMemo<ParticipantListItem[]>(() => {
    if (session.participants.length > 0) {
      return session.participants.map((participant) => ({
        id: participant.playerId,
        name: participant.playerNickname || participant.playerId,
        badgeLabel: participant.isHost ? "방장" : undefined,
      }));
    }

    if (nickname) {
      return [
        {
          id: session.playerId,
          name: nickname,
          badgeLabel: "방장",
        },
      ];
    }

    return [];
  }, [nickname, session.participants, session.playerId]);

  const hostName = useMemo(() => {
    const host = session.participants.find((participant) => participant.isHost);
    return host?.playerNickname || host?.playerId || participants[0]?.name || "방장";
  }, [participants, session.participants]);

  const roomTitle = useMemo(() => `${hostName}의 방`, [hostName]);

  useEffect(() => {
    const scrollHost = chatScrollHostRef.current;
    if (!scrollHost) {
      return;
    }

    const scrollbar = Scrollbar.init(scrollHost, {
      damping: 0.06,
      alwaysShowTracks: false,
      thumbMinSize: 36,
      renderByPixels: false,
    });

    chatScrollbarRef.current = scrollbar;

    return () => {
      chatScrollbarRef.current?.destroy();
      chatScrollbarRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scrollbar = chatScrollbarRef.current;
    if (!scrollbar) {
      return;
    }

    requestAnimationFrame(() => {
      scrollbar.scrollTo(0, scrollbar.limit.y, 420);
    });
  }, [session.chatMessages]);

  function createToast(type: ToastItem["type"], message: string, duration = 1500) {
    setToasts((current) => [
      ...current,
      {
        id: createToastId(),
        type,
        message,
        duration,
      },
    ]);
  }

  function removeToast(id: string) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  async function copyRoomCode() {
    const code = inviteCode;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
        createToast("success", "방 코드가 복사되었습니다.");
        return;
      }

      throw new Error("clipboard-unavailable");
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = code;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (ok) {
        createToast("success", "방 코드가 복사되었습니다.");
      } else {
        createToast("error", "복사에 실패했습니다.");
      }
    }
  }

  function handleSendMessage() {
    const trimmedDraft = chatDraft.trim();
    if (!trimmedDraft) {
      return;
    }

    void sessionManager.submitLobbyMessage(trimmedDraft);
    setChatDraft("");
  }

  return (
    <main className="relative h-screen overflow-hidden p-3">
      <div className="pointer-events-none mx-auto flex h-full w-full max-w-[1600px] flex-col gap-3 overflow-hidden">
        <header className="pointer-events-auto flex shrink-0 flex-col gap-3 rounded-[24px] bg-black/35 px-5 py-4 backdrop-blur-md lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-white/45">로비</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">
              {roomTitle}
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-sm font-semibold text-white/80">
              <span>방 코드:</span>
              <span className="text-red-400">[{inviteCode}]</span>
              <button
                type="button"
                onClick={copyRoomCode}
                className="inline-flex items-center rounded-full px-1.5 py-1 transition hover:bg-white/15"
                aria-label="방 코드 복사"
              >
                <Icon name="Copy" size={16} color="#ffd37d" />
              </button>
            </span>
            <span className="rounded-full bg-cyan-400/12 px-4 py-2 text-sm font-semibold text-cyan-100">
              참가자 {participants.length}/{MAX_PARTICIPANTS}
            </span>
          </div>
        </header>

        <section className="pointer-events-none grid min-h-0 flex-1 gap-3 overflow-hidden xl:grid-cols-[minmax(220px,1fr)_minmax(0,3fr)_minmax(220px,1fr)]">
          <aside className="pointer-events-auto min-h-0 overflow-hidden">
            <ParticipantList
              title="참가자"
              participants={participants}
              capacity={MAX_PARTICIPANTS}
            />
          </aside>

          <section className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden rounded-[24px] border border-white/12 bg-transparent p-0 pointer-events-none">
            <div
              ref={lobbyRuntimeHostRef}
              className="pointer-events-none relative min-h-[360px] flex-1 overflow-hidden rounded-[24px] p-0"
            >
            </div>

            <div className="pointer-events-auto mx-3 mb-3 shrink-0 rounded-[20px] bg-white/[0.04] p-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
                <RoundTimeSetting value={roundDuration} onChange={setRoundDuration} />
                <StartGameButton
                  label="매치 시작"
                  onClick={() => {
                    console.log("매치 시작");
                  }}
                />
              </div>

              {session.createRoomError ? (
                <p className="mt-3 text-xs text-red-300">{session.createRoomError}</p>
              ) : null}
            </div>
          </section>

          <aside className="pointer-events-auto flex min-h-0 flex-col overflow-hidden rounded-[24px] bg-black/35 backdrop-blur-md">
            <div className="flex min-h-0 flex-1 flex-col">
              <div
                ref={chatScrollHostRef}
                className="chat-scroll-host min-h-0 flex-1 px-4 py-4"
              >
                <div className="space-y-3 pr-2">
                  {session.chatMessages.map((message) => (
                    <article
                      key={message.id}
                      className={`rounded-[20px] px-4 py-3 ${
                        message.kind === "system"
                          ? "bg-yellow-400/10 text-yellow-50"
                          : "bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <strong className="text-sm font-bold text-white">{message.author}</strong>
                        <span className="text-xs text-white/45">{message.createdAt}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/78">{message.text}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="px-4 py-4">
                <div className="rounded-[20px] bg-white/[0.04] p-3">
                  <textarea
                    value={chatDraft}
                    onChange={(event) => setChatDraft(event.target.value)}
                    placeholder="채팅 메시지를 입력하세요..."
                    rows={3}
                    className="w-full resize-none bg-transparent text-sm leading-6 text-white placeholder:text-white/35"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <div className="mt-3 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={chatDraft.trim().length === 0}
                      className="rounded-full bg-[#ffde59] px-4 py-2 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      전송
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>

      <div className="pointer-events-auto">
        <ImprovedToastContainer toasts={toasts} onClose={removeToast} />
      </div>
    </main>
  );
}
