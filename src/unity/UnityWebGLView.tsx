import { useEffect, useRef } from "react";

import { unityWebGLTransport } from "@/bridge/UnityWebGLTransport";
import { loadUnityWebGL, unloadUnityWebGL } from "@/unity/loadUnityWebGL";
import { createUnityConfig } from "@/unity/unityConfig";
import { useUnityStore } from "@/stores/unityStore";
import type { UnityInstance } from "@/types/unity-webgl";

interface UnityWebGLViewProps {
  className?: string;
}

let pendingUnityUnload: Promise<void> = Promise.resolve();

function disableGlobalUnityKeyboardCapture() {
  const webGLInput = (window as unknown as { WebGLInput?: { captureAllKeyboardInput?: boolean } }).WebGLInput;
  if (webGLInput && typeof webGLInput.captureAllKeyboardInput === "boolean") {
    webGLInput.captureAllKeyboardInput = false;
  }
}

function syncCanvasSize(canvas: HTMLCanvasElement) {
  const host = canvas.parentElement;
  const rect = (host ?? canvas).getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const nextWidth = Math.max(1, Math.floor(rect.width * dpr));
  const nextHeight = Math.max(1, Math.floor(rect.height * dpr));

  canvas.style.width = "100%";
  canvas.style.height = "100%";

  if (canvas.width !== nextWidth) {
    canvas.width = nextWidth;
  }

  if (canvas.height !== nextHeight) {
    canvas.height = nextHeight;
  }
}

export function UnityWebGLView({ className }: UnityWebGLViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const setUnityShellState = useUnityStore((state) => state.setUnityShellState);
  const setUnityInstance = useUnityStore((state) => state.setUnityInstance);
  const resetUnityShellState = useUnityStore((state) => state.resetUnityShellState);
  const baseClassName =
    "unity-runtime unity-runtime--flush flex h-full min-h-0 flex-col border-0 bg-transparent p-0 shadow-none";
  const viewClassName = className
    ? `${baseClassName} ${className}`
    : baseClassName;

  useEffect(() => {
    let cancelled = false;
    let unityInstance: UnityInstance | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let windowResizeHandler: (() => void) | null = null;

    resetUnityShellState();

    async function mountUnity() {
      if (!canvasRef.current) {
        return;
      }

      await pendingUnityUnload;
      if (cancelled || !canvasRef.current) {
        return;
      }

      syncCanvasSize(canvasRef.current);
      setUnityShellState({
        status: "loading",
        progress: 0,
        errorMessage: null,
      });

      try {
        unityInstance = await loadUnityWebGL(
          canvasRef.current,
          createUnityConfig((message, type) => {
            if (type === "error") {
              setUnityShellState({
                status: "error",
                errorMessage: message,
              });
            }
          }),
          (nextProgress) => {
            if (!cancelled) {
              setUnityShellState({ progress: nextProgress });
            }
          },
        );

        if (cancelled || !unityInstance) {
          await unloadUnityWebGL(unityInstance);
          return;
        }

        unityWebGLTransport.attach(unityInstance);
        setUnityInstance(unityInstance);
        disableGlobalUnityKeyboardCapture();
        setUnityShellState({
          status: "ready",
          progress: 1,
          errorMessage: null,
        });

        const canvas = canvasRef.current;
        if (canvas) {
          const handleResize = () => {
            if (!cancelled && canvasRef.current) {
              syncCanvasSize(canvasRef.current);
            }
          };

          if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(handleResize);
            resizeObserver.observe(canvas);
            if (canvas.parentElement) {
              resizeObserver.observe(canvas.parentElement);
            }
          }

          windowResizeHandler = handleResize;
          window.addEventListener("resize", windowResizeHandler);
          handleResize();
        }
      } catch (error) {
        if (!cancelled) {
          const nextErrorMessage =
            error instanceof Error
              ? error.message
              : "Failed to load Unity WebGL build";

          setUnityShellState({
            status: "error",
            errorMessage: nextErrorMessage,
          });
        }
      }
    }

    void mountUnity();

    return () => {
      cancelled = true;
      if (windowResizeHandler) {
        window.removeEventListener("resize", windowResizeHandler);
      }
      resizeObserver?.disconnect();
      unityWebGLTransport.detach();
      setUnityInstance(null);
      resetUnityShellState();
      pendingUnityUnload = unloadUnityWebGL(unityInstance).catch(() => {});
    };
  }, [setUnityShellState]);

  return (
    <section className={viewClassName}>
      <div className="unity-canvas-shell">
        <canvas
          id="unity-webgl-canvas"
          tabIndex={-1}
          ref={canvasRef}
          className="unity-canvas"
          onContextMenu={(event) => event.preventDefault()}
        />
      </div>
    </section>
  );
}
