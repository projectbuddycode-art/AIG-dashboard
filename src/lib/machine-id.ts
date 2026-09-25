import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomSegment(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function generateMachineId(): string {
  return `AIG-${randomSegment(4)}-${randomSegment(4)}`;
}

export function isValidMachineIdFormat(value: string): boolean {
  return /^AIG-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/.test(
    value.trim().toUpperCase(),
  );
}

export function normalizeMachineId(value: string): string {
  return value.trim().toUpperCase();
}
