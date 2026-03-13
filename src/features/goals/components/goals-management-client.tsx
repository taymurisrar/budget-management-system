"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CircleDollarSign,
  Clock3,
  Flag,
  Pencil,
  PiggyBank,
  Plus,
  Rocket,
  Target,
  Trash2,
  Trophy,
  Wallet,
} from "lucide-react";
import LocalizedDateText from "@/components/localized-date-text";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormHint, FormLabel, Input, Select, Textarea } from "@/components/ui/form-controls";

type AccountOption = {
  id: string;
  name: string;
  iconKey: string | null;
};

type GoalItem = {
  id: string;
  name: string;
  type: "free_saving" | "circle_saving";
  status: "active" | "completed" | "paused" | "archived";
  iconKey: string | null;
  note: string | null;
  currencyCode: string;
  initialAmount: number | string;
  currentAmount: number | string;
  targetAmount: number | string;
  contributionAmount: number | string | null;
  frequency: "daily" | "weekly" | "monthly" | null;
  sourceAccountId: string | null;
  destinationAccountId: string | null;
  startDate: string | null;
  endDate: string | null;
  lastContributionDate: string | null;
  completedAt: string | null;
  sourceAccount: AccountOption | null;
  destinationAccount: AccountOption | null;
};

type GoalFormState = {
  name: string;
  type: "free_saving" | "circle_saving";
  status: "active" | "completed" | "paused" | "archived";
  iconKey: string;
  note: string;
  initialAmount: string;
  currentAmount: string;
  targetAmount: string;
  contributionAmount: string;
  frequency: "" | "daily" | "weekly" | "monthly";
  sourceAccountId: string;
  destinationAccountId: string;
  startDate: string;
  endDate: string;
};

type ApiErrorResponse = {
  message?: string;
  errors?: unknown;
};

const iconOptions = [
  { value: "target", label: "Target", icon: Target },
  { value: "piggy-bank", label: "Piggy Bank", icon: PiggyBank },
  { value: "rocket", label: "Rocket", icon: Rocket },
  { value: "wallet", label: "Wallet", icon: Wallet },
  { value: "flag", label: "Flag", icon: Flag },
  { value: "trophy", label: "Trophy", icon: Trophy },
  { value: "circle-dollar", label: "Circle Dollar", icon: CircleDollarSign },
] as const;

const emptyFormState: GoalFormState = {
  name: "",
  type: "free_saving",
  status: "active",
  iconKey: "target",
  note: "",
  initialAmount: "0",
  currentAmount: "0",
  targetAmount: "",
  contributionAmount: "",
  frequency: "",
  sourceAccountId: "",
  destinationAccountId: "",
  startDate: "",
  endDate: "",
};

