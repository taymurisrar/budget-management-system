import CreateAccountForm from "@/features/accounts/components/create-account-form";
import AccountPageShell from "@/features/accounts/components/account-page-shell";
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
    <AccountPageShell
      title="New Account"
      description="Create a new place for your money."
    >
      <CreateAccountForm
        userId={user.id}
        defaultCurrencyCode={user.baseCurrencyCode}
        categories={categories}
      />
    </AccountPageShell>
  );
}
