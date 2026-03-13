import { redirect } from "next/navigation";
import AuthFormCard from "@/components/auth-form-card";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthFormCard
      mode="login"
      eyebrow="Budget Management System"
      title="Sign in and continue where you left off"
      description="Track accounts, spending, budgets, and inventory from one clean workspace."
    />
  );
}
