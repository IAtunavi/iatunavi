import { useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { toast } from "sonner";
import { getChat, messageText, saveMessages } from "@/lib/chat-client";
import { setActivity } from "@/lib/assistant";
import { logActivity, prefsStore } from "@/lib/data";
import { playSound } from "@/lib/sound";
import { speak } from "@/lib/voice";
import { readErrorMessage } from "@/lib/ai-context";

/** Keeps the shared conversation saved and mirrors its status in the hologram. */
export function ChatBridge() {
  const { messages, status, error } = useChat({ chat: getChat() });
  const prev = useRef(status);

  useEffect(() => {
    setActivity("chat", status === "submitted" ? "processando" : status === "streaming" ? "respondendo" : null);
    const was = prev.current;
    prev.current = status;
    if (status === "ready" || status === "error") saveMessages(messages);
    if ((was === "streaming" || was === "submitted") && status === "ready") {
      const last = messages.at(-1);
      if (last?.role === "assistant") {
        playSound("receive");
        const text = messageText(last);
        logActivity(`TUNAVI respondeu: ${text.slice(0, 48)}${text.length > 48 ? "…" : ""}`);
        if (prefsStore.get().autoSpeak && text) speak(text);
      }
    }
  }, [status, messages]);

  useEffect(() => {
    if (error) {
      playSound("error");
      toast.error(readErrorMessage(error));
    }
  }, [error]);

  useEffect(() => () => setActivity("chat", null), []);
  return null;
}
