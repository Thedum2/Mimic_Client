import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import Icon from "@/components/icons/Icon";

export type ImprovedToastType = "success" | "error" | "warning" | "info";

interface ImprovedToastProps {
  id: string;
  type: ImprovedToastType;
  message: string;
  duration?: number;
  index: number;
  onClose: (id: string) => void;
}

export function ImprovedToast({
  id,
  type,
  message,
  duration = 1000,
  index: _index,
  onClose,
}: ImprovedToastProps) {
  const [isClosing, setIsClosing] = useState(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const closeTimer = setTimeout(() => {
      setIsClosing(true);
    }, duration);

    const removeTimer = setTimeout(() => {
      onCloseRef.current(id);
    }, duration + 300);

    return () => {
      clearTimeout(closeTimer);
      clearTimeout(removeTimer);
    };
  }, [duration, id]);

  function getToastStyles() {
    switch (type) {
      case "success":
        return "bg-white border-2 border-green-500 shadow-[0_8px_32px_rgba(34,197,94,0.4)]";
      case "error":
        return "bg-white border-2 border-red-500 shadow-[0_8px_32px_rgba(239,68,68,0.4)]";
      case "warning":
        return "bg-white border-2 border-yellow-500 shadow-[0_8px_32px_rgba(250,204,21,0.4)]";
      case "info":
        return "bg-white border-2 border-blue-500 shadow-[0_8px_32px_rgba(59,130,246,0.4)]";
    }
  }

  function getIconColor() {
    switch (type) {
      case "success":
        return "bg-green-50 text-green-500";
      case "error":
        return "bg-red-50 text-red-500";
      case "warning":
        return "bg-yellow-50 text-yellow-500";
      case "info":
        return "bg-blue-50 text-blue-500";
    }
  }

  function getIconName() {
    switch (type) {
      case "success":
        return "Check";
      case "error":
        return "X";
      case "warning":
        return "AlertTriangle";
      case "info":
        return "Info";
    }
  }

  function getProgressBarColor() {
    switch (type) {
      case "success":
        return "bg-green-500";
      case "error":
        return "bg-red-500";
      case "warning":
        return "bg-yellow-500";
      case "info":
        return "bg-blue-500";
    }
  }

  return (
    <div
      className="pointer-events-none overflow-hidden transition-all duration-300 ease-out"
      style={{
        maxHeight: isClosing ? "0" : "120px",
        marginBottom: isClosing ? "0" : "12px",
        opacity: isClosing ? "0" : "1",
      }}
    >
      <div
        className={`relative min-w-[300px] max-w-[400px] transform overflow-hidden rounded-xl ${isClosing ? "" : "animate-[toastFadeIn_280ms_cubic-bezier(0.22,1,0.36,1)]"} ${getToastStyles()}`}
      >
        <div className="flex items-center gap-3 p-3">
          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${getIconColor()}`}>
            <Icon name={getIconName()} size={20} />
          </div>

          <p className="flex-1 text-sm font-semibold text-black">{message}</p>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-xl bg-gray-200/30">
          <div
            className={`h-full ${getProgressBarColor()} transition-all ease-linear`}
            style={{
              width: isClosing ? "0%" : "100%",
              transitionDuration: isClosing ? "0ms" : `${duration}ms`,
              animation: isClosing
                ? "none"
                : `progress-shrink ${duration}ms linear forwards`,
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes progress-shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

interface ImprovedToastContainerProps {
  toasts: Array<{
    id: string;
    type: ImprovedToastType;
    message: string;
    duration?: number;
  }>;
  onClose: (id: string) => void;
}

export function ImprovedToastContainer({
  toasts,
  onClose,
}: ImprovedToastContainerProps) {
  const containerContent = (
    <div className="fixed top-8 left-1/2 z-[100] flex -translate-x-1/2 transform flex-col">
      {toasts.map((toast, index) => (
        <ImprovedToast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          index={index}
          onClose={onClose}
        />
      ))}
    </div>
  );

  return createPortal(containerContent, document.body);
}
