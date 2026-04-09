import { createPortal } from "react-dom";

import Icon from "@/components/icons/Icon";
import {
  modalAccentButtonClassName,
  modalButtonTextStyle,
  modalCardClassName,
  modalCloseIconClassName,
  modalGhostButtonClassName,
  modalOverlayClassName,
  modalSubtitleClassName,
  modalTitleClassName,
} from "@/components/modals/modalTheme";

interface TwoButtonPopupProps {
  title: string;
  subtitle?: string;
  cancelText?: string;
  confirmText?: string;
  onCancel?: () => void;
  onConfirm?: () => void;
  onClose?: () => void;
  isOpen: boolean;
}

export default function TwoButtonPopup({
  title,
  subtitle,
  cancelText = "취소",
  confirmText = "확인",
  onCancel,
  onConfirm,
  onClose,
  isOpen,
}: TwoButtonPopupProps) {
  if (!isOpen) return null;

  function handleCancel() {
    onCancel?.();
    onClose?.();
  }

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

        <h2 className={modalTitleClassName}>{title}</h2>

        {subtitle ? (
          <p className={modalSubtitleClassName}>{subtitle}</p>
        ) : null}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className={`${modalGhostButtonClassName} flex-1`}
            style={modalButtonTextStyle}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`${modalAccentButtonClassName} flex-1`}
            style={modalButtonTextStyle}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(popupContent, document.body);
}
