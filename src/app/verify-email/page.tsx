import Link from "next/link";
import { confirmEmail } from "@/lib/auth/auth.service";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let title = "Verify your email";
  let description = "The confirmation link is missing.";

  if (token) {
    try {
      await confirmEmail(token);
      title = "Email confirmed";
      description = "Your email has been confirmed. You can sign in now.";
    } catch (error) {
      description =
        error instanceof Error ? error.message : "This verification link is invalid or expired.";
    }
  }

  return (
    <section className="auth-card-shell">
      <div className="auth-card">
        <div className="auth-card__intro">
          <span className="auth-card__eyebrow">Email verification</span>
          <h1 className="auth-card__title">{title}</h1>
          <p className="auth-card__description">{description}</p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-500 dark:text-slate-300">
          <Link href="/">Back to login</Link>
          <Link href="/signup">Create another account</Link>
        </div>
      </div>
    </section>
  );
}
