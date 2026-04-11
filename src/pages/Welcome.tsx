import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import StepsBox from "./components/welcome/StepsBox";
import { WelcomeActionCard } from "./components/welcome/WelcomeActionCard";
import Icon from "@/components/icons/Icon";
import { ImprovedToastContainer } from "@/components/modals/ImprovedToast";
import TwoButtonPopup from "@/components/modals/TwoButtonPopup";
import RibbonOverlay from "@/components/RibbonOverlay";
import type { Step, StepExtra } from "@/types/common";
import { buildLoadingPath } from "@/routes/paths";
import { useUIStore } from "@/stores/uiStore";
import logoImage from "@/assets/logo.png";
import step1Image from "@/assets/step1.png";
import step2Image from "@/assets/step2.png";
import step3Image from "@/assets/step3.png";

const ribbonConfigs = [
  {
    text: "게임을 시작하기 전에 AI처럼 몰입해 연기해보세요.",
    rotate: -7,
    top: "12%",
    speedSec: 72,
    theme: "black" as const,
  },
  {
    text: "대화가 곧 게임의 중심입니다. 서로를 흔들고 설득하며 단서를 모아야 합니다.",
    rotate: 7,
    top: "41%",
    speedSec: 85,
    theme: "white" as const,
  },
  {
    text: "방 안의 단서는 단 하나의 탈출구로 이어집니다. 끝까지 집중하세요.",
    rotate: -3,
    top: "72%",
    speedSec: 78,
    theme: "black" as const,
  },
];

const stepSets: (Step & StepExtra)[][] = [
  [
    {
      icon: <Icon name="HelpCircle" size={48} className="p-3" />,
      title: "AI처럼 연기하기",
      desc: "각자 AI처럼 몰입감 있게 역할을 맡아 연기합니다. 말투, 행동, 반응으로 상대를 속이고 흔들 수 있습니다.",
      iconBgColor: "#0545B1",
      mediaUrl: step1Image,
    },
    {
      icon: <Icon name="Gamepad2" size={48} className="p-3" />,
      title: "대화로 상호작용",
      desc: "게임의 중심은 대화입니다. 채팅으로 단서를 주고받고, 허점을 유도해 상대의 정체를 판단합니다.",
      iconBgColor: "#03C75A",
      mediaUrl: step2Image,
      mediaOffsetY: -10,
    },
    {
      icon: <Icon name="DoorOpen" size={48} className="p-3" />,
      title: "탈출구는 하나",
      desc: "방 안의 탈출구는 오직 하나뿐입니다. 단서와 추론이 맞아떨어질수록 정답에 가까워집니다.",
      iconBgColor: "#EAB308",
      mediaUrl: step3Image,
    },
  ],
];

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

type ToastItem = {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
};

const INVITE_CODE_PATTERN = /^[A-Z0-9]{5}$/;
const NICKNAME_PATTERN = /^[A-Za-z0-9\uAC00-\uD7A3]{2,10}$/;

function createToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeInviteCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

function makeRoomCode() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 5 }, () => {
    const index = Math.floor(Math.random() * characters.length);
    return characters[index];
  }).join("");
}

