import { apiRequest } from "./queryClient";
import { BotSession } from "@shared/schema";

// Функции для работы с Telegram API через REST API

export async function getSessions(): Promise<BotSession[]> {
  const res = await apiRequest("GET", "/api/sessions");
  return res.json();
}

export async function getSession(id: number): Promise<BotSession> {
  const res = await apiRequest("GET", `/api/sessions/${id}`);
  return res.json();
}

export async function createSession(session: Omit<BotSession, "id" | "owner_id" | "created_at" | "status">): Promise<BotSession> {
  const res = await apiRequest("POST", "/api/sessions", session);
  return res.json();
}

export async function updateSession(id: number, session: Partial<BotSession>): Promise<BotSession> {
  const res = await apiRequest("PUT", `/api/sessions/${id}`, session);
  return res.json();
}

export async function deleteSession(id: number): Promise<void> {
  await apiRequest("DELETE", `/api/sessions/${id}`);
}

export async function connectSession(id: number): Promise<any> {
  const res = await apiRequest("POST", `/api/sessions/${id}/connect`);
  return res.json();
}

export async function disconnectSession(id: number): Promise<any> {
  const res = await apiRequest("POST", `/api/sessions/${id}/disconnect`);
  return res.json();
}

export async function sendMessage(sessionId: number, chatId: string, message: string): Promise<any> {
  const res = await apiRequest("POST", `/api/sessions/${sessionId}/send-message`, {
    chatId,
    message
  });
  return res.json();
}
