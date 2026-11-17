import { useEffect, useRef } from "react";
import type { AssistantState } from "@/lib/assistant";

type VoiceViseme = "rest" | "open" | "wide" | "round" | "closed" | "teeth";
type FaceExpression = "neutral" | "friendly" | "curious" | "serious";
type Props = { state: AssistantState; mouthLevel: number; viseme: VoiceViseme; expression: FaceExpression; gaze?: { x: number; y: number } | null };

/**
 * Lightweight procedural 3D bust. Three.js is loaded on demand so the rest of
 * the assistant remains usable if WebGL or the external module CDN is blocked.
 */
export function Hologram3D({ state, mouthLevel, viseme, expression, gaze = null }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const mouthRef = useRef(mouthLevel);
  const visemeRef = useRef(viseme);
  const expressionRef = useRef(expression);
  const gazeRef = useRef(gaze);
  stateRef.current = state;
  mouthRef.current = mouthLevel;
  visemeRef.current = viseme;
  expressionRef.current = expression;
  gazeRef.current = gaze;

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
        let vrm: any = null;
        let vrmHead: any = null;
        const bodyBones: Record<string, { bone: any; rest: { x: number; y: number; z: number } }> = {};
        const lookTarget = new THREE.Object3D();
        lookTarget.position.set(0, 0.1, 4);
        scene.add(lookTarget);

        // Load a CC0 VRM human model asynchronously. The procedural bust remains
        // visible until the real model is ready, and is kept as an offline fallback.
        const configuredVrmUrl = (import.meta as any).env?.VITE_TUNAVI_AVATAR_VRM as string | undefined;
        const vrmUrl = configuredVrmUrl || "https://arweave.net/gwG7w4bY-A5c3R6A6GOz3xBCgbPvkFQmqPIDtvnNsYI";
        void (async () => {
          try {
            const loaderModuleUrl = "https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js?deps=three@0.180.0";
            const vrmModuleUrl = "https://esm.sh/@pixiv/three-vrm@3.4.2?deps=three@0.180.0";
            const [loaderModule, vrmModule] = await Promise.all([
              import(/* @vite-ignore */ loaderModuleUrl),
              import(/* @vite-ignore */ vrmModuleUrl),
            ]);
            if (disposed) return;
            const loader = new loaderModule.GLTFLoader();
            loader.register((parser: any) => new vrmModule.VRMLoaderPlugin(parser));
            const gltf = await loader.loadAsync(vrmUrl);
            if (disposed) {
              vrmModule.VRMUtils.deepDispose(gltf.scene);
              return;
            }
            vrm = gltf.userData.vrm;
            if (!vrm?.scene) throw new Error("O arquivo carregado não contém um avatar VRM válido.");
            vrm.scene.traverse((object: any) => {
              if (object.isMesh && object.material) {
                const materials = Array.isArray(object.material) ? object.material : [object.material];
                materials.forEach((material: any) => {
                  material.transparent = true;
                  material.opacity = Math.min(material.opacity ?? 1, 0.94);
                  if (material.emissive) {
                    material.emissive.set(0x321078);
                    material.emissiveIntensity = 0.22;
                  }
                  material.needsUpdate = true;
                });
              }
            });
            const bounds = new THREE.Box3().setFromObject(vrm.scene);
            const size = bounds.getSize(new THREE.Vector3());
            const center = bounds.getCenter(new THREE.Vector3());
            // Frame the complete humanoid instead of a close-up bust.
            const scale = 2.72 / Math.max(size.y, 0.01);
            vrm.scene.scale.setScalar(scale);
            vrm.scene.position.set(-center.x * scale, -center.y * scale + 0.02, -center.z * scale);
            scene.add(vrm.scene);
            const humanoid = vrm.humanoid;
            const boneNames = ["hips", "spine", "chest", "neck", "head", "leftShoulder", "rightShoulder", "leftUpperArm", "rightUpperArm", "leftLowerArm", "rightLowerArm", "leftHand", "rightHand"];
            for (const name of boneNames) {
              const bone = humanoid?.getNormalizedBoneNode?.(name);
              if (bone) bodyBones[name] = { bone, rest: { x: bone.rotation.x, y: bone.rotation.y, z: bone.rotation.z } };
            }
            vrmHead = bodyBones["head"]?.bone ?? null;
            if (vrm.lookAt) vrm.lookAt.target = lookTarget;
            hologram.visible = false;
            const fallback = canvas.closest("[data-holo-depth]")?.querySelector<HTMLElement>("[data-holo-fallback]") ?? null;
            if (fallback) {
              fallback.style.opacity = "0";
              fallback.style.transition = "opacity 700ms ease";
            }
            canvas.dataset["avatarLoaded"] = "true";
          } catch (error) {
            console.warn("[TUNAVI] Não foi possível carregar o modelo VRM; usando o holograma de reserva.", error);
          }
        })();
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
        const eyes: any[] = [];
        const brows: any[] = [];
        const cheeks: any[] = [];

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
          brows.push(brow);
          const cheek = addSphere(head, skin, [side * 0.43, -0.28, 0.43], [0.19, 0.12, 0.11]);
          cheeks.push(cheek);
        }

        // Mouth cavity and lips: the opening is driven by the assistant's voice level.
        const mouth = new THREE.Group();
        mouth.position.set(0, -0.39, 0.585);
        head.add(mouth);
        addSphere(mouth, dark, [0, 0, 0], [0.19, 0.035, 0.035]);
        addSphere(mouth, highlight, [0, 0.035, 0.006], [0.18, 0.025, 0.035]);
        addSphere(mouth, skin, [0, -0.045, 0.004], [0.17, 0.035, 0.035]);
        const smileCorners = [-1, 1].map((side) => {
          const corner = addSphere(mouth, highlight, [side * 0.165, 0.005, 0.012], [0.035, 0.025, 0.018]);
          return { mesh: corner, side };
        });

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
          const delta = clock.getDelta();
          const t = clock.elapsedTime;
          const currentState = stateRef.current;
          const talking = currentState === "respondendo";
          const thinking = currentState === "processando";
          const trackedGaze = gazeRef.current;
          const lookX = trackedGaze ? trackedGaze.x * 0.34 : pointerX;
          const lookY = trackedGaze ? trackedGaze.y * 0.22 : pointerY;
          head.rotation.y += ((lookX + (thinking ? Math.sin(t * 0.7) * 0.08 : 0)) - head.rotation.y) * 0.055;
          head.rotation.x += ((-lookY + Math.sin(t * 0.65) * 0.018) - head.rotation.x) * 0.05;
          const expressionTilt = expressionRef.current === "curious" ? 0.035 : 0;
          head.rotation.z += ((Math.sin(t * 0.55) * (currentState === "ouvindo" ? 0.025 : 0.012) + expressionTilt) - head.rotation.z) * 0.06;
          hologram.position.y = Math.sin(t * 1.2) * 0.035;
          const currentViseme = visemeRef.current;
          const currentExpression = expressionRef.current;
          const speakingOpen = talking ? 0.06 + Math.max(0, Math.min(1, mouthRef.current)) * 0.72 : 0.025;
          const targetMouthY = currentViseme === "closed" ? 0.28 : currentViseme === "wide" ? 0.72 : currentViseme === "round" ? 0.9 : currentViseme === "teeth" ? 0.48 : speakingOpen;
          const targetMouthX = currentViseme === "round" ? 0.72 : currentViseme === "wide" ? 1.18 : currentViseme === "closed" ? 0.82 : 1;
          mouth.scale.y += (talking ? targetMouthY : 0.7 - mouth.scale.y) * 0.28;
          mouth.scale.x += (talking ? targetMouthX : 1 - mouth.scale.x) * 0.2;
          brows.forEach((brow, index) => {
            const side = index === 0 ? -1 : 1;
            const lift = currentExpression === "curious" ? 0.11 : currentExpression === "friendly" ? 0.045 : currentExpression === "serious" ? -0.045 : 0;
            brow.position.y += (0.27 + lift - brow.position.y) * 0.12;
            brow.rotation.z += (side * (currentExpression === "curious" ? -0.18 : currentExpression === "serious" ? 0.13 : -0.1) - brow.rotation.z) * 0.12;
          });

          const blinkCycle = t % 4.6;
          const blink = blinkCycle > 0.12 && blinkCycle < 0.29 ? Math.sin(((blinkCycle - 0.12) / 0.17) * Math.PI) : 0;
          const eyeScale = (currentExpression === "serious" ? 0.84 : currentExpression === "curious" ? 1.12 : 1) * (1 - blink * 0.92);
          eyes.forEach((eye) => {
            eye.scale.y += (eyeScale - eye.scale.y) * 0.32;
            eye.rotation.y += (lookX * 0.22 - eye.rotation.y) * 0.12;
            eye.rotation.x += (-lookY * 0.16 - eye.rotation.x) * 0.12;
          });
          const smile = currentExpression === "friendly" ? 1 : 0;
          smileCorners.forEach(({ mesh, side }) => {
            mesh.position.y += (0.005 + smile * 0.055 - mesh.position.y) * 0.16;
            mesh.position.x += (side * (0.165 + smile * 0.008) - mesh.position.x) * 0.16;
          });
          cheeks.forEach((cheek) => {
            const target = currentExpression === "friendly" ? 1.12 : currentExpression === "curious" ? 1.04 : 1;
            cheek.scale.x += (0.19 * target - cheek.scale.x) * 0.1;
            cheek.scale.y += (0.12 * target - cheek.scale.y) * 0.1;
          });

          const glow = talking ? 1.5 : currentState === "ouvindo" ? 1.25 : 0.95;
          skin.emissiveIntensity = glow;

          if (vrm) {
            // State-aware body language: welcoming while listening, thoughtful while
            // processing, open-handed while speaking, and confident while executing.
            const listening = currentState === "ouvindo";
            const executing = currentState === "executando";
            const speakingGesture = talking ? Math.sin(t * 2.7) : 0;
            const listeningNod = listening ? Math.sin(t * 1.65) * 0.04 : 0;
            const welcome = listening ? 0.5 + Math.sin(t * 1.1) * 0.08 : 0;
            const think = thinking ? 1 : 0;
            const gestureTargets: Record<string, { x: number; y: number; z: number }> = {
              hips: { x: 0, y: Math.sin(t * 0.42) * 0.018, z: Math.sin(t * 0.5) * 0.008 },
              spine: { x: listeningNod - (talking ? 0.025 : 0) + think * 0.035, y: Math.sin(t * 0.72) * 0.018, z: 0 },
              chest: { x: talking ? -0.035 : think * 0.025, y: Math.sin(t * 0.62) * 0.025, z: 0 },
              neck: { x: listeningNod + think * -0.025, y: pointerX * 0.12, z: expressionRef.current === "curious" ? 0.035 : 0 },
              leftShoulder: { x: 0, y: 0, z: listening ? 0.035 : 0 },
              rightShoulder: { x: 0, y: 0, z: listening ? -0.035 : 0 },
              leftUpperArm: { x: talking ? -0.1 - Math.max(0, speakingGesture) * 0.13 : listening ? -0.18 : thinking ? -0.34 : executing ? -0.22 : -0.025, y: 0, z: talking ? 0.13 + Math.max(0, speakingGesture) * 0.12 : listening ? 0.12 + welcome * 0.13 : thinking ? 0.24 : executing ? 0.09 : 0.035 },
              rightUpperArm: { x: talking ? -0.1 - Math.max(0, -speakingGesture) * 0.13 : listening ? -0.18 : thinking ? -0.08 : executing ? -0.22 : -0.025, y: 0, z: talking ? -0.13 - Math.max(0, -speakingGesture) * 0.12 : listening ? -0.12 - welcome * 0.13 : thinking ? -0.035 : executing ? -0.09 : -0.035 },
              leftLowerArm: { x: talking ? -0.16 - Math.max(0, speakingGesture) * 0.24 : listening ? -0.12 : thinking ? -0.62 : executing ? -0.2 : -0.04, y: 0, z: listening ? 0.04 : 0 },
              rightLowerArm: { x: talking ? -0.16 - Math.max(0, -speakingGesture) * 0.24 : listening ? -0.12 : thinking ? -0.08 : executing ? -0.2 : -0.04, y: 0, z: listening ? -0.04 : 0 },
              leftHand: { x: 0, y: 0, z: talking ? 0.1 : listening ? 0.08 : 0 },
              rightHand: { x: 0, y: 0, z: talking ? -0.1 : listening ? -0.08 : 0 },
            };
            for (const [name, target] of Object.entries(gestureTargets)) {
              const entry = bodyBones[name];
              if (!entry) continue;
              const smooth = name.includes("Arm") || name.includes("Hand") || name.includes("Shoulder") ? 0.075 : 0.05;
              entry.bone.rotation.x += (entry.rest.x + target.x - entry.bone.rotation.x) * smooth;
              entry.bone.rotation.y += (entry.rest.y + target.y - entry.bone.rotation.y) * smooth;
              entry.bone.rotation.z += (entry.rest.z + target.z - entry.bone.rotation.z) * smooth;
            }
            lookTarget.position.set(lookX * 3.2, 0.12 - lookY * 2.2, 4);
            if (vrmHead) {
              vrmHead.rotation.y += (lookX * 0.34 - vrmHead.rotation.y) * 0.08;
              vrmHead.rotation.x += (-lookY * 0.2 + Math.sin(t * 0.7) * 0.012 - vrmHead.rotation.x) * 0.06;
            }
            const expressions = vrm.expressionManager;
            if (expressions) {
              const visemePreset: Record<VoiceViseme, string> = { rest: "relaxed", open: "aa", wide: "ih", round: "ou", closed: "relaxed", teeth: "ee" };
              for (const preset of ["aa", "ih", "ou", "ee", "oh", "happy", "angry", "surprised", "relaxed"]) expressions.setValue(preset, 0);
              if (talking && currentViseme !== "rest") expressions.setValue(visemePreset[currentViseme], currentViseme === "closed" ? 0 : Math.max(0.25, mouthRef.current));
              expressions.setValue("happy", currentExpression === "friendly" ? 0.48 : 0);
              expressions.setValue("surprised", currentExpression === "curious" ? 0.35 : 0);
              expressions.setValue("angry", currentExpression === "serious" ? 0.22 : 0);
              expressions.setValue("blink", blink);
            }
            vrm.update(delta);
          }
          renderer.render(scene, camera);
        };
        animate();

        return () => {
          canvas.removeEventListener("pointermove", onPointer);
          canvas.removeEventListener("pointerleave", onLeave);
          if (vrm?.scene) scene.remove(vrm.scene);
          scene.traverse((object: any) => {
            object.geometry?.dispose?.();
            if (Array.isArray(object.material)) object.material.forEach((material: any) => material.dispose?.());
            else object.material?.dispose?.();
          });
          renderer.dispose();
        };
      } catch (error) {
        console.warn("[TUNAVI] Avatar 3D indisponível; mantendo holograma de reserva.", error);
        return undefined;
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
