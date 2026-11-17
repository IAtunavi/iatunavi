import { cn } from "@/lib/utils";
import bust from "@/assets/tunavi-bust.jpg";
import { STATE_LABEL, useAssistantState, type AssistantState } from "@/lib/assistant";

const PARTICLES = [
  { top: "12%", left: "18%", size: 4, tone: "bg-lav", delay: "0s" },
  { top: "28%", right: "16%", size: 6, tone: "bg-vio", delay: "1.2s" },
  { top: "44%", left: "22%", size: 4, tone: "bg-lav/70", delay: "2.1s" },
  { top: "20%", right: "26%", size: 4, tone: "bg-lav/50", delay: "0.6s" },
  { top: "58%", right: "22%", size: 4, tone: "bg-lav/80", delay: "1.7s" },
];

const EXTRA_PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  top: `${10 + ((i * 37) % 60)}%`,
  left: `${8 + ((i * 53) % 84)}%`,
  delay: `${(i % 7) * 0.35}s`,
  size: i % 3 === 0 ? 5 : 3,
}));

/**
 * The TUNAVI hologram: a real human bust projected as a violet hologram with
 * scanlines, projection beams and an emitter ring. Five animated states.
 */
export function Hologram({
  scale = 1,
  className,
  forceState,
}: {
  scale?: number;
  className?: string;
  forceState?: AssistantState;
}) {
  const live = useAssistantState();
  const state = forceState ?? live.state;
  const mouthLevel = state === "respondendo" ? Math.max(0.18, live.mouthLevel) : 0;
  const W = 360;
  const H = 340;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: W * scale, height: H * scale, perspective: "1000px", touchAction: "pan-y" }}
      role="img"
      aria-label={`Holograma 3D da TUNAVI — ${STATE_LABEL[state]}. Mova o cursor para observar a perspectiva.`}
      data-state={state}
      onPointerMove={(event) => {
        if (event.pointerType === "touch") return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        const depth = event.currentTarget.querySelector<HTMLElement>("[data-holo-depth]");
        if (depth) depth.style.transform = `rotateY(${x * 13}deg) rotateX(${-y * 9}deg) translateZ(8px)`;
      }}
      onPointerLeave={(event) => {
        const depth = event.currentTarget.querySelector<HTMLElement>("[data-holo-depth]");
        if (depth) depth.style.transform = "rotateY(0deg) rotateX(0deg) translateZ(0)";
      }}
    >
      <div
        className="absolute left-0 top-0 flex justify-center"
        style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left" }}
      >
        {/* Projection beams */}
        <div
          className={cn(
            "absolute inset-x-[90px] top-0 bottom-8 transition-opacity duration-700",
            state === "repouso" ? "opacity-80" : "opacity-100",
          )}
          style={{ background: "linear-gradient(0deg, color-mix(in oklab, var(--vio) 34%, transparent), transparent 90%)" }}
        />
        <div className="absolute left-[120px] top-0 bottom-8 w-px bg-gradient-to-t from-lav/60 to-transparent" />
        <div className="absolute right-[120px] top-0 bottom-8 w-px bg-gradient-to-t from-lav/60 to-transparent" />
        <div className="absolute left-1/2 top-0 bottom-8 w-px bg-gradient-to-t from-vio to-transparent" />

        {/* Listening: ripples */}
        {state === "ouvindo" && (
          <div className="pointer-events-none absolute left-1/2 top-[150px] -translate-x-1/2 -translate-y-1/2">
            {[0, 0.6, 1.2].map((d) => (
              <span
                key={d}
                className="absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-lav/50"
                style={{ animation: `holo-ripple 1.8s ease-out ${d}s infinite` }}
              />
            ))}
          </div>
        )}

        {/* Processing: orbital rings */}
        {state === "processando" && (
          <div className="pointer-events-none absolute left-1/2 top-[150px] h-0 w-0">
            <div className="absolute -left-[150px] -top-[60px] h-[120px] w-[300px] rounded-[50%] border border-lav/40" style={{ animation: "holo-spin 3.2s linear infinite", transform: "rotateX(70deg)" }}>
              <span className="absolute -top-1 left-1/2 h-2 w-2 rounded-full bg-lav glow" />
            </div>
            <div className="absolute -left-[130px] -top-[130px] h-[260px] w-[260px] rounded-full border border-dashed border-vio/60" style={{ animation: "holo-spin-rev 6s linear infinite" }}>
              <span className="absolute left-0 top-1/2 h-1.5 w-1.5 rounded-full bg-vio glow" />
            </div>
            <div className="absolute -left-[105px] -top-[105px] h-[210px] w-[210px] rounded-full border border-lav/25 border-t-lav/80" style={{ animation: "holo-spin 1.6s linear infinite" }} />
          </div>
        )}

        {/* The portrait sits on a depth-aware stage for real-time 3D parallax. */}
        <div
          data-holo-depth
          className="relative"
          style={{ transformStyle: "preserve-3d", transition: "transform 180ms ease-out", willChange: "transform" }}
        >
        {/* Original realistic bust, projected as a violet hologram */}
        <div
          className="relative mt-0 h-[310px] w-[300px] overflow-hidden holo-mask"
          style={{
            animation:
              state === "respondendo"
                ? "holo-pulse-glow 1.2s ease-in-out infinite, holo-head-speak 2.8s ease-in-out infinite"
                : state === "ouvindo"
                  ? "holo-head-listen 3.2s ease-in-out infinite"
                  : state === "processando"
                    ? "holo-head-think 2.6s ease-in-out infinite"
                    : state === "executando"
                      ? "holo-head-execute 2.2s ease-in-out infinite"
                      : "holo-head-rest 5s ease-in-out infinite",
            filter: "drop-shadow(0 0 22px color-mix(in oklab, var(--vio) 55%, transparent))",
          }}
        >
          <img
            src={bust}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-contain object-bottom"
            style={{
              filter: "grayscale(1) sepia(.35) hue-rotate(220deg) saturate(3.2) contrast(1.28) brightness(1.08)",
              opacity: 0.9,
              mixBlendMode: "screen",
              transform: "translateZ(18px) scale(1.04)",
              backfaceVisibility: "hidden",
            }}
          />
          <div className="pointer-events-none absolute inset-0" style={{background:"linear-gradient(180deg, rgba(196,181,253,.10), rgba(124,58,237,.34)), radial-gradient(55% 48% at 50% 36%, rgba(221,214,254,.28), transparent 75%)",mixBlendMode:"screen"}}/>
          {/* Eye highlights react to listening, thinking and speaking states. */}
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute left-[39%] top-[61.5%] h-[5px] w-[22%] rounded-full transition-all duration-500",
              state === "ouvindo" ? "opacity-100" : state === "processando" ? "opacity-75" : state === "respondendo" ? "opacity-90" : "opacity-35",
            )}
            style={{ background: "radial-gradient(ellipse, rgba(221,214,254,.95), rgba(167,139,250,.28) 55%, transparent 78%)", filter: "blur(1px)", animation: state === "ouvindo" ? "holo-eye-focus 1.1s ease-in-out infinite alternate" : state === "processando" ? "holo-eye-think 2s ease-in-out infinite" : "holo-eye-rest 4.5s ease-in-out infinite" }}
          />
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute right-[39%] top-[61.5%] h-[5px] w-[22%] rounded-full transition-all duration-500",
              state === "ouvindo" ? "opacity-100" : state === "processando" ? "opacity-75" : state === "respondendo" ? "opacity-90" : "opacity-35",
            )}
            style={{ background: "radial-gradient(ellipse, rgba(221,214,254,.95), rgba(167,139,250,.28) 55%, transparent 78%)", filter: "blur(1px)", animation: state === "ouvindo" ? "holo-eye-focus 1.1s ease-in-out infinite alternate" : state === "processando" ? "holo-eye-think 2s ease-in-out infinite reverse" : "holo-eye-rest 4.5s ease-in-out infinite" }}
          />
          <div className="pointer-events-none absolute inset-0 scanlines opacity-80"/>
          <div className="pointer-events-none absolute inset-0 opacity-45" style={{background:"repeating-linear-gradient(90deg, transparent 0 7px, rgba(196,181,253,.12) 7px 8px), linear-gradient(0deg, transparent 0 48%, rgba(221,214,254,.28) 50%, transparent 52%)"}}/>
          <div className="pointer-events-none absolute inset-x-5 top-0 h-full" style={{background:"linear-gradient(180deg, transparent 0%, rgba(221,214,254,.20) 48%, transparent 52%, transparent 100%)",animation:"holo-scan 3.8s linear infinite"}}/>
          <div className="pointer-events-none absolute inset-0" style={{boxShadow:"inset 0 0 42px rgba(124,58,237,.38)"}}/>
          {/* Subtle mouth movement follows the real speech-synthesis playback state. */}
          {state === "respondendo" && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-[71.5%] -translate-x-1/2 rounded-[50%] border border-violet-200/80 bg-[#160d25]/90 shadow-[0_0_7px_rgba(196,181,253,.85)] transition-[width,height,opacity] duration-100"
              style={{ width: `${13 + mouthLevel * 13}px`, height: `${2 + mouthLevel * 7}px`, opacity: 0.7 + mouthLevel * 0.3, transformOrigin: "center" }}
            />
          )}
          {state === "respondendo" && <div className="pointer-events-none absolute inset-0 bg-violet-300/10" style={{animation:"holo-flicker .8s linear infinite"}}/>}
        </div>

        </div>

        {/* Particles */}
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className={cn("absolute rounded-full", p.tone)}
            style={{
              top: p.top,
              left: p.left,
              right: p.right,
              width: p.size,
              height: p.size,
              animation: `holo-float ${state === "repouso" ? 6 : 2.5}s ease-in-out ${p.delay} infinite`,
            }}
          />
        ))}
        {(state === "processando" || state === "executando") &&
          EXTRA_PARTICLES.map((p, i) => (
            <span
              key={`x${i}`}
              className="absolute rounded-full bg-lav/80"
              style={{ top: p.top, left: p.left, width: p.size, height: p.size, animation: `holo-float 1.6s ease-in-out ${p.delay} infinite` }}
            />
          ))}

        {/* Responding: spectrogram */}
        {state === "respondendo" && (
          <div className="absolute bottom-[64px] left-1/2 flex h-10 -translate-x-1/2 items-end gap-[3px]">
            {Array.from({ length: 21 }, (_, i) => (
              <span
                key={i}
                className={cn("w-[3px] origin-bottom rounded-full", i % 4 === 0 ? "bg-vio" : "bg-lav")}
                style={{
                  height: `${30 + ((i * 29) % 70)}%`,
                  animation: `holo-bar ${0.5 + ((i * 7) % 5) / 10}s ease-in-out ${(i % 6) * 0.07}s infinite`,
                }}
              />
            ))}
          </div>
        )}

        {/* Emitter base */}
        <div
          className={cn("absolute bottom-6 h-12 w-[300px] rounded-[50%] border border-lav/30 transition-all duration-500")}
          style={{
            boxShadow:
              state === "repouso"
                ? "0 0 40px var(--vio), inset 0 0 24px color-mix(in oklab, var(--vio) 55%, transparent)"
                : "0 0 60px var(--vio), inset 0 0 30px var(--vio)",
          }}
        />
        <div
          className="absolute bottom-8 h-8 w-[230px] rounded-[50%] border border-dashed border-lav/40"
          style={{ animation: `holo-spin ${state === "repouso" ? 40 : state === "processando" ? 4 : 12}s linear infinite` }}
        />

        {/* Executing: progress */}
        {state === "executando" && (
          <div className="absolute bottom-[58px] left-1/2 w-[200px] -translate-x-1/2">
            <div className="mb-1.5 flex justify-center gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-lav" style={{ animation: `holo-flicker 0.8s linear ${i * 0.2}s infinite` }} />
              ))}
            </div>
            <div className="relative h-1 overflow-hidden rounded-full bg-lav/15">
              <div className="absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-transparent via-lav to-transparent" style={{ animation: "holo-progress 1.3s ease-in-out infinite" }} />
            </div>
          </div>
        )}

        {/* Status pill */}
        <div className="absolute -bottom-1 flex h-8 items-center gap-2 rounded-full px-4 font-mono text-[11px] uppercase tracking-[0.2em] text-lav/80 ring-1 ring-lav/15 glass">
          <span
            className={cn("h-1.5 w-1.5 rounded-full", state === "repouso" ? "bg-lav" : "bg-vio")}
            style={{
              boxShadow: "0 0 8px var(--lav)",
              animation: state === "repouso" ? undefined : "holo-flicker 0.9s linear infinite",
            }}
          />
          {STATE_LABEL[state]}
        </div>
      </div>
    </div>
  );
}
