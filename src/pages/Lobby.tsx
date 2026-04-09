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
import type { ParticipantListItem } from "@/types/domain/participant";
import { UnityWebGLView } from "@/unity/UnityWebGLView";

type LobbyEntryMode = "create" | "join";

interface LobbyRouteState {
  mode: LobbyEntryMode;
  inviteCode: string;
}

type ToastItem = {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
};

const MAX_PARTICIPANTS = 10;

const INITIAL_PARTICIPANTS: ParticipantListItem[] = [
  { id: "player-1", name: "ALPHA" },
  { id: "player-2", name: "MIMIC2" },
  { id: "player-3", name: "BRAVO" },
  { id: "player-4", name: "CHARL" },
  { id: "player-5", name: "DELTA" },
];

function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase();
}

function createToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function Lobby() {
  const location = useLocation();
  const { roomId } = useParams<{ roomId?: string }>();
  const lobbyState = location.state as LobbyRouteState | null;

  const roundDuration = useUIStore((state) => state.roundDuration);
  const setRoundDuration = useUIStore((state) => state.setRoundDuration);

  const sessionManager = SessionBridgeAdapter.getInstance().getManager();
  const session = useSessionStore(sessionManager);

  const [chatDraft, setChatDraft] = useState("");
  const chatScrollHostRef = useRef<HTMLDivElement | null>(null);
  const chatScrollbarRef = useRef<Scrollbar | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const participants = INITIAL_PARTICIPANTS;
  const hostName = session.playerName || participants[0]?.name || "HOST";
  const roomTitle = useMemo(() => `${hostName}님의 방`, [hostName]);
  const defaultInviteCode =
    lobbyState?.inviteCode || roomId || session.activeInviteCode || "BMLJM";
  const activeInviteCode = session.activeInviteCode ?? defaultInviteCode;
  const roomCode = normalizeInviteCode(activeInviteCode);

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
    const code = roomCode.trim();

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
        createToast("success", "룸 코드가 복사되었습니다.");
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
        createToast("success", "룸 코드가 복사되었습니다.");
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
    <main className="h-screen overflow-hidden p-3">
      <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col gap-3 overflow-hidden">
        <header className="flex shrink-0 flex-col gap-3 rounded-[24px] bg-black/35 px-5 py-4 backdrop-blur-md lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-white/45">로비</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">
              {roomTitle}
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-sm font-semibold text-white/80">
              <span>방 코드 :</span>
              <span className="text-red-400">[{roomCode}]</span>
              <button
                type="button"
                onClick={copyRoomCode}
                className="inline-flex items-center rounded-full px-1.5 py-1 transition hover:bg-white/15"
                aria-label="룸 코드 복사"
              >
                <Icon name="Copy" size={16} color="#ffd37d" />
              </button>
            </span>
            <span className="rounded-full bg-cyan-400/12 px-4 py-2 text-sm font-semibold text-cyan-100">
              참가자: {participants.length}/{MAX_PARTICIPANTS}
            </span>
            {!session.runtimeReadyNotified ? (
              <span className="rounded-full bg-yellow-400/12 px-4 py-2 text-sm font-semibold text-yellow-100">
                RuntimeReady 대기 중...
              </span>
            ) : null}
          </div>
        </header>

        <section className="grid min-h-0 flex-1 gap-3 overflow-hidden xl:grid-cols-[minmax(220px,1fr)_minmax(0,3fr)_minmax(220px,1fr)]">
          <aside className="min-h-0 overflow-hidden">
            <ParticipantList
              title="참가자"
              participants={participants}
              capacity={MAX_PARTICIPANTS}
            />
          </aside>

          <section className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden rounded-[24px] bg-black/35 p-0 backdrop-blur-md">
            <div className="min-h-0 flex-1 overflow-hidden rounded-[24px]">
              <div className="relative h-full w-full">
                <UnityWebGLView />
              </div>
            </div>

            <div className="mx-3 mb-3 shrink-0 rounded-[20px] bg-white/[0.04] p-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
                <RoundTimeSetting value={roundDuration} onChange={setRoundDuration} />
                <StartGameButton
                  label="Start Match"
                  onClick={() => {
                    console.log("Start match");
                  }}
                />
              </div>

              {session.createRoomError ? (
                <p className="mt-3 text-xs text-red-300">{session.createRoomError}</p>
              ) : null}
            </div>
          </section>

          <aside className="flex min-h-0 flex-col overflow-hidden rounded-[24px] bg-black/35 backdrop-blur-md">
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
                    placeholder="Send a chat message..."
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
                      disabled={
                        chatDraft.trim().length === 0 ||
                        session.createRoomStatus !== "ready" ||
                        !session.runtimeReadyNotified
                      }
                      className="rounded-full bg-[#ffde59] px-4 py-2 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Send
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-white/55">
                  RuntimeReady 이후에만 채팅 동기화와 후속 로직을 처리합니다.
                </p>
              </div>
            </div>
          </aside>
        </section>
      </div>

      <ImprovedToastContainer toasts={toasts} onClose={removeToast} />
    </main>
  );
}
