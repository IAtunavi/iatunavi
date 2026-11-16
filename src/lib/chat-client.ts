import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { authHeaders, buildAiContext } from "./ai-context";
import { prefsStore } from "./data";

const STORAGE_KEY = "tunavi.chat.v1";
let chat: Chat<UIMessage> | null = null;

function loadMessages(): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UIMessage[]) : [];
  } catch {
    return [];
  }
}

export function saveMessages(messages: UIMessage[]) {
  if (typeof window === "undefined") return;
  if (!prefsStore.get().saveHistory) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-200)));
  } catch {
    /* storage full */
  }
}

export function clearSavedMessages() {
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
}

/** One shared conversation for the whole app (dashboard composer + chat page). */
export function getChat() {
  if (chat) return chat;
  chat = new Chat<UIMessage>({
    id: "tunavi-main",
    messages: loadMessages(),
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: async ({ messages, body }) => ({
        body: { ...(body ?? {}), messages, context: buildAiContext() },
        headers: await authHeaders(),
      }),
    }),
  });
  return chat;
}

export function messageText(m: UIMessage) {
  return m.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}
