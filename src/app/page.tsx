import AuthFormCard from "@/components/auth-form-card";

export default function LoginPage() {
  return (
    <AuthFormCard
      mode="login"
      eyebrow="Budget Management System"
      title="Sign in to your workspace"
      description="Use your username and password to enter the dashboard, review your budgets, and manage inventory."
    />
  );
}
