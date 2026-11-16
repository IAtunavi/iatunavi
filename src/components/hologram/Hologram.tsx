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

        {/* Realistic male bust hologram */}
        <div
          className="relative mt-0 h-[310px] w-[300px] overflow-hidden"
          style={{
            animation: state === "respondendo" ? "holo-pulse-glow 1.2s ease-in-out infinite" : "holo-breathe 5s ease-in-out infinite",
            filter: "drop-shadow(0 0 18px color-mix(in oklab, var(--vio) 45%, transparent))",
          }}
        >
          <svg viewBox="0 0 300 310" className="absolute inset-0 h-full w-full" role="presentation" aria-hidden="true">
            <defs>
              <linearGradient id="bust-skin" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ede9fe" stopOpacity=".82"/>
                <stop offset=".38" stopColor="#a78bfa" stopOpacity=".52"/>
                <stop offset=".72" stopColor="#7c3aed" stopOpacity=".34"/>
                <stop offset="1" stopColor="#ddd6fe" stopOpacity=".68"/>
              </linearGradient>
              <linearGradient id="bust-shadow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#c4b5fd" stopOpacity=".06"/>
                <stop offset=".5" stopColor="#7c3aed" stopOpacity=".3"/>
                <stop offset="1" stopColor="#ddd6fe" stopOpacity=".12"/>
              </linearGradient>
              <radialGradient id="bust-light" cx=".48" cy=".3" r=".7">
                <stop offset="0" stopColor="#f5f3ff" stopOpacity=".58"/>
                <stop offset=".6" stopColor="#a78bfa" stopOpacity=".15"/>
                <stop offset="1" stopColor="#7c3aed" stopOpacity="0"/>
              </radialGradient>
              <linearGradient id="bust-line" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f5f3ff" stopOpacity=".95"/>
                <stop offset=".55" stopColor="#c4b5fd" stopOpacity=".82"/>
                <stop offset="1" stopColor="#8b5cf6" stopOpacity=".65"/>
              </linearGradient>
              <clipPath id="bust-clip">
                <path d="M150 17 C105 17 77 49 79 101 L84 151 C87 190 108 216 133 226 L130 250 C103 255 68 264 43 286 L33 310 H267 L257 286 C232 264 197 255 170 250 L167 226 C192 216 213 190 216 151 L221 101 C223 49 195 17 150 17Z"/>
              </clipPath>
              <pattern id="bust-grid" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M8 0H0V8" fill="none" stroke="#ddd6fe" strokeOpacity=".18" strokeWidth=".55"/>
              </pattern>
            </defs>
            <ellipse cx="150" cy="145" rx="130" ry="150" fill="url(#bust-light)"/>
            {/* Neck, shoulders and chest silhouette */}
            <path d="M130 213 L130 251 C100 256 67 265 43 286 L33 310 H267 L257 286 C233 265 200 256 170 251 L170 213Z" fill="url(#bust-skin)" fillOpacity=".28" stroke="url(#bust-line)" strokeWidth="1.8"/>
            <path d="M130 229 Q150 244 170 229 M130 251 Q150 267 170 251 M92 271 Q116 280 130 310 M208 271 Q184 280 170 310" fill="none" stroke="url(#bust-line)" strokeWidth="1.25"/>
            <path d="M118 253 L150 291 L182 253 M104 264 L130 310 M196 264 L170 310" fill="none" stroke="#ddd6fe" strokeOpacity=".38" strokeWidth="1"/>
            {/* Face volume */}
            <path d="M150 17 C105 17 77 49 79 101 L84 151 C87 190 108 216 150 231 C192 216 213 190 216 151 L221 101 C223 49 195 17 150 17Z" fill="url(#bust-skin)" fillOpacity=".34" stroke="url(#bust-line)" strokeWidth="2"/>
            <g clipPath="url(#bust-clip)">
              <rect x="70" y="10" width="160" height="250" fill="url(#bust-shadow)"/>
              <rect x="70" y="10" width="160" height="250" fill="url(#bust-grid)"/>
              {/* Sculpted planes and cheek shading */}
              <path d="M82 112 Q94 87 120 100 Q107 125 111 169 Q96 158 82 145Z M218 112 Q206 87 180 100 Q193 125 189 169 Q204 158 218 145Z" fill="#c4b5fd" fillOpacity=".16"/>
              <path d="M92 169 Q111 183 132 174 M208 169 Q189 183 168 174 M112 208 Q150 225 188 208" fill="none" stroke="#ddd6fe" strokeOpacity=".48" strokeWidth="1"/>
              {/* Hair cap and hairline */}
              <path d="M79 105 C73 49 103 10 151 12 C202 12 229 51 221 107 L209 91 Q203 65 184 57 Q159 73 119 57 Q99 69 91 96Z" fill="#a78bfa" fillOpacity=".22" stroke="url(#bust-line)" strokeWidth="1.6"/>
              <path d="M91 91 Q105 42 149 37 Q190 37 210 91 M104 57 Q123 31 151 28 M151 28 Q184 31 198 57" fill="none" stroke="#ddd6fe" strokeOpacity=".68" strokeWidth="1.2"/>
              {/* Ears */}
              <path d="M82 122 Q66 108 65 137 Q66 165 87 170 M218 122 Q234 108 235 137 Q234 165 213 170" fill="none" stroke="url(#bust-line)" strokeWidth="2"/>
              <path d="M80 133 Q72 128 75 151 Q79 160 85 157 M220 133 Q228 128 225 151 Q221 160 215 157" fill="none" stroke="#ddd6fe" strokeOpacity=".7" strokeWidth="1"/>
              {/* Brow ridge and eyes */}
              <path d="M96 111 Q117 96 139 111 M161 111 Q183 96 204 111" fill="none" stroke="#f5f3ff" strokeOpacity=".9" strokeWidth="3" strokeLinecap="round"/>
              <path d="M98 126 Q117 113 138 126 Q119 141 98 126Z M162 126 Q183 113 202 126 Q181 141 162 126Z" fill="#160d2b" fillOpacity=".62" stroke="url(#bust-line)" strokeWidth="1.5"/>
              <path d="M101 126 Q118 118 135 126 M165 126 Q182 118 199 126" fill="none" stroke="#ddd6fe" strokeOpacity=".85" strokeWidth="1"/>
              <ellipse cx="118" cy="126" rx="4.2" ry="5" fill="#ede9fe" filter="url(#bust-eye-glow)"/>
              <ellipse cx="182" cy="126" rx="4.2" ry="5" fill="#ede9fe"/>
              <circle cx="118" cy="126" r="1.8" fill="#7c3aed"/><circle cx="182" cy="126" r="1.8" fill="#7c3aed"/>
              {/* Nose bridge, tip and nostrils */}
              <path d="M150 121 L143 159 Q145 168 150 169 Q155 168 157 159 L150 121Z" fill="#c4b5fd" fillOpacity=".12" stroke="#ddd6fe" strokeOpacity=".82" strokeWidth="1.3"/>
              <path d="M137 170 Q150 177 163 170 M140 171 Q150 166 160 171" fill="none" stroke="url(#bust-line)" strokeWidth="1.3"/>
              {/* Moustache-free mouth and lips */}
              <path d="M130 190 Q140 184 150 189 Q160 184 170 190 Q160 198 150 196 Q140 198 130 190Z" fill="#c4b5fd" fillOpacity=".18" stroke="#ddd6fe" strokeWidth="1.3"/>
              <path d="M133 190 Q150 194 167 190" fill="none" stroke="#f5f3ff" strokeOpacity=".8" strokeWidth="1"/>
              <ellipse className={state === "respondendo" ? "holo-mouth-open" : "holo-mouth-rest"} cx="150" cy="193" rx="12" ry="3.2" fill="#160d2b" fillOpacity=".75" stroke="#ddd6fe" strokeWidth="1.2"/>
              {/* Jaw, chin and facial structure */}
              <path d="M91 157 Q99 202 132 218 Q150 228 168 218 Q201 202 209 157 M119 210 Q150 221 181 210" fill="none" stroke="#ddd6fe" strokeOpacity=".62" strokeWidth="1.2"/>
              <path d="M105 181 Q119 188 132 181 M168 181 Q181 188 195 181" fill="none" stroke="#c4b5fd" strokeOpacity=".55" strokeWidth="1"/>
              {/* Fine wireframe contour lines */}
              <path d="M82 79 Q150 54 218 79 M79 97 Q150 75 221 97 M81 146 Q150 130 219 146 M87 174 Q150 164 213 174 M100 197 Q150 192 200 197 M119 218 Q150 231 181 218" fill="none" stroke="#ddd6fe" strokeOpacity=".42" strokeWidth=".8"/>
              <path d="M108 18 Q93 91 111 163 Q118 199 150 231 M192 18 Q207 91 189 163 Q182 199 150 231 M130 15 Q121 95 132 165 M170 15 Q179 95 168 165" fill="none" stroke="#ddd6fe" strokeOpacity=".34" strokeWidth=".8"/>
            </g>
            {/* Projection highlights and scanning light */}
            <path d="M150 17 C105 17 77 49 79 101 L84 151 C87 190 108 216 150 231 C192 216 213 190 216 151 L221 101 C223 49 195 17 150 17Z" fill="none" stroke="#f5f3ff" strokeOpacity=".48" strokeWidth=".8"/>
            <path d="M47 286 Q150 245 253 286" fill="none" stroke="#c4b5fd" strokeOpacity=".7" strokeWidth="1.2"/>
            <g fill="#ddd6fe">
              <circle cx="150" cy="17" r="2"/><circle cx="79" cy="101" r="1.8"/><circle cx="221" cy="101" r="1.8"/>
              <circle cx="84" cy="151" r="1.6"/><circle cx="216" cy="151" r="1.6"/><circle cx="150" cy="231" r="2"/>
            </g>
          </svg>
          <div className="pointer-events-none absolute inset-0 scanlines opacity-55"/>
          <div className="pointer-events-none absolute inset-0" style={{background:"radial-gradient(55% 48% at 50% 36%, color-mix(in oklab, var(--vio) 18%, transparent), transparent)"}}/>
          {state === "respondendo" && <div className="pointer-events-none absolute inset-x-8 top-0 h-1/3 bg-gradient-to-b from-transparent via-lav/20 to-transparent" style={{animation:"holo-scan 1.8s linear infinite"}}/>}
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
