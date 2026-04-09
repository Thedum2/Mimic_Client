import type { ReactNode } from "react";

import Icon from "@/components/icons/Icon";

interface WelcomeActionCardProps {
  title: string;
  description: string;
  buttonLabel: string;
  buttonIcon?: ReactNode;
  buttonIconName?: string;
  buttonIconSize?: number | string;
  buttonIconClassName?: string;
  onAction: () => void;
  hideButton?: boolean;
  footer?: ReactNode;
  disabled?: boolean;
}

export function WelcomeActionCard({
  title,
  description,
  buttonLabel,
  buttonIcon,
  buttonIconName,
  buttonIconSize = 20,
  buttonIconClassName,
  onAction,
  hideButton = false,
  footer,
  disabled = false,
}: WelcomeActionCardProps) {
  const iconElement: ReactNode | null =
    buttonIcon ??
    (buttonIconName ? (
      <Icon
        name={buttonIconName}
        size={buttonIconSize}
        className={`shrink-0 ${buttonIconClassName ?? ""}`}
        color="#ffde59"
      />
    ) : null);

  return (
    <section className="relative z-50 flex h-[285px] w-full flex-col overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-b from-neutral-900/75 to-neutral-900/35 p-2 shadow-lg opacity-100">
      <div className="relative z-10 flex h-full flex-col rounded-2xl border border-white/5 bg-black/20 p-4">
        <div className="flex min-h-[170px] flex-1 flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
            {title}
          </p>
          <p className="mt-3 text-lg font-bold text-white">{description}</p>
          <div className="mt-3 min-h-[74px] flex-1">{footer}</div>
        </div>
        {!hideButton ? (
          <button
            type="button"
            onClick={onAction}
            disabled={disabled}
            className={`-mt-1 flex h-14 w-full items-center justify-center gap-1 rounded-xl border-2 border-[#ffde59] bg-black px-4 py-3 text-2xl font-black tracking-tight text-[#ffde59] transition ${
              disabled
                ? "cursor-not-allowed bg-black/50 text-[#ffde59]/40 border-[#ffde59]/40"
                : "hover:scale-[1.02] hover:bg-black/90"
            }`}
            style={{
              fontWeight: 700,
              fontSize: "1.2rem",
            }}
          >
            {iconElement ? (
              <span
                className={`inline-flex h-5 w-5 items-center justify-center text-[#ffde59] ${
                  disabled ? "opacity-40" : "opacity-100"
                }`}
                aria-hidden="true"
              >
                {iconElement}
              </span>
            ) : null}
            {buttonLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}
