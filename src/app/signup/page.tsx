import AuthFormCard from "@/components/auth-form-card";

export default function SignupPage() {
  return (
    <AuthFormCard
      mode="signup"
      eyebrow="Create account"
      title="Set up your budget workspace"
      description="Create a simple account to start tracking accounts, goals, spending activity, and household stock."
    />
  );
}
