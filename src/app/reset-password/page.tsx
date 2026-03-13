import AuthFormCard from "@/components/auth-form-card";

export default function ResetPasswordPage() {
  return (
    <AuthFormCard
      mode="reset"
      eyebrow="Password reset"
      title="Request a password reset"
      description="This page is ready for the reset flow. Keep the UI simple now and wire the token flow later."
    />
  );
}
