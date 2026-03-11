import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { accountIconMap } from "@/features/accounts/account-icons";

export default async function AccountsPage() {
  const accounts = await prisma.account.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="app-shell py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Accounts</h1>
          <p className="text-muted mt-2">Track where your money lives.</p>
        </div>

        <Link
          href="/accounts/new"
          className="rounded-2xl bg-black px-4 py-2.5 text-white shadow-lg dark:bg-white dark:text-black"
        >
          Add Account
        </Link>
      </div>

      <div className="mt-8 grid gap-4">
        {accounts.map((account) => {
          const Icon = accountIconMap[account.iconKey ?? account.subtype];

          return (
            <div
              key={account.id}
              className="glass-card flex items-center justify-between p-5"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-black/90 p-3 text-white dark:bg-white dark:text-black">
                  {Icon ? <Icon className="h-5 w-5" /> : null}
                </div>

                <div>
                  <p className="text-base font-semibold">{account.name}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-black/5 px-2.5 py-1 dark:bg-white/10">
                      {account.group}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                      {account.subtype}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-lg font-semibold">
                {Number(account.balance ?? 0).toFixed(2)} {account.currencyCode}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
