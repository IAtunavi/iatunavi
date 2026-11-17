import { useCallback, useEffect, useRef, useState } from "react";

type FaceLandmarker = {
  detectForVideo: (video: HTMLVideoElement, timestamp: number) => {
    faceLandmarks?: Array<Array<{ x: number; y: number; z?: number }>>;
  };
  close: () => void;
};

type FaceTrackingState = {
  supported: boolean;
  active: boolean;
  faceDetected: boolean;
  gaze: { x: number; y: number } | null;
  error: string | null;
};

/**
 * Opt-in, on-device face presence. Camera frames are processed in the browser
 * by MediaPipe and are never uploaded or used to identify the person.
 */
export function useFacePresence() {
  const [state, setState] = useState<FaceTrackingState>({
    supported: typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia,
    active: false,
    faceDetected: false,
    gaze: null,
    error: null,
  });
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectorRef = useRef<FaceLandmarker | null>(null);
  const frameRef = useRef<number>(0);
  const runningRef = useRef(false);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    detectorRef.current?.close();
    detectorRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    videoRef.current?.remove();
    videoRef.current = null;
    setState((current) => ({ ...current, active: false, faceDetected: false, gaze: null }));
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState((current) => ({ ...current, error: "Seu navegador não oferece acesso à câmera." }));
      return;
    }
    if (runningRef.current) return;
    setState((current) => ({ ...current, error: null }));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      const video = document.createElement("video");
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      video.style.position = "fixed";
      video.style.width = "1px";
      video.style.height = "1px";
      video.style.opacity = "0";
      video.style.pointerEvents = "none";
      video.setAttribute("aria-hidden", "true");
      document.body.appendChild(video);
      videoRef.current = video;
      await video.play();

      const visionUrl = "https://esm.sh/@mediapipe/tasks-vision@0.10.22";
      const vision = await import(/* @vite-ignore */ visionUrl);
      const fileset = await vision.FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm",
      );
      const detector: FaceLandmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
      detectorRef.current = detector;
      runningRef.current = true;
      setState((current) => ({ ...current, active: true, error: null }));

      const detect = () => {
        if (!runningRef.current || !videoRef.current || !detectorRef.current) return;
        if (videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          const result = detectorRef.current.detectForVideo(videoRef.current, performance.now());
          const nose = result.faceLandmarks?.[0]?.[1];
          if (nose) {
            // Mirror the horizontal coordinate to match a front-facing selfie camera.
            const x = Math.max(-1, Math.min(1, (0.5 - nose.x) * 2));
            const y = Math.max(-1, Math.min(1, (0.48 - nose.y) * 2));
            setState((current) => ({
              ...current,
              faceDetected: true,
              gaze: current.gaze && Math.abs(current.gaze.x - x) < 0.025 && Math.abs(current.gaze.y - y) < 0.025
                ? current.gaze
                : { x, y },
            }));
          } else {
            setState((current) => current.faceDetected ? { ...current, faceDetected: false, gaze: null } : current);
          }
        }
        frameRef.current = requestAnimationFrame(detect);
      };
      frameRef.current = requestAnimationFrame(detect);
    } catch (error) {
      stop();
      const name = error instanceof Error ? error.name : "";
      const message = name === "NotAllowedError"
        ? "Permita o acesso à câmera para ativar o acompanhamento visual."
        : name === "NotFoundError"
          ? "Nenhuma câmera foi encontrada neste dispositivo."
          : "Não foi possível iniciar o acompanhamento visual. Verifique a câmera e tente novamente.";
      setState((current) => ({ ...current, error: message }));
    }
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { ...state, start, stop };
}
