import AuthFormCard from "@/components/auth-form-card";

export default function ResetPasswordPage() {
  return (
    <AuthFormCard
      mode="reset"
      eyebrow="Password reset"
      title="Reset your password"
      description="Enter your username or email and the app will prepare a password reset flow."
    />
  );
}
