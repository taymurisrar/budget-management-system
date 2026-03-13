import { findAllAccounts } from "@/features/accounts/repository/accounts.repository";
import GoalsManagementClient from "@/features/goals/components/goals-management-client";
import { findAllGoalsByUser } from "@/features/goals/repository/goals.repository";
import { requireCurrentUser } from "@/lib/auth/current-user";

export default async function GoalsPage() {
  const user = await requireCurrentUser();
  const [goals, accounts] = await Promise.all([
    findAllGoalsByUser(user.id),
    findAllAccounts(user.id),
  ]);

  return (
    <GoalsManagementClient
      goals={goals.map((goal) => ({
        ...goal,
        initialAmount: Number(goal.initialAmount),
        currentAmount: Number(goal.currentAmount),
        targetAmount: Number(goal.targetAmount),
        contributionAmount: goal.contributionAmount == null ? null : Number(goal.contributionAmount),
        startDate: goal.startDate?.toISOString() ?? null,
        endDate: goal.endDate?.toISOString() ?? null,
        lastContributionDate: goal.lastContributionDate?.toISOString() ?? null,
        completedAt: goal.completedAt?.toISOString() ?? null,
      }))}
      accounts={accounts.map((account) => ({
        id: account.id,
        name: account.name,
        iconKey: account.iconKey,
      }))}
      defaultCurrencyCode={user.baseCurrencyCode}
    />
  );
}
