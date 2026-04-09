import { createPortal } from "react-dom";

import Icon from "@/components/icons/Icon";
import {
  modalButtonTextStyle,
  modalCardClassName,
  modalCloseIconClassName,
  modalDarkButtonClassName,
  modalOverlayClassName,
  modalSubtitleClassName,
  modalTitleClassName,
} from "@/components/modals/modalTheme";

interface EmojiOneButtonPopupProps {
  title: string;
  subtitle?: string;
  emoji?: string;
  buttonText?: string;
  onConfirm?: () => void;
  onClose?: () => void;
  isOpen: boolean;
}

export default function EmojiOneButtonPopup({
  title,
  subtitle,
  emoji = "🎉",
  buttonText = "확인",
  onConfirm,
  onClose,
  isOpen,
}: EmojiOneButtonPopupProps) {
  if (!isOpen) return null;

  function handleConfirm() {
    onConfirm?.();
    onClose?.();
  }

  const popupContent = (
    <div className={modalOverlayClassName}>
      <div
        className={modalCardClassName}
        onClick={(e) => e.stopPropagation()}
      >
        {onClose ? (
          <Icon
            name="X"
            size={24}
            onClick={onClose}
            className={modalCloseIconClassName}
          />
        ) : null}

        <div className="mb-6 text-center text-7xl drop-shadow-[0_8px_18px_rgba(0,0,0,0.12)]">{emoji}</div>

        <h2 className={modalTitleClassName}>{title}</h2>

        {subtitle ? <p className={modalSubtitleClassName}>{subtitle}</p> : null}

        <button
          type="button"
          onClick={handleConfirm}
          className={`${modalDarkButtonClassName} w-full`}
          style={modalButtonTextStyle}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );

  return createPortal(popupContent, document.body);
}
