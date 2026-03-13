import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/auth/email";
import { isDevelopmentEnvironment, isProductionEnvironment } from "@/lib/env";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

function hashVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createVerificationToken() {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashVerificationToken(token),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
  };
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  const email = input.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new Error("An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const verification = createVerificationToken();
  const shouldRequireVerification = isProductionEnvironment();

  if (isDevelopmentEnvironment()) {
    console.log(`[auth:dev] signup password for ${email}: ${input.password}`);
  }

  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      passwordHash,
      emailVerifiedAt: shouldRequireVerification ? null : new Date(),
      emailVerificationTokenHash: shouldRequireVerification ? verification.tokenHash : null,
      emailVerificationTokenExpiry: shouldRequireVerification ? verification.expiresAt : null,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (shouldRequireVerification) {
    await sendVerificationEmail({
      email: user.email,
      name: user.name,
      token: verification.token,
    });
  }

  return user;
}

export async function confirmEmail(token: string) {
  const tokenHash = hashVerificationToken(token);
  const user = await prisma.user.findFirst({
    where: {
      emailVerificationTokenHash: tokenHash,
      emailVerificationTokenExpiry: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      emailVerifiedAt: true,
    },
  });

  if (!user) {
    throw new Error("This verification link is invalid or has expired");
  }

  if (user.emailVerifiedAt) {
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationTokenHash: null,
      emailVerificationTokenExpiry: null,
    },
  });
}

export async function authenticateUser(input: { email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      emailVerifiedAt: true,
    },
  });

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new Error("Invalid email or password");
  }

  if (!user.emailVerifiedAt) {
    throw new Error("Confirm your email before signing in");
  }

  return {
    id: user.id,
    email: user.email,
  };
}