function toDateInputValue(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function getGoalIcon(iconKey: string | null) {
  return iconOptions.find((option) => option.value === iconKey)?.icon ?? Target;
}

function formatGoalType(type: GoalItem["type"]) {
  return type === "free_saving" ? "Free Saving" : "Circle Saving";
}

function formatStatus(status: GoalItem["status"]) {
  return status.replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatFrequency(frequency: GoalItem["frequency"]) {
  return frequency ? frequency.replace(/\b\w/g, (char) => char.toUpperCase()) : "Flexible";
}

function buildInitialFormState(goal?: GoalItem | null): GoalFormState {
  if (!goal) {
    return emptyFormState;
  }

  return {
    name: goal.name,
    type: goal.type,
    status: goal.status,
    iconKey: goal.iconKey ?? "target",
    note: goal.note ?? "",
    initialAmount: String(toNumber(goal.initialAmount)),
    currentAmount: String(toNumber(goal.currentAmount)),
    targetAmount: String(toNumber(goal.targetAmount)),
    contributionAmount:
      goal.contributionAmount == null ? "" : String(toNumber(goal.contributionAmount)),
    frequency: goal.frequency ?? "",
    sourceAccountId: goal.sourceAccountId ?? "",
    destinationAccountId: goal.destinationAccountId ?? "",
    startDate: toDateInputValue(goal.startDate),
    endDate: toDateInputValue(goal.endDate),
  };
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <FormLabel>{children}</FormLabel>;
}

export default function GoalsManagementClient({
  goals,
  accounts,
  defaultCurrencyCode,
}: {
  goals: GoalItem[];
  accounts: AccountOption[];
  defaultCurrencyCode: string;
}) {
  const router = useRouter();
  const [selectedGoal, setSelectedGoal] = useState<GoalItem | null>(goals[0] ?? null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [formState, setFormState] = useState<GoalFormState>(emptyFormState);
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [contributingGoalId, setContributingGoalId] = useState<string | null>(null);
  const [contributionDrafts, setContributionDrafts] = useState<Record<string, string>>({});

  const totals = useMemo(() => {
    const totalSaved = goals.reduce((sum, goal) => sum + toNumber(goal.currentAmount), 0);
    const totalTarget = goals.reduce((sum, goal) => sum + toNumber(goal.targetAmount), 0);
    const activeGoals = goals.filter((goal) => goal.status === "active").length;

    return {
      totalSaved,
      totalTarget,
      activeGoals,
      remaining: Math.max(totalTarget - totalSaved, 0),
    };
  }, [goals]);

  const isEditing = editingGoalId !== null;

  function setField<K extends keyof GoalFormState>(field: K, value: GoalFormState[K]) {
    setFormState((current) => ({ ...current, [field]: value }));
  }

  function startCreate() {
    setEditingGoalId(null);
    setSelectedGoal(null);
    setServerError("");
    setFormState(emptyFormState);
  }

  function startEdit(goal: GoalItem) {
    setEditingGoalId(goal.id);
    setSelectedGoal(goal);
    setServerError("");
    setFormState(buildInitialFormState(goal));
  }

  async function submitGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setServerError("");

    const payload = {
      ...formState,
      initialAmount: Number(formState.initialAmount || 0),
      currentAmount: Number(formState.currentAmount || 0),
      targetAmount: Number(formState.targetAmount || 0),
      contributionAmount: formState.contributionAmount ? Number(formState.contributionAmount) : undefined,
      frequency: formState.type === "circle_saving" ? formState.frequency || undefined : undefined,
    };

    const endpoint = editingGoalId ? `/api/goals/${editingGoalId}` : "/api/goals";
    const method = editingGoalId ? "PATCH" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = (await response.json()) as ApiErrorResponse;
        throw new Error(result.message || "Failed to save goal");
      }

      setEditingGoalId(null);
      setFormState(emptyFormState);
      router.refresh();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Failed to save goal");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteGoal(goalId: string) {
    const confirmed = window.confirm("Delete this goal?");
    if (!confirmed) return;

    setDeletingGoalId(goalId);
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = (await response.json()) as ApiErrorResponse;
        throw new Error(result.message || "Failed to delete goal");
      }

      if (editingGoalId === goalId) {
        setEditingGoalId(null);
        setFormState(emptyFormState);
      }

      if (selectedGoal?.id === goalId) {
        setSelectedGoal(null);
      }

      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to delete goal");
    } finally {
      setDeletingGoalId(null);
    }
  }

  async function addContribution(goal: GoalItem) {
    const value = contributionDrafts[goal.id];
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert("Enter a contribution amount greater than 0.");
      return;
    }

    setContributingGoalId(goal.id);
    try {
      const response = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: goal.name,
          type: goal.type,
          status: goal.status,
          iconKey: goal.iconKey ?? "target",
          note: goal.note ?? "",
          initialAmount: toNumber(goal.initialAmount),
          currentAmount: toNumber(goal.currentAmount),
          targetAmount: toNumber(goal.targetAmount),
          contributionAmount: goal.contributionAmount == null ? undefined : toNumber(goal.contributionAmount),
          frequency: goal.frequency ?? undefined,
          sourceAccountId: goal.sourceAccountId ?? "",
          destinationAccountId: goal.destinationAccountId ?? "",
          startDate: toDateInputValue(goal.startDate),
          endDate: toDateInputValue(goal.endDate),
          contributionDelta: amount,
        }),
      });

      if (!response.ok) {
        const result = (await response.json()) as ApiErrorResponse;
        throw new Error(result.message || "Failed to add savings");
      }

      setContributionDrafts((current) => ({ ...current, [goal.id]: "" }));
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to add savings");
    } finally {
      setContributingGoalId(null);
    }
  }

  return (
    <div className="app-shell py-8">
      <section className="overflow-hidden rounded-[32px] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(236,253,245,0.88),rgba(219,234,254,0.86))] p-6 shadow-[var(--shadow-md)] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(20,83,45,0.28),rgba(12,74,110,0.42))]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700 dark:text-emerald-300">
              Goals
            </p>
            <h1 className="page-title mt-3">Build free savings and recurring saving circles in one place.</h1>
            <p className="text-muted mt-3 max-w-2xl text-sm sm:text-base">
              Every goal is stored in your default currency, can be linked to source and destination
              accounts, and supports quick saving updates without leaving the page.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
            <div className="rounded-[24px] border border-white/50 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                Total Saved
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {totals.totalSaved.toFixed(2)} {defaultCurrencyCode}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/50 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                Active Goals
              </p>
              <p className="mt-2 text-2xl font-semibold">{totals.activeGoals}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/50 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Saving Goal</p>
            <p className="mt-2 text-xl font-semibold">
              {totals.totalTarget.toFixed(2)} {defaultCurrencyCode}
            </p>
          </div>
          <div className="rounded-[24px] border border-white/50 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Remaining</p>
            <p className="mt-2 text-xl font-semibold">
              {totals.remaining.toFixed(2)} {defaultCurrencyCode}
            </p>
          </div>
          <Button type="button" onClick={startCreate} className="rounded-[24px] px-5 py-4 font-semibold">
            <Plus className="h-4 w-4" />
            New Goal
          </Button>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_0.95fr]">
        <div className="space-y-4">
          {goals.map((goal) => {
            const Icon = getGoalIcon(goal.iconKey);
            const currentAmount = toNumber(goal.currentAmount);
            const targetAmount = toNumber(goal.targetAmount);
            const progress = targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0;

            return (
              <Card
                as="article"
                key={goal.id}
                className={`rounded-[28px] p-5 ${
                  selectedGoal?.id === goal.id ? "ring-2 ring-sky-300/70" : ""
                }`}
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <button
                    type="button"
                    onClick={() => setSelectedGoal(goal)}
                    className="flex min-w-0 flex-1 items-start gap-4 text-left"
                  >
                    <div className="rounded-2xl bg-black/90 p-3 text-white dark:bg-white dark:text-black">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold">{goal.name}</h2>
                        <Badge variant="blue" className="px-3 py-1 font-medium">
                          {formatGoalType(goal.type)}
                        </Badge>
                        <Badge className="bg-slate-100 px-3 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {formatStatus(goal.status)}
                        </Badge>
                      </div>

                      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                        {goal.note || "No note added yet."}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <Badge variant="success" className="px-3 py-1">
                          {currentAmount.toFixed(2)} / {targetAmount.toFixed(2)} {goal.currencyCode}
                        </Badge>
                        <Badge className="bg-amber-50 px-3 py-1 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                          {formatFrequency(goal.frequency)}
                        </Badge>
                        {goal.sourceAccount ? (
                          <Badge className="bg-slate-100 px-3 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            From {goal.sourceAccount.name}
                          </Badge>
                        ) : null}
                        {goal.destinationAccount ? (
                          <Badge className="bg-slate-100 px-3 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            To {goal.destinationAccount.name}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </button>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => startEdit(goal)}
                      variant="secondary"
                      size="sm"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      disabled={deletingGoalId === goal.id}
                      onClick={() => void deleteGoal(goal.id)}
                      variant="danger"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingGoalId === goal.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                    <span>Funding progress</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#10b981,#0ea5e9)]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[var(--border)] bg-white/50 p-3 dark:bg-white/5">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                        <PiggyBank className="h-3.5 w-3.5" />
                        Initial
                      </div>
                      <p className="mt-2 text-base font-semibold">
                        {toNumber(goal.initialAmount).toFixed(2)} {goal.currencyCode}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[var(--border)] bg-white/50 p-3 dark:bg-white/5">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                        <Clock3 className="h-3.5 w-3.5" />
                        Schedule
                      </div>
                      <p className="mt-2 text-base font-semibold">
                        {goal.type === "circle_saving" && goal.contributionAmount != null
                          ? `${toNumber(goal.contributionAmount).toFixed(2)} ${goal.currencyCode}`
                          : "Flexible"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[var(--border)] bg-white/50 p-3 dark:bg-white/5">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                        <Calendar className="h-3.5 w-3.5" />
                        Timeline
                      </div>
                      <p className="mt-2 text-base font-semibold">
                        <LocalizedDateText value={goal.endDate} emptyText="Open" />
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={contributionDrafts[goal.id] ?? ""}
                      onChange={(event) =>
                        setContributionDrafts((current) => ({
                          ...current,
                          [goal.id]: event.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 lg:w-[180px]"
                      placeholder={`Add ${goal.currencyCode}`}
                    />
                    <Button
                      disabled={contributingGoalId === goal.id}
                      onClick={() => void addContribution(goal)}
                      className="bg-emerald-600 px-4 py-3 font-semibold text-white dark:bg-emerald-500 dark:text-white"
                    >
                      {contributingGoalId === goal.id ? "Saving..." : "Add Saving"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}

          {goals.length === 0 ? (
            <Card className="rounded-[28px] p-8 text-center">
              <p className="text-lg font-semibold">No goals yet</p>
              <p className="text-muted mt-2">
                Create a free saving goal for flexible saving, or a circle saving goal for daily,
                weekly, or monthly contributions.
              </p>
            </Card>
          ) : null}
        </div>

        <Card as="aside" className="rounded-[30px] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-sky-300">
                {isEditing ? "Edit Goal" : "Create Goal"}
              </p>
              <h2 className="section-title mt-2">
                {isEditing ? "Update an existing savings goal." : "Create a new savings target."}
              </h2>
            </div>

            <Badge className="bg-slate-100 px-3 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Base currency {defaultCurrencyCode}
            </Badge>
          </div>

          <form onSubmit={submitGoal} className="mt-6 space-y-5">
            <div>
              <FieldLabel>Goal Name</FieldLabel>
              <input
                value={formState.name}
                onChange={(event) => setField("name", event.target.value)}
                className="w-full px-4 py-3"
                placeholder="Emergency cushion, car upgrade, education fund"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Saving Type</FieldLabel>
                <select
                  value={formState.type}
                  onChange={(event) => {
                    const nextType = event.target.value as GoalFormState["type"];
                    setFormState((current) => ({
                      ...current,
                      type: nextType,
                      frequency: nextType === "circle_saving" ? current.frequency : "",
                      contributionAmount: nextType === "circle_saving" ? current.contributionAmount : "",
                    }));
                  }}
                  className="w-full px-4 py-3"
                >
                  <option value="free_saving">Free Saving</option>
                  <option value="circle_saving">Circle Saving</option>
                </select>
              </div>

              <div>
                <FieldLabel>Status</FieldLabel>
                <select
                  value={formState.status}
                  onChange={(event) => setField("status", event.target.value as GoalFormState["status"])}
                  className="w-full px-4 py-3"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="archived">Archived</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div>
              <FieldLabel>Icon</FieldLabel>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {iconOptions.map((option) => {
                  const Icon = option.icon;
                  const active = formState.iconKey === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setField("iconKey", option.value)}
                      className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm ${
                        active
                          ? "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300"
                          : "border-[var(--border)]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FormLabel>Initial Saving</FormLabel>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.initialAmount}
                  onChange={(event) => setField("initialAmount", event.target.value)}
                />
              </div>

              <div>
                <FormLabel>Saving Goal</FormLabel>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.targetAmount}
                  onChange={(event) => setField("targetAmount", event.target.value)}
                />
              </div>

              {isEditing ? (
                <div className="sm:col-span-2">
                  <FormLabel>Current Saved Amount</FormLabel>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.currentAmount}
                    onChange={(event) => setField("currentAmount", event.target.value)}
                  />
                  <FormHint>For new goals, current savings start from the initial saving amount.</FormHint>
                </div>
              ) : null}
            </div>

            {formState.type === "circle_saving" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FormLabel>Recurring Saving</FormLabel>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.contributionAmount}
                    onChange={(event) => setField("contributionAmount", event.target.value)}
                    placeholder={`Amount in ${defaultCurrencyCode}`}
                  />
                </div>

                <div>
                  <FormLabel>Frequency</FormLabel>
                  <Select
                    value={formState.frequency}
                    onChange={(event) =>
                      setField("frequency", event.target.value as GoalFormState["frequency"])
                    }
                  >
                    <option value="">Select frequency</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </Select>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FormLabel>Source Account</FormLabel>
                <Select
                  value={formState.sourceAccountId}
                  onChange={(event) => setField("sourceAccountId", event.target.value)}
                >
                  <option value="">Optional source account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <FormLabel>Destination Account</FormLabel>
                <Select
                  value={formState.destinationAccountId}
                  onChange={(event) => setField("destinationAccountId", event.target.value)}
                >
                  <option value="">Optional destination account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <FormLabel>Start Date</FormLabel>
                <Input
                  type="date"
                  value={formState.startDate}
                  onChange={(event) => setField("startDate", event.target.value)}
                />
              </div>

              <div>
                <FormLabel>End Date</FormLabel>
                <Input
                  type="date"
                  value={formState.endDate}
                  onChange={(event) => setField("endDate", event.target.value)}
                />
              </div>
            </div>

            <div>
              <FormLabel>Note</FormLabel>
              <Textarea
                value={formState.note}
                onChange={(event) => setField("note", event.target.value)}
                rows={4}
                placeholder="Why this goal exists, the savings rule, milestones, or reminders."
              />
            </div>

            {serverError ? (
              <Alert variant="error">
                {serverError}
              </Alert>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                onClick={startCreate}
                variant="secondary"
                className="px-4 py-3"
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-3"
              >
                {isSubmitting ? "Saving..." : isEditing ? "Update Goal" : "Create Goal"}
              </Button>
            </div>
          </form>
        </Card>
      </section>
    </div>
  );
}