export default function Welcome() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as WelcomeRouteState | null;

  const nickname = useUIStore((state) => state.nickname);
  const setNickname = useUIStore((state) => state.setNickname);
  const isNicknameConfirmed = useUIStore((state) => state.isNicknameConfirmed);
  const setNicknameConfirmed = useUIStore((state) => state.setNicknameConfirmed);
  const roomCode = useUIStore((state) => state.roomCode);
  const setRoomCode = useUIStore((state) => state.setRoomCode);

  const [isCreateRoomPopupOpen, setIsCreateRoomPopupOpen] = useState(false);
  const [isNicknameConfirmPopupOpen, setIsNicknameConfirmPopupOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const nicknameValidation = useMemo(() => {
    const trimmed = nickname.trim();
    const isValid = NICKNAME_PATTERN.test(trimmed);

    if (!trimmed) {
      return {
        message: "2~10자의 닉네임을 입력해주세요.",
        isValid: false,
      };
    }

    if (!isValid) {
      return {
        message: "영문, 숫자, 한글 2~10자 이내로 입력해주세요.",
        isValid: false,
      };
    }

    return {
      message: "사용 가능한 닉네임입니다.",
      isValid: true,
    };
  }, [nickname]);

  const joinCodeValidation = useMemo(() => {
    const normalized = normalizeInviteCode(roomCode);

    if (!normalized) {
      return {
        normalized,
        isValid: false,
        message: "5자리 영문 대문자와 숫자 조합의 초대 코드를 입력해주세요.",
      };
    }

    if (!INVITE_CODE_PATTERN.test(normalized)) {
      return {
        normalized,
        isValid: false,
        message: "초대 코드는 5자리 영문 대문자와 숫자 조합이어야 합니다.",
      };
    }

    return {
      normalized,
      isValid: true,
      message: "입장 가능한 초대 코드 형식입니다.",
    };
  }, [roomCode]);

  useEffect(() => {
    if (!routeState?.toast) {
      return;
    }

    setToasts((current) => [
      ...current,
      {
        id: createToastId(),
        type: routeState.toast!.type,
        message: routeState.toast!.message,
        duration: routeState.toast!.duration,
      },
    ]);

    navigate(location.pathname, { replace: true });
  }, [location.pathname, navigate, routeState]);

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

  function openNicknameConfirmPopup() {
    if (!nicknameValidation.isValid) {
      return;
    }

    setIsNicknameConfirmPopupOpen(true);
  }

  function confirmNickname() {
    setNickname(nickname.trim());
    setNicknameConfirmed(true);
    setIsNicknameConfirmPopupOpen(false);
  }

  function enterLobby(mode: LobbyEntryMode, code?: string) {
    const nextCode = (code?.trim() || makeRoomCode()).toUpperCase();
    const state: LobbyRouteState = {
      mode,
      inviteCode: nextCode,
    };

    navigate(buildLoadingPath(mode, nextCode), { state });
  }

  function openCreateRoomPopup() {
    if (!isNicknameConfirmed) {
      return;
    }

    setIsCreateRoomPopupOpen(true);
  }

  function handleCreateRoomConfirm() {
    setIsCreateRoomPopupOpen(false);
    enterLobby("create", makeRoomCode());
  }

  return (
    <main className="pointer-events-auto relative h-full w-full p-5">
      {ribbonConfigs.map((config) => (
        <RibbonOverlay
          key={config.text}
          text={config.text}
          rotate={config.rotate}
          top={config.top}
          speedSec={config.speedSec}
          theme={config.theme}
        />
      ))}

      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center">
        <img
          src={logoImage}
          alt="Mimic logo"
          className="mb-8 h-36 w-auto object-contain"
        />

        <div className="mx-auto flex w-full max-w-[90rem] flex-col items-center justify-center gap-5">
          <section className="flex w-full items-center justify-center">
            <div className="grid w-full max-w-[1150px] grid-cols-3 gap-4">
              <WelcomeActionCard
                title="방 만들기"
                description="새로운 방을 만들고 게임을 시작합니다."
                buttonLabel="방 만들기"
                buttonIcon={<Icon name="Sparkles" size={20} color="#ffde59" />}
                buttonIconSize={20}
                disabled={!isNicknameConfirmed}
                onAction={openCreateRoomPopup}
              />

              <WelcomeActionCard
                title="닉네임 설정"
                description="로비에서 사용할 닉네임을 설정합니다."
                buttonLabel={isNicknameConfirmed ? "닉네임 확인완료" : "닉네임 설정"}
                buttonIcon={<Icon name="UserRound" size={20} color="#ffde59" />}
                buttonIconSize={20}
                disabled={isNicknameConfirmed || !nicknameValidation.isValid}
                onAction={openNicknameConfirmPopup}
                footer={
                  <div className="flex flex-col gap-2">
                    <input
                      value={nickname}
                      disabled={isNicknameConfirmed}
                      onChange={(event) => {
                        setNickname(event.target.value.slice(0, 10));
                        setNicknameConfirmed(false);
                      }}
                      placeholder="예: GHOST01"
                      className={`w-full rounded-lg border px-3 py-2 text-base ${
                        isNicknameConfirmed
                          ? "cursor-not-allowed border-white/10 bg-black/25 text-white/55 placeholder:text-white/30"
                          : "border-white/25 bg-black/50 text-white placeholder:text-white/50"
                      }`}
                    />
                    <p
                      className={
                        isNicknameConfirmed
                          ? "text-xs text-[#ffde59]"
                          : nicknameValidation.isValid
                            ? "text-xs text-green-400"
                            : "text-xs text-red-400"
                      }
                    >
                      {isNicknameConfirmed
                        ? "닉네임이 확정되었습니다."
                        : nicknameValidation.message}
                    </p>
                  </div>
                }
              />

              <WelcomeActionCard
                title="방 참가"
                description="코드를 입력하고 기존 방에 참가하세요."
                buttonLabel="참가"
                buttonIcon={<Icon name="LogIn" size={20} color="#ffde59" />}
                buttonIconSize={20}
                disabled={!joinCodeValidation.isValid || !isNicknameConfirmed}
                onAction={() => {
                  if (!isNicknameConfirmed || !joinCodeValidation.isValid) {
                    createToast("error", joinCodeValidation.message);
                    return;
                  }

                  enterLobby("join", joinCodeValidation.normalized);
                }}
                footer={
                  <div className="flex flex-col gap-2">
                    <input
                      value={roomCode}
                      onChange={(event) =>
                        setRoomCode(normalizeInviteCode(event.target.value))
                      }
                      placeholder="예: ABC12"
                      className={`w-full rounded-lg border px-3 py-2 text-base ${
                        joinCodeValidation.isValid
                          ? "border-white/25 bg-black/50 text-white placeholder:text-white/50"
                          : "border-red-400/60 bg-black/50 text-white placeholder:text-white/35"
                      }`}
                    />
                    <p
                      className={
                        joinCodeValidation.isValid
                          ? "text-xs text-green-400"
                          : "text-xs text-red-400"
                      }
                    >
                      {joinCodeValidation.message}
                    </p>
                  </div>
                }
              />
            </div>
          </section>

          <section className="w-full max-w-[1150px]">
            <StepsBox title="Mimic 플레이 흐름" stepSets={stepSets} />
          </section>
        </div>

        <TwoButtonPopup
          isOpen={isCreateRoomPopupOpen}
          title="방 만들기"
          subtitle="방을 만들면 초대 코드를 바로 확인할 수 있습니다."
          cancelText="취소"
          confirmText="생성"
          onCancel={() => setIsCreateRoomPopupOpen(false)}
          onConfirm={handleCreateRoomConfirm}
          onClose={() => setIsCreateRoomPopupOpen(false)}
        />

        <TwoButtonPopup
          isOpen={isNicknameConfirmPopupOpen}
          title={nickname.trim() || "닉네임 설정"}
          subtitle="입력한 닉네임으로 확정하시겠습니까?"
          cancelText="취소"
          confirmText="확인"
          onCancel={() => setIsNicknameConfirmPopupOpen(false)}
          onConfirm={confirmNickname}
          onClose={() => setIsNicknameConfirmPopupOpen(false)}
        />

        <ImprovedToastContainer toasts={toasts} onClose={removeToast} />
      </div>
    </main>
  );
}
