import { useState } from "react";

import heroImage from "@/assets/hero.png";
import EmojiOneButtonPopup from "@/components/modals/EmojiOneButtonPopup";
import { ImprovedToastContainer } from "@/components/modals/ImprovedToast";
import ImageTwoButtonPopup from "@/components/modals/ImageTwoButtonPopup";
import OneButtonPopup from "@/components/modals/OneButtonPopup";
import TwoButtonPopup from "@/components/modals/TwoButtonPopup";

type ToastItem = {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
};

export default function ModalTest() {
  const [isOneButtonOpen, setIsOneButtonOpen] = useState(false);
  const [isTwoButtonOpen, setIsTwoButtonOpen] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  function createToast(
    type: ToastItem["type"],
    message: string,
    duration = 1800,
  ) {
    setToasts((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        message,
        duration,
      },
    ]);
  }

  function removeToast(id: string) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  return (
    <main className="min-h-screen px-5 py-10 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="rounded-[32px] border border-white/15 bg-black/45 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-md">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-white/55">
            Modal Test
          </p>
          <h1 className="text-4xl font-black tracking-[-0.04em] text-white">
            팝업 5종 테스트 샘플
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">
            각 버튼을 눌러 현재 프로젝트에서 쓰는 모달과 토스트를 바로
            확인할 수 있습니다. 디자인 통일 상태와 진입 애니메이션을 한 화면에서
            점검하는 용도입니다.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <button
            type="button"
            onClick={() => setIsOneButtonOpen(true)}
            className="rounded-[28px] border border-white/15 bg-white/8 p-6 text-left transition hover:-translate-y-1 hover:bg-white/12"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/48">
              Popup 01
            </p>
            <p className="mt-3 text-2xl font-black tracking-[-0.03em]">
              One Button
            </p>
            <p className="mt-3 text-sm leading-6 text-white/70">
              단일 확인 버튼 팝업 테스트
            </p>
          </button>

          <button
            type="button"
            onClick={() => setIsTwoButtonOpen(true)}
            className="rounded-[28px] border border-white/15 bg-white/8 p-6 text-left transition hover:-translate-y-1 hover:bg-white/12"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/48">
              Popup 02
            </p>
            <p className="mt-3 text-2xl font-black tracking-[-0.03em]">
              Two Button
            </p>
            <p className="mt-3 text-sm leading-6 text-white/70">
              확인과 취소 동작을 함께 확인
            </p>
          </button>

          <button
            type="button"
            onClick={() => setIsEmojiOpen(true)}
            className="rounded-[28px] border border-white/15 bg-white/8 p-6 text-left transition hover:-translate-y-1 hover:bg-white/12"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/48">
              Popup 03
            </p>
            <p className="mt-3 text-2xl font-black tracking-[-0.03em]">
              Emoji
            </p>
            <p className="mt-3 text-sm leading-6 text-white/70">
              감정 표현형 단일 버튼 팝업
            </p>
          </button>

          <button
            type="button"
            onClick={() => setIsImageOpen(true)}
            className="rounded-[28px] border border-white/15 bg-white/8 p-6 text-left transition hover:-translate-y-1 hover:bg-white/12"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/48">
              Popup 04
            </p>
            <p className="mt-3 text-2xl font-black tracking-[-0.03em]">
              Image Two Button
            </p>
            <p className="mt-3 text-sm leading-6 text-white/70">
              이미지 포함형 양쪽 버튼 팝업
            </p>
          </button>

          <button
            type="button"
            onClick={() => createToast("success", "토스트 샘플이 표시됩니다.")}
            className="rounded-[28px] border border-white/15 bg-white/8 p-6 text-left transition hover:-translate-y-1 hover:bg-white/12"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/48">
              Popup 05
            </p>
            <p className="mt-3 text-2xl font-black tracking-[-0.03em]">
              Toast
            </p>
            <p className="mt-3 text-sm leading-6 text-white/70">
              개선된 토스트 알림 확인
            </p>
          </button>
        </section>

        <section className="rounded-[32px] border border-white/15 bg-black/35 p-6">
          <p className="text-sm leading-6 text-white/70">
            테스트 경로: <span className="font-bold text-white">/modal-test</span>
          </p>
        </section>
      </div>

      <OneButtonPopup
        isOpen={isOneButtonOpen}
        title="저장 완료"
        subtitle="단일 확인 버튼 팝업의 디자인과 애니메이션을 확인합니다."
        buttonText="확인"
        onConfirm={() => setIsOneButtonOpen(false)}
        onClose={() => setIsOneButtonOpen(false)}
      />

      <TwoButtonPopup
        isOpen={isTwoButtonOpen}
        title="닉네임 확정 테스트"
        subtitle="두 개 버튼의 간격, 높이, 타이포가 동일하게 보이는지 확인합니다."
        cancelText="아니오"
        confirmText="예"
        onCancel={() => setIsTwoButtonOpen(false)}
        onConfirm={() => setIsTwoButtonOpen(false)}
        onClose={() => setIsTwoButtonOpen(false)}
      />

      <EmojiOneButtonPopup
        isOpen={isEmojiOpen}
        title="축하합니다"
        subtitle="이모지 모달도 같은 카드 스타일을 사용합니다."
        emoji="🎉"
        buttonText="좋아요"
        onConfirm={() => setIsEmojiOpen(false)}
        onClose={() => setIsEmojiOpen(false)}
      />

      <ImageTwoButtonPopup
        isOpen={isImageOpen}
        title="대표 이미지 선택"
        subtitle="이미지 포함 팝업도 동일한 디자인 언어로 정리했습니다."
        image={heroImage}
        cancelText="닫기"
        confirmText="적용"
        onCancel={() => setIsImageOpen(false)}
        onConfirm={() => setIsImageOpen(false)}
        onClose={() => setIsImageOpen(false)}
      />

      <ImprovedToastContainer toasts={toasts} onClose={removeToast} />
    </main>
  );
}
