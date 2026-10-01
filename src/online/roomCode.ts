import type { RoomCode } from "./types.ts";

export const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function normalizeRoomCode(value: string): RoomCode | null {
  const code = value.trim().toUpperCase();
  return /^[A-HJ-NP-Z2-9]{6}$/.test(code) ? code as RoomCode : null;
}
export function invitationUrl(origin: string, code: RoomCode): string {
  const url = new URL("/", origin);
  url.searchParams.set("room", code);
  return url.href;
}
