"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";

type AuthMode = "login" | "signup" | "reset";

type AuthFormCardProps = {
  mode: AuthMode;
  eyebrow: string;
  title: string;
  description: string;
};

export default function AuthFormCard({
  mode,
  eyebrow,
  title,
  description,
}: AuthFormCardProps) {
  const router = useRouter();
  const isReset = mode === "reset";
  const isSignup = mode === "signup";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/dashboard");
  }

  return (
    <section className="auth-card-shell">
      <div className="auth-card">
        <div className="auth-card__intro">
          <span className="auth-card__eyebrow">{eyebrow}</span>
          <h1 className="auth-card__title">{title}</h1>
          <p className="auth-card__description">{description}</p>
        </div>

        <div className="auth-card__feature">
          <div className="rounded-2xl bg-white/14 p-3 text-white">
            {isReset ? <KeyRound className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Secure workspace access</p>
            <p className="mt-1 text-sm leading-6 text-sky-100/80">
              This is a front-end auth flow placeholder. Submitting any form enters the dashboard for now.
            </p>
          </div>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>{isReset ? "Username or email" : "Username"}</span>
            <input
              type={isReset ? "email" : "text"}
              name="username"
              placeholder={isReset ? "you@example.com" : "Enter your username"}
              required
            />
          </label>

          {!isReset ? (
            <label className="auth-field">
              <span>Password</span>
              <input type="password" name="password" placeholder="Enter your password" required />
            </label>
          ) : null}

          {isSignup ? (
            <label className="auth-field">
              <span>Confirm password</span>
              <input type="password" name="confirmPassword" placeholder="Repeat your password" required />
            </label>
          ) : null}

          <button type="submit" className="auth-submit">
            {isReset ? "Send reset link" : isSignup ? "Create account" : "Login"}
          </button>
        </form>

        <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-500 dark:text-slate-300">
          {mode !== "login" ? <Link href="/">Back to login</Link> : null}
          {mode === "login" ? <Link href="/signup">Create account</Link> : null}
          {mode === "login" ? <Link href="/reset-password">Reset password</Link> : null}
        </div>
      </div>
    </section>
  );
}
