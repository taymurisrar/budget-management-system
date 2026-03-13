import { redirect } from "next/navigation";
import AuthFormCard from "@/components/auth-form-card";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthFormCard
      mode="signup"
      eyebrow="Create account"
      title="Open a new workspace in a minute"
      description="Start with your name, email, and password. In development, the account is activated immediately."
    />
  );
}
