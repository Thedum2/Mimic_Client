import { useEffect, useRef } from "react";

import { unityWebGLTransport } from "@/bridge/UnityWebGLTransport";
import { runtimeStore } from "@/state/runtimeStore";
import { useUIStore } from "@/state/uiStore";
import { loadUnityWebGL, unloadUnityWebGL } from "@/unity/loadUnityWebGL";
import { createUnityConfig } from "@/unity/unityConfig";
import type { UnityInstance } from "@/types/unity-webgl";

interface UnityWebGLViewProps {
  className?: string;
}

export function UnityWebGLView({ className }: UnityWebGLViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const setUnityShellState = useUIStore((state) => state.setUnityShellState);
  const baseClassName =
    "unity-runtime flex h-full min-h-0 flex-col border-0 bg-transparent p-0 shadow-none";
  const viewClassName = className
    ? `${baseClassName} ${className}`
    : baseClassName;

  useEffect(() => {
    let cancelled = false;
    let unityInstance: UnityInstance | null = null;

    runtimeStore.setUnityShellState({
      status: "idle",
      progress: 0,
      errorMessage: null,
    });
    setUnityShellState({
      unityStatus: "idle",
      unityProgress: 0,
      unityErrorMessage: null,
    });

    async function mountUnity() {
      if (!canvasRef.current) {
        return;
      }

      setUnityShellState({
        unityStatus: "loading",
        unityProgress: 0,
        unityErrorMessage: null,
      });
      runtimeStore.setUnityShellState({
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
                unityErrorMessage: message,
                unityStatus: "error",
              });
            }
          }),
          (nextProgress) => {
            if (!cancelled) {
              setUnityShellState({ unityProgress: nextProgress });
              runtimeStore.setUnityShellState({ progress: nextProgress });
            }
          },
        );

        if (cancelled || !unityInstance) {
          await unloadUnityWebGL(unityInstance);
          return;
        }

        unityWebGLTransport.attach(unityInstance);
        setUnityShellState({
          unityStatus: "ready",
          unityProgress: 1,
          unityErrorMessage: null,
        });
        runtimeStore.setUnityShellState({
          status: "ready",
          progress: 1,
          errorMessage: null,
        });
      } catch (error) {
        if (!cancelled) {
          const nextErrorMessage =
            error instanceof Error
              ? error.message
              : "Failed to load Unity WebGL build";

          setUnityShellState({
            unityStatus: "error",
            unityErrorMessage: nextErrorMessage,
          });
          runtimeStore.setUnityShellState({
            status: "error",
            errorMessage: nextErrorMessage,
          });
        }
      }
    }

    void mountUnity();

    return () => {
      cancelled = true;
      unityWebGLTransport.detach();
      setUnityShellState({
        unityStatus: "idle",
        unityProgress: 0,
        unityErrorMessage: null,
      });
      runtimeStore.setUnityShellState({
        status: "idle",
        progress: 0,
        errorMessage: null,
      });
      void unloadUnityWebGL(unityInstance);
    };
  }, [setUnityShellState]);

  return (
    <section className={viewClassName}>
      <div className="unity-canvas-shell">
        <canvas
          id="unity-webgl-canvas"
          ref={canvasRef}
          className="unity-canvas"
        />
      </div>
    </section>
  );
}
