import { createPortal } from "react-dom";

import {
  modalAccentButtonClassName,
  modalButtonTextStyle,
  modalCardClassName,
  modalOverlayClassName,
  modalSubtitleClassName,
  modalTitleClassName,
} from "@/components/modals/modalTheme";

interface OneButtonPopupProps {
  title: string;
  subtitle?: string;
  buttonText?: string;
  onConfirm?: () => void;
  onClose?: () => void;
  isOpen: boolean;
}

export default function OneButtonPopup({
  title,
  subtitle,
  buttonText = "확인",
  onConfirm,
  onClose,
  isOpen,
}: OneButtonPopupProps) {
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
        <h2 className={modalTitleClassName}>{title}</h2>

        {subtitle ? <p className={modalSubtitleClassName}>{subtitle}</p> : null}

        <button
          type="button"
          onClick={handleConfirm}
          className={`${modalAccentButtonClassName} w-full`}
          style={modalButtonTextStyle}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );

  return createPortal(popupContent, document.body);
}
