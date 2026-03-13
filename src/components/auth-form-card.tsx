"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, KeyRound, MailCheck, ShieldCheck } from "lucide-react";

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
  const isLogin = mode === "login";
  const [serverMessage, setServerMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"neutral" | "success" | "error">("neutral");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerMessage("");
    setMessageTone("neutral");
    const form = event.currentTarget;

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    if (isReset) {
      setServerMessage("Password reset is not configured yet.");
      setMessageTone("neutral");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(isSignup ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        setServerMessage(result.message ?? "Request failed");
        setMessageTone("error");
        return;
      }

      if (isSignup) {
        setServerMessage(result.message ?? "Account created. You can sign in now.");
        setMessageTone("success");
        form.reset();
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  const featureIcon = isReset ? KeyRound : isSignup ? MailCheck : ShieldCheck;
  const FeatureIcon = featureIcon;
  const featureTitle = isReset
    ? "Password recovery"
    : isSignup
    ? "Create a verified account"
    : "Secure sign in";
  const featureText = isReset
    ? "Keep the flow minimal. Enter your email and the reset path can be connected later."
    : isSignup
    ? "In development, new accounts are activated immediately. In production, email confirmation is required."
    : "Use your email and password to access your workspace with a server-backed session.";

  return (
    <section className="auth-card-shell">
      <div className="auth-card">
        <div className="auth-card__panel auth-card__panel--hero">
          <div className="auth-card__hero-badge">{eyebrow}</div>
          <h1 className="auth-card__title">{title}</h1>
          <p className="auth-card__description">{description}</p>

          <div className="auth-card__feature">
            <div className="auth-card__feature-icon">
              <FeatureIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="auth-card__feature-title">{featureTitle}</p>
              <p className="auth-card__feature-text">{featureText}</p>
            </div>
          </div>

          <div className="auth-card__metrics">
            <div className="auth-card__metric">
              <span className="auth-card__metric-label">Access</span>
              <span className="auth-card__metric-value">Private workspace</span>
            </div>
            <div className="auth-card__metric">
              <span className="auth-card__metric-label">Session</span>
              <span className="auth-card__metric-value">Server cookie</span>
            </div>
          </div>
        </div>

        <div className="auth-card__panel auth-card__panel--form">
          <div className="auth-card__form-header">
            <p className="auth-card__form-title">
              {isReset ? "Reset access" : isSignup ? "Create account" : "Welcome back"}
            </p>
            <p className="auth-card__form-copy">
              {isReset
                ? "Use the email attached to your account."
                : isSignup
                ? "Start with the minimum details."
                : "Sign in with the credentials for this workspace."}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignup ? (
              <label className="auth-field">
                <span>Full name</span>
                <input type="text" name="name" placeholder="Enter your full name" required />
              </label>
            ) : null}

            <label className="auth-field">
              <span>Email</span>
              <input type="email" name="email" placeholder="you@example.com" required />
            </label>

            {isSignup || isLogin ? (
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

            {serverMessage ? (
              <div className={`auth-message auth-message--${messageTone}`}>{serverMessage}</div>
            ) : null}

            <button type="submit" className="auth-submit">
              <span>
                {isSubmitting
                  ? "Please wait..."
                  : isReset
                  ? "Send reset link"
                  : isSignup
                  ? "Create account"
                  : "Sign in"}
              </span>
              {!isSubmitting ? <ArrowRight className="h-4 w-4" /> : null}
            </button>
          </form>

          <div className="auth-links">
            {mode !== "login" ? <Link href="/">Back to login</Link> : null}
            {mode === "login" ? <Link href="/signup">Create account</Link> : null}
            {mode === "login" ? <Link href="/reset-password">Reset password</Link> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
