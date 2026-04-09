export const modalOverlayClassName =
  "fixed inset-0 z-[60] flex animate-[modalOverlayFadeIn_240ms_ease-out] items-center justify-center bg-black/72 backdrop-blur-sm";

export const modalCardClassName =
  "relative mx-4 w-full max-w-md animate-[modalCardFadeIn_320ms_cubic-bezier(0.22,1,0.36,1)] overflow-hidden rounded-[28px] border border-white/15 bg-[linear-gradient(180deg,#ffffff_0%,#f5f7fb_100%)] p-7 text-black shadow-[0_28px_90px_rgba(0,0,0,0.45)]";

export const modalCloseIconClassName =
  "absolute right-4 top-4 cursor-pointer text-gray-400 transition-colors hover:text-black";

export const modalTitleClassName =
  "mb-2 text-center text-[1.9rem] font-extrabold tracking-[-0.03em] text-black";

export const modalSubtitleClassName =
  "mb-6 text-center text-sm leading-6 text-gray-600";

export const modalAccentButtonClassName =
  "h-14 rounded-2xl border border-[#ffde59] bg-[#ffde59] px-5 text-lg font-bold text-black transition-all duration-200 hover:scale-[1.02] hover:border-[#e2c23d] hover:bg-[#f2d242] active:scale-[0.98] shadow-[0_12px_28px_rgba(255,222,89,0.35)]";

export const modalGhostButtonClassName =
  "h-14 rounded-2xl border border-black/10 bg-white px-5 text-lg font-bold text-black transition-all duration-200 hover:scale-[1.02] hover:border-black/20 hover:bg-gray-100 active:scale-[0.98] shadow-[0_10px_22px_rgba(15,23,42,0.08)]";

export const modalDarkButtonClassName =
  "h-14 rounded-2xl border border-black bg-black px-5 text-lg font-bold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-neutral-800 active:scale-[0.98] shadow-[0_14px_30px_rgba(0,0,0,0.28)]";

export const modalButtonTextStyle = {
  fontWeight: 700,
} as const;
