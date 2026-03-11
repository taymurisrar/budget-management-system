import { prisma } from "@/lib/prisma";
import CreateAccountForm from "@/features/accounts/components/create-account-form";

export default async function NewAccountPage() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!user) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">New Account</h1>
        <p className="mt-2 text-red-600">No user found in database.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">New Account</h1>
      <p className="mt-2 text-gray-600">Create a new place for your money.</p>
      <CreateAccountForm userId={user.id} />
    </div>
  );
}