import { cn } from "@/lib/utils";
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
  const W = 360;
  const H = 340;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: W * scale, height: H * scale }}
      role="img"
      aria-label={`Holograma da TUNAVI — ${STATE_LABEL[state]}`}
      data-state={state}
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

        {/* Wireframe face projection */}
        <div
          className={cn("relative mt-2 h-[290px] w-[270px] overflow-hidden holo-mask")}
          style={{
            animation:
              state === "respondendo"
                ? "holo-pulse-glow 0.9s ease-in-out infinite"
                : state === "ouvindo"
                  ? "holo-breathe 2.2s ease-in-out infinite"
                  : state === "processando"
                    ? "holo-flicker 1.4s linear infinite"
                    : "holo-breathe 5s ease-in-out infinite",
          }}
        >
          <svg viewBox="0 0 270 290" className="absolute inset-0 h-full w-full" role="presentation" aria-hidden="true">
            <defs>
              <radialGradient id="holo-face-glow">
                <stop offset="0%" stopColor="#c4b5fd" stopOpacity=".22" />
                <stop offset="72%" stopColor="#8b5cf6" stopOpacity=".08" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="holo-face-line" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ddd6fe" stopOpacity=".95" />
                <stop offset="52%" stopColor="#a78bfa" stopOpacity=".85" />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity=".65" />
              </linearGradient>
              <clipPath id="holo-face-clip">
                <path d="M135 13 C83 13 52 48 52 105 L58 157 C62 205 91 239 135 250 C179 239 208 205 212 157 L218 105 C218 48 187 13 135 13Z" />
              </clipPath>
            </defs>
            <ellipse cx="135" cy="140" rx="112" ry="132" fill="url(#holo-face-glow)" />
            <g fill="none" stroke="url(#holo-face-line)" strokeLinecap="round" strokeLinejoin="round">
              {/* Head silhouette, jaw and ears */}
              <path strokeWidth="1.8" d="M135 13 C83 13 52 48 52 105 L58 157 C62 205 91 239 135 250 C179 239 208 205 212 157 L218 105 C218 48 187 13 135 13Z" />
              <path strokeWidth="1.2" d="M52 119 C39 108 34 126 43 151 C47 164 53 168 60 164 M218 119 C231 108 236 126 227 151 C223 164 217 168 210 164" />
              <path strokeWidth="1.4" d="M102 244 L92 278 M168 244 L178 278 M92 278 Q135 290 178 278" />
              {/* Longitudinal wireframe meridians */}
              <g clipPath="url(#holo-face-clip)" opacity=".82">
                <path d="M135 12 C104 56 96 111 101 167 C105 205 119 235 135 251" />
                <path d="M135 12 C166 56 174 111 169 167 C165 205 151 235 135 251" />
                <path d="M80 35 C105 76 111 127 108 177 C106 207 117 232 135 251" />
                <path d="M190 35 C165 76 159 127 162 177 C164 207 153 232 135 251" />
                <path d="M55 92 Q135 63 215 92 M54 119 Q135 93 216 119 M56 147 Q135 124 214 147 M61 174 Q135 157 209 174 M72 199 Q135 187 198 199 M91 222 Q135 216 179 222" />
                <path d="M66 65 Q135 84 204 65 M59 159 Q135 145 211 159" opacity=".55" />
              </g>
              {/* Brows and eyes */}
              <path strokeWidth="2" d="M78 105 Q101 91 122 104 M148 104 Q169 91 192 105" />
              <path strokeWidth="2.2" d="M82 122 Q101 111 121 122 Q102 136 82 122Z M149 122 Q169 111 188 122 Q168 136 149 122Z" />
              <path strokeWidth="1.5" d="M101 118 L101 126 M169 118 L169 126" />
              <circle cx="102" cy="122" r="3.4" fill="#ddd6fe" stroke="none" />
              <circle cx="168" cy="122" r="3.4" fill="#ddd6fe" stroke="none" />
              {/* Nose bridge and nostrils */}
              <path strokeWidth="1.5" d="M135 116 L130 151 Q135 159 142 151 M121 162 Q135 168 149 162" />
              {/* Cheek contours */}
              <path strokeWidth="1" opacity=".75" d="M70 145 Q85 158 111 157 M159 157 Q185 158 200 145 M76 169 Q94 181 113 177 M157 177 Q176 181 194 169" />
              {/* Mouth: opens and closes while speech synthesis is active */}
              <path className={state === "respondendo" ? "holo-mouth-line" : ""} strokeWidth="1.8" d="M111 190 Q135 199 159 190" />
              <ellipse className={state === "respondendo" ? "holo-mouth-open" : "holo-mouth-rest"} cx="135" cy="192" rx="13" ry="2.2" fill="#c4b5fd" fillOpacity=".18" stroke="#ddd6fe" strokeWidth="1.2" />
              {/* Chin and neck topology */}
              <path strokeWidth="1" d="M102 211 Q135 225 168 211 M112 228 Q135 236 158 228 M118 251 L135 270 L152 251" opacity=".8" />
            </g>
            <g fill="#ddd6fe">
              <circle cx="135" cy="13" r="2" /><circle cx="52" cy="119" r="2" /><circle cx="218" cy="119" r="2" />
              <circle cx="58" cy="157" r="1.6" /><circle cx="212" cy="157" r="1.6" />
              <circle cx="135" cy="250" r="2" />
            </g>
          </svg>
          <div className="pointer-events-none absolute inset-0 scanlines opacity-70" />
          <div className="pointer-events-none absolute inset-0 mix-blend-screen" style={{ background: "radial-gradient(50% 40% at 50% 38%, color-mix(in oklab, var(--vio) 22%, transparent), transparent)" }} />
          {state === "respondendo" && <div className="pointer-events-none absolute inset-x-8 top-0 h-1/3 bg-gradient-to-b from-transparent via-lav/20 to-transparent" style={{ animation: "holo-scan 1.8s linear infinite" }} />}
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
