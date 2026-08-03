"use client";

import { io, type Socket } from "socket.io-client";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001";

export function connectWs(token: string): Socket {
  return io(WS_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    autoConnect: true,
  });
}

export function participantTokenKey(sessionCode: string) {
  return `polloye:participant:${sessionCode.toUpperCase()}`;
}

export function saveParticipantSession(
  sessionCode: string,
  data: { token: string; participantId: string; participantName: string },
) {
  localStorage.setItem(
    participantTokenKey(sessionCode),
    JSON.stringify(data),
  );
}

export function loadParticipantSession(sessionCode: string): {
  token: string;
  participantId: string;
  participantName: string;
} | null {
  const raw = localStorage.getItem(participantTokenKey(sessionCode));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as {
      token: string;
      participantId: string;
      participantName: string;
    };
  } catch {
    return null;
  }
}
