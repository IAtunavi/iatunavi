import { useCallback, useEffect, useRef, useState } from "react";
import { setActivity } from "./assistant";
import { prefsStore } from "./data";

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function getRecognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Browser speech-to-text in pt-BR. Drives the hologram's "Ouvindo" state. */
export function useSpeechInput(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
    return () => {
      recRef.current?.abort();
      setActivity("mic", null);
    };
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("Seu navegador não oferece reconhecimento de voz. Experimente o Chrome ou o Edge.");
      return;
    }
    setError(null);
    const rec = new Ctor();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setInterim(interimText);
      if (finalText.trim()) finalRef.current(finalText.trim());
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed") setError("Permita o uso do microfone para falar com a TUNAVI.");
      else if (e.error !== "aborted" && e.error !== "no-speech") setError("Não consegui ouvir. Tente novamente.");
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
      setActivity("mic", null);
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
    setActivity("mic", "ouvindo");
  }, []);

  return { listening, interim, error, supported, start, stop, toggle: listening ? stop : start };
}

export function getPtVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("pt"));
}

/** Read text aloud with the voice settings from the Voz module. */
export function speak(text: string, overrides?: { rate?: number; pitch?: number; voiceName?: string }) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const clean = text.replace(/```[\s\S]*?```/g, " código omitido ").replace(/[#*_`>|-]/g, " ").slice(0, 1200);
  const prefs = prefsStore.get();
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = "pt-BR";
  u.rate = overrides?.rate ?? prefs.voiceRate;
  u.pitch = overrides?.pitch ?? prefs.voicePitch;
  const name = overrides?.voiceName ?? prefs.voiceName;
  const voice = window.speechSynthesis.getVoices().find((v) => v.name === name) ?? getPtVoices()[0];
  if (voice) u.voice = voice;
  u.onstart = () => setActivity("voice", "respondendo");
  u.onend = () => setActivity("voice", null);
  u.onerror = () => setActivity("voice", null);
  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  setActivity("voice", null);
}
