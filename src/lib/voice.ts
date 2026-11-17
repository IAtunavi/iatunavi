import { useCallback, useEffect, useRef, useState } from "react";
import { setActivity, setVoiceMouthLevel } from "./assistant";
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
        if (!r || !r[0]) continue;
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
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("Não foi possível iniciar o microfone. Verifique a permissão e tente novamente.");
    }
    setActivity("mic", "ouvindo");
  }, []);

  return { listening, interim, error, supported, start, stop, toggle: listening ? stop : start };
}

export function getPtVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("pt"));
}

/** Prefer a masculine Brazilian/Portuguese system voice when the user has not selected one. */
export function getPreferredMaleVoice(): SpeechSynthesisVoice | undefined {
  const voices = getPtVoices();
  return voices.find((voice) => /male|masculino|daniel|jorge|antonio|ricardo|felipe|lucas/i.test(voice.name)) ?? voices[0];
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
  const voice = window.speechSynthesis.getVoices().find((v) => v.name === name) ?? getPreferredMaleVoice();
  if (voice) u.voice = voice;
  u.onstart = () => {
    setActivity("voice", "respondendo");
    setVoiceMouthLevel(0.22);
  };
  u.onboundary = (event) => {
    if (event.name !== "word") return;
    const spokenWord = clean.slice(event.charIndex, event.charIndex + (event.charLength || 12));
    const vowels = (spokenWord.match(/[aeiouáéíóúâêôãõ]/gi) ?? []).length;
    const openness = Math.min(1, 0.18 + vowels * 0.17 + (/[áéíóúâêôãõ]/i.test(spokenWord) ? 0.12 : 0));
    setVoiceMouthLevel(openness);
  };
  u.onend = () => {
    setVoiceMouthLevel(0);
    setActivity("voice", null);
  };
  u.onerror = () => {
    setVoiceMouthLevel(0);
    setActivity("voice", null);
  };
  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  setVoiceMouthLevel(0);
  setActivity("voice", null);
}


/** Continuous wake-word listener. It only runs while explicitly enabled and the tab is visible. */
export function useWakeWord(onWake: () => void, enabled: boolean) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const callbackRef = useRef(onWake);
  callbackRef.current = onWake;

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    setSupported(!!Ctor);
    if (!enabled || !Ctor || typeof document === "undefined" || document.visibilityState !== "visible") {
      setListening(false);
      return;
    }
    let disposed = false;
    let recognition: Recognition | null = null;
    let restartTimer: number | undefined;
    let wakePending = false;
    let permissionBlocked = false;
    const start = () => {
      if (disposed || permissionBlocked || document.visibilityState !== "visible") return;
      try {
        recognition = new Ctor();
        recognition.lang = "pt-BR";
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.onresult = (event) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i]?.[0]?.transcript?.toLocaleLowerCase("pt-BR") ?? "";
            if (/^\s*ol[aá]\b/.test(transcript)) {
              wakePending = true;
              recognition?.stop();
              break;
            }
          }
        };
        recognition.onerror = (event) => {
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            permissionBlocked = true;
            setError("Permissão do microfone negada. Autorize o acesso para usar a palavra de ativação.");
          } else if (event.error !== "aborted" && event.error !== "no-speech") {
            setError("A escuta por palavra-chave foi interrompida pelo navegador.");
          }
        };
        recognition.onend = () => {
          setListening(false);
          if (disposed || permissionBlocked) return;
          if (wakePending) {
            wakePending = false;
            callbackRef.current();
            // Allow the one-shot dictation recognizer to acquire the microphone first.
            restartTimer = window.setTimeout(start, 1800);
          } else if (document.visibilityState === "visible") {
            restartTimer = window.setTimeout(start, 700);
          }
        };
        recognition.start();
        setError(null);
        setListening(true);
      } catch {
        setListening(false);
        setError("Não foi possível iniciar a escuta. Verifique a permissão do microfone.");
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (restartTimer) window.clearTimeout(restartTimer);
        recognition?.stop();
        setListening(false);
      } else if (!disposed) {
        start();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    start();
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (restartTimer) window.clearTimeout(restartTimer);
      recognition?.abort();
      setListening(false);
    };
  }, [enabled]);

  return { listening, supported, error };
}
