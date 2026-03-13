import CreateAccountForm from "@/features/accounts/components/create-account-form";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export default async function NewAccountPage() {
  const user = await requireCurrentUser();
  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    include: {
      subcategories: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">New Account</h1>
      <p className="mt-2 text-gray-600">Create a new place for your money.</p>
      <CreateAccountForm
        userId={user.id}
        defaultCurrencyCode={user.baseCurrencyCode}
        categories={categories}
      />
    </div>
  );
}
