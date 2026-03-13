import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { isProductionEnvironment } from "@/lib/env";

export const SESSION_COOKIE_NAME = "bms_session";

type SessionPayload = {
  userId: string;
  email: string;
  exp: number;
};

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (secret) {
    return secret;
  }

  if (!isProductionEnvironment()) {
    return "dev-insecure-session-secret";
  }

  throw new Error("AUTH_SESSION_SECRET is not configured");
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function encodePayload(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(value: string) {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
}

export function createSessionToken(user: { id: string; email: string }) {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  };
  const encoded = encodePayload(payload);
  return `${encoded}.${sign(encoded)}`;
}

export function readSessionToken(token: string | undefined | null) {
  if (!token) {
    return null;
  }

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || sign(encoded) !== signature) {
    return null;
  }

  const payload = decodePayload(encoded);
  if (!payload || payload.exp <= Date.now()) {
    return null;
  }

  return payload;
}

export async function getSession() {
  const cookieStore = await cookies();
  return readSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}
