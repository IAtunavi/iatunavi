import { useEffect, useRef } from "react";
import type { AssistantState } from "@/lib/assistant";

type VoiceViseme = "rest" | "open" | "wide" | "round" | "closed" | "teeth";\ntype FaceExpression = "neutral" | "friendly" | "curious" | "serious";\ntype Props = { state: AssistantState; mouthLevel: number; viseme: VoiceViseme; expression: FaceExpression };

/**
 * Lightweight procedural 3D bust. Three.js is loaded on demand so the rest of
 * the assistant remains usable if WebGL or the external module CDN is blocked.
 */
export function Hologram3D({ state, mouthLevel, viseme, expression }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const mouthRef = useRef(mouthLevel);
  stateRef.current = state;
  mouthRef.current = mouthLevel;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let frame = 0;
    let renderer: any;
    let resizeObserver: ResizeObserver | undefined;

    const boot = async () => {
      try {
        const moduleUrl = "https://esm.sh/three@0.180.0";
        const THREE = await import(/* @vite-ignore */ moduleUrl);
        if (disposed || !canvas.isConnected) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
        camera.position.set(0, 0.05, 5.2);

        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.25;

        scene.add(new THREE.AmbientLight(0x9b83ff, 2.1));
        const key = new THREE.PointLight(0xd9caff, 38, 12);
        key.position.set(-2, 2.4, 3.5);
        scene.add(key);
        const rim = new THREE.PointLight(0x713cff, 45, 10);
        rim.position.set(2, 0.4, -1.5);
        scene.add(rim);
        const faceLight = new THREE.PointLight(0x8f72ff, 15, 8);
        faceLight.position.set(0, 0.1, 3);
        scene.add(faceLight);

        const hologram = new THREE.Group();
        scene.add(hologram);
        const head = new THREE.Group();
        head.position.y = 0.55;
        hologram.add(head);

        const skin = new THREE.MeshStandardMaterial({
          color: 0x9d8bdc, metalness: 0.62, roughness: 0.27,
          emissive: 0x24105b, emissiveIntensity: 0.9, transparent: true, opacity: 0.94,
        });
        const highlight = new THREE.MeshStandardMaterial({
          color: 0xd9ceff, metalness: 0.72, roughness: 0.2,
          emissive: 0x6845d8, emissiveIntensity: 1.35,
        });
        const dark = new THREE.MeshStandardMaterial({
          color: 0x171027, metalness: 0.35, roughness: 0.3,
          emissive: 0x402078, emissiveIntensity: 0.8,
        });
        const hairMat = new THREE.MeshStandardMaterial({
          color: 0x211637, metalness: 0.58, roughness: 0.25,
          emissive: 0x45218d, emissiveIntensity: 0.65,
        });

        const addSphere = (parent: any, material: any, position: [number, number, number], scale: [number, number, number]) => {
          const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 32), material);
          mesh.position.set(...position);
          mesh.scale.set(...scale);
          parent.add(mesh);
          return mesh;
        };

        // Neck and shoulders create a recognisable masculine bust silhouette.
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.32, 0.72, 32), skin);
        neck.position.set(0, -0.72, -0.02);
        hologram.add(neck);
        addSphere(hologram, skin, [0, -1.13, -0.08], [0.94, 0.43, 0.43]);

        // Skull, cheekbones and jaw are separate volumes for readable depth.
        addSphere(head, skin, [0, 0.02, 0], [0.72, 0.91, 0.62]);
        addSphere(head, skin, [0, -0.43, 0.12], [0.59, 0.48, 0.52]);
        addSphere(head, skin, [-0.48, -0.22, 0.12], [0.2, 0.27, 0.3]);
        addSphere(head, skin, [0.48, -0.22, 0.12], [0.2, 0.27, 0.3]);

        // Ears.
        for (const side of [-1, 1]) {
          addSphere(head, skin, [side * 0.72, -0.08, 0], [0.13, 0.23, 0.16]);
          addSphere(head, dark, [side * 0.755, -0.08, 0.105], [0.045, 0.12, 0.055]);
        }

        // Hair cap and swept front fringe.
        addSphere(head, hairMat, [0, 0.62, -0.025], [0.73, 0.43, 0.64]);
        const fringe = addSphere(head, hairMat, [0, 0.48, 0.43], [0.57, 0.2, 0.22]);
        fringe.rotation.z = -0.08;
        addSphere(head, hairMat, [-0.49, 0.32, 0.12], [0.17, 0.34, 0.42]);
        addSphere(head, hairMat, [0.49, 0.32, 0.12], [0.17, 0.34, 0.42]);

        // Nose bridge, tip and nostril shadows.
        addSphere(head, highlight, [0, -0.02, 0.57], [0.105, 0.29, 0.13]);
        addSphere(head, skin, [0, -0.22, 0.64], [0.16, 0.12, 0.16]);
        for (const side of [-1, 1]) {
          addSphere(head, dark, [side * 0.105, -0.27, 0.68], [0.045, 0.025, 0.025]);
        }

        // Eyes, irises and brows are grouped so the lids can blink naturally.
        const eyes: any[] = [];\n        const brows: any[] = [];
        for (const side of [-1, 1]) {
          const eye = new THREE.Group();
          eye.position.set(side * 0.275, 0.105, 0.525);
          head.add(eye);
          addSphere(eye, dark, [0, 0, 0], [0.19, 0.105, 0.07]);
          addSphere(eye, highlight, [0, 0, 0.045], [0.135, 0.066, 0.045]);
          addSphere(eye, dark, [0, 0, 0.082], [0.045, 0.052, 0.025]);
          addSphere(eye, highlight, [-0.014, 0.02, 0.104], [0.016, 0.018, 0.01]);
          eyes.push(eye);

          const brow = addSphere(head, hairMat, [side * 0.28, 0.27, 0.53], [0.22, 0.055, 0.075]);
          brow.rotation.z = side * -0.1;
        }

        // Mouth cavity and lips: the opening is driven by the assistant's voice level.
        const mouth = new THREE.Group();
        mouth.position.set(0, -0.39, 0.585);
        head.add(mouth);
        addSphere(mouth, dark, [0, 0, 0], [0.19, 0.035, 0.035]);
        addSphere(mouth, highlight, [0, 0.035, 0.006], [0.18, 0.025, 0.035]);
        addSphere(mouth, skin, [0, -0.045, 0.004], [0.17, 0.035, 0.035]);

        // A faint digital collar gives the bust a projected, non-photographic finish.
        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.018, 8, 64), highlight);
        collar.position.set(0, -0.91, 0.12);
        collar.rotation.x = 0.16;
        hologram.add(collar);

        const clock = new THREE.Clock();
        let pointerX = 0;
        let pointerY = 0;
        const onPointer = (event: PointerEvent) => {
          const rect = canvas.getBoundingClientRect();
          pointerX = ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 0.48;
          pointerY = ((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 0.28;
        };
        const onLeave = () => { pointerX = 0; pointerY = 0; };
        canvas.addEventListener("pointermove", onPointer);
        canvas.addEventListener("pointerleave", onLeave);

        const resize = () => {
          const rect = canvas.getBoundingClientRect();
          const width = Math.max(1, Math.round(rect.width));
          const height = Math.max(1, Math.round(rect.height));
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvas);
        resize();

        const animate = () => {
          if (disposed) return;
          frame = requestAnimationFrame(animate);
          const t = clock.getElapsedTime();
          const currentState = stateRef.current;
          const talking = currentState === "respondendo";
          const thinking = currentState === "processando";
          head.rotation.y += ((pointerX + (thinking ? Math.sin(t * 0.7) * 0.08 : 0)) - head.rotation.y) * 0.055;
          head.rotation.x += ((-pointerY + Math.sin(t * 0.65) * 0.018) - head.rotation.x) * 0.05;
          head.rotation.z = Math.sin(t * 0.55) * (currentState === "ouvindo" ? 0.025 : 0.012);
          hologram.position.y = Math.sin(t * 1.2) * 0.035;
          const speakingOpen = talking ? 0.06 + Math.max(0, Math.min(1, mouthRef.current)) * 0.72 : 0.025;
          mouth.scale.y += (speakingOpen - mouth.scale.y) * 0.32;

          const blinkCycle = t % 4.6;
          const blink = blinkCycle > 0.12 && blinkCycle < 0.29 ? Math.sin(((blinkCycle - 0.12) / 0.17) * Math.PI) : 0;
          const eyeScale = 1 - blink * 0.92;
          eyes.forEach((eye) => { eye.scale.y += (eyeScale - eye.scale.y) * 0.45; });

          const glow = talking ? 1.5 : currentState === "ouvindo" ? 1.25 : 0.95;
          skin.emissiveIntensity = glow;
          renderer.render(scene, camera);
        };
        animate();

        return () => {
          canvas.removeEventListener("pointermove", onPointer);
          canvas.removeEventListener("pointerleave", onLeave);
          scene.traverse((object: any) => {
            object.geometry?.dispose?.();
            if (Array.isArray(object.material)) object.material.forEach((material: any) => material.dispose?.());
            else object.material?.dispose?.();
          });
          renderer.dispose();
        };
      } catch (error) {
        console.warn("[TUNAVI] Avatar 3D indisponível; mantendo holograma de reserva.", error);
      }
    };

    let cleanup: (() => void) | undefined;
    void boot().then((dispose) => { cleanup = dispose; });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      cleanup?.();
      renderer?.dispose?.();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-auto absolute inset-0 h-full w-full" />;
}
