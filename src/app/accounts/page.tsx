import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import AccountListCard from "@/features/accounts/components/account-list-card";
import AccountPageShell from "@/features/accounts/components/account-page-shell";
import { prisma } from "@/lib/prisma";
import { accountIconMap } from "@/features/accounts/account-icons";
import { requireCurrentUser } from "@/lib/auth/current-user";

export default async function AccountsPage() {
  const user = await requireCurrentUser();
  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AccountPageShell
      title="Accounts"
      description="Track where your money lives."
      action={
        <Link href="/accounts/new" className={buttonClassName({ size: "md" })}>
          Add Account
        </Link>
      }
    >
      <div className="grid gap-4">
        {accounts.map((account) => {
          const Icon = accountIconMap[account.iconKey ?? account.subtype];

          return (
            <AccountListCard
              key={account.id}
              name={account.name}
              group={account.group}
              subtype={account.subtype}
              currencyCode={account.currencyCode}
              balance={Number(account.balance ?? 0)}
              categorized={
                typeof account.details === "object" &&
                account.details !== null &&
                "categoryId" in account.details
              }
              Icon={Icon}
            />
          );
        })}
      </div>
    </AccountPageShell>
  );
}
