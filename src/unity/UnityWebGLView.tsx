import { useEffect, useRef } from "react";

import { unityWebGLTransport } from "@/bridge/UnityWebGLTransport";
import { loadUnityWebGL, unloadUnityWebGL } from "@/unity/loadUnityWebGL";
import { createUnityConfig } from "@/unity/unityConfig";
import { useUnityStore } from "@/stores/unityStore";
import type { UnityInstance } from "@/types/unity-webgl";

interface UnityWebGLViewProps {
  className?: string;
}

export function UnityWebGLView({ className }: UnityWebGLViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const setUnityShellState = useUnityStore((state) => state.setUnityShellState);
  const setUnityInstance = useUnityStore((state) => state.setUnityInstance);
  const resetUnityShellState = useUnityStore((state) => state.resetUnityShellState);
  const baseClassName =
    "unity-runtime flex h-full min-h-0 flex-col border-0 bg-transparent p-0 shadow-none";
  const viewClassName = className
    ? `${baseClassName} ${className}`
    : baseClassName;

  useEffect(() => {
    let cancelled = false;
    let unityInstance: UnityInstance | null = null;

    resetUnityShellState();

    async function mountUnity() {
      if (!canvasRef.current) {
        return;
      }

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
        setUnityShellState({
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
      setUnityInstance(null);
      resetUnityShellState();
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
