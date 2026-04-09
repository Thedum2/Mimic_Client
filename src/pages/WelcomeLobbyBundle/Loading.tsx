import { type ComponentType } from "react";
import * as ReactProgressBar from "@ramonak/react-progress-bar";
import type { ProgressBarProps } from "@ramonak/react-progress-bar";

import logoImage from "@/assets/logo.png";

type ModuleLike = {
  default?: unknown;
  ProgressBar?: unknown;
};

function isReactComponent(value: unknown): value is ComponentType<ProgressBarProps> {
  return typeof value === "function";
}

function FallbackProgressBar(props: ProgressBarProps) {
  const { completed, transitionDuration, transitionTimingFunction } = props;

  const percent =
    typeof completed === "number"
      ? Math.max(0, Math.min(100, completed))
      : Number.isNaN(Number(completed))
        ? 0
        : Math.max(0, Math.min(100, Number(completed)));

  return (
    <div className="w-full overflow-hidden rounded-full bg-white/12">
      <div
        className="h-full bg-[#ffde59] transition-[width]"
        style={{
          width: `${percent}%`,
          height: "10px",
          borderRadius: "9999px",
          transition: `width ${transitionDuration ?? "250ms"} ${transitionTimingFunction ?? "ease-in-out"}`,
        }}
      />
    </div>
  );
}

const ResolvedProgressBar = (() => {
  const moduleLike = ReactProgressBar as ModuleLike;
  const nestedDefault = moduleLike.default;

  if (isReactComponent(moduleLike.default)) {
    return moduleLike.default;
  }

  if (
    nestedDefault &&
    typeof nestedDefault === "object" &&
    isReactComponent((nestedDefault as { default?: unknown }).default)
  ) {
    return (nestedDefault as { default: ComponentType<ProgressBarProps> }).default;
  }

  if (isReactComponent(moduleLike.ProgressBar)) {
    return moduleLike.ProgressBar;
  }

  return FallbackProgressBar;
})();

const ProgressBar = ResolvedProgressBar;

interface LoadingProps {
  unityStatus: "idle" | "loading" | "ready" | "error";
  unityProgress: number;
  unityErrorMessage: string | null;
  createRoomStatus?: "idle" | "requesting" | "ready" | "error";
  runtimeReadyNotified?: boolean;
}

function formatPercent(progress: number) {
  const normalized = Number.isFinite(progress)
    ? Math.min(100, Math.max(0, Math.round(progress * 100)))
    : 0;

  return `${normalized}%`;
}

function getLoadingDescription(
  unityStatus: LoadingProps["unityStatus"],
  createRoomStatus: NonNullable<LoadingProps["createRoomStatus"]>,
  runtimeReadyNotified: boolean,
  unityErrorMessage: string | null,
) {
  if (unityStatus === "error") {
    return unityErrorMessage ?? "로딩 중 문제가 발생했습니다.";
  }

  if (createRoomStatus === "requesting") {
    return "방 입장 요청을 처리하고 있습니다.";
  }

  if (createRoomStatus === "ready" && !runtimeReadyNotified) {
    return "RuntimeReady 이벤트를 기다리고 있습니다.";
  }

  return "게임 리소드를 불러오고 입장 준비를 진행 중입니다.";
}

export default function Loading({
  unityStatus,
  unityProgress,
  unityErrorMessage,
  createRoomStatus = "idle",
  runtimeReadyNotified = false,
}: LoadingProps) {
  return (
    <div className="fixed inset-0 z-50 flex cursor-default select-none items-center justify-center overflow-hidden bg-black/65 backdrop-blur-sm">
      <section className="w-[min(540px,88%)] cursor-default select-none rounded-[22px] border border-white/10 bg-black/70 px-6 py-8">
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
            createRoomStatus,
            runtimeReadyNotified,
            unityErrorMessage,
          )}
        </p>

        <div className="mt-5">
          <ProgressBar
            completed={Math.min(100, Math.max(0, Math.round(unityProgress * 100)))}
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

        <p className="mt-2 text-xs text-white/55">{formatPercent(unityProgress)}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              createRoomStatus === "ready"
                ? "bg-green-500/15 text-green-100"
                : createRoomStatus === "error"
                  ? "bg-red-500/15 text-red-100"
                  : "bg-white/8 text-white/70"
            }`}
          >
            Room ACK: {createRoomStatus === "ready" ? "OK" : createRoomStatus.toUpperCase()}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              runtimeReadyNotified ? "bg-green-500/15 text-green-100" : "bg-white/8 text-white/70"
            }`}
          >
            RuntimeReady: {runtimeReadyNotified ? "OK" : "WAIT"}
          </span>
        </div>

        {unityStatus === "error" ? (
          <p className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {unityErrorMessage ?? "Unity가 준비되지 않았습니다."}
          </p>
        ) : null}
      </section>
    </div>
  );
}
