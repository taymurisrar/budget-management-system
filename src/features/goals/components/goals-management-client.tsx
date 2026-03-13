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
  return <label className="mb-2 block text-sm font-medium">{children}</label>;
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-xs text-[var(--muted-foreground)]">{children}</p>;
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
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex items-center justify-center gap-2 rounded-[24px] bg-slate-950 px-5 py-4 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
          >
            <Plus className="h-4 w-4" />
            New Goal
          </button>
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
              <article
                key={goal.id}
                className={`glass-card rounded-[28px] p-5 ${
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
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                          {formatGoalType(goal.type)}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {formatStatus(goal.status)}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                        {goal.note || "No note added yet."}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                          {currentAmount.toFixed(2)} / {targetAmount.toFixed(2)} {goal.currencyCode}
                        </span>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                          {formatFrequency(goal.frequency)}
                        </span>
                        {goal.sourceAccount ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            From {goal.sourceAccount.name}
                          </span>
                        ) : null}
                        {goal.destinationAccount ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            To {goal.destinationAccount.name}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(goal)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-3 py-2 text-sm"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={deletingGoalId === goal.id}
                      onClick={() => void deleteGoal(goal.id)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-3 py-2 text-sm text-red-700 disabled:opacity-50 dark:border-red-500/20 dark:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingGoalId === goal.id ? "Deleting..." : "Delete"}
                    </button>
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
                    <button
                      type="button"
                      disabled={contributingGoalId === goal.id}
                      onClick={() => void addContribution(goal)}
                      className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {contributingGoalId === goal.id ? "Saving..." : "Add Saving"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          {goals.length === 0 ? (
            <div className="glass-card rounded-[28px] p-8 text-center">
              <p className="text-lg font-semibold">No goals yet</p>
              <p className="text-muted mt-2">
                Create a free saving goal for flexible saving, or a circle saving goal for daily,
                weekly, or monthly contributions.
              </p>
            </div>
          ) : null}
        </div>

        <aside className="glass-card rounded-[30px] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-sky-300">
                {isEditing ? "Edit Goal" : "Create Goal"}
              </p>
              <h2 className="section-title mt-2">
                {isEditing ? "Update an existing savings goal." : "Create a new savings target."}
              </h2>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Base currency {defaultCurrencyCode}
            </span>
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
                <FieldLabel>Initial Saving</FieldLabel>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.initialAmount}
                  onChange={(event) => setField("initialAmount", event.target.value)}
                  className="w-full px-4 py-3"
                />
              </div>

              <div>
                <FieldLabel>Saving Goal</FieldLabel>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.targetAmount}
                  onChange={(event) => setField("targetAmount", event.target.value)}
                  className="w-full px-4 py-3"
                />
              </div>

              {isEditing ? (
                <div className="sm:col-span-2">
                  <FieldLabel>Current Saved Amount</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.currentAmount}
                    onChange={(event) => setField("currentAmount", event.target.value)}
                    className="w-full px-4 py-3"
                  />
                  <FieldHint>For new goals, current savings start from the initial saving amount.</FieldHint>
                </div>
              ) : null}
            </div>

            {formState.type === "circle_saving" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Recurring Saving</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.contributionAmount}
                    onChange={(event) => setField("contributionAmount", event.target.value)}
                    className="w-full px-4 py-3"
                    placeholder={`Amount in ${defaultCurrencyCode}`}
                  />
                </div>

                <div>
                  <FieldLabel>Frequency</FieldLabel>
                  <select
                    value={formState.frequency}
                    onChange={(event) =>
                      setField("frequency", event.target.value as GoalFormState["frequency"])
                    }
                    className="w-full px-4 py-3"
                  >
                    <option value="">Select frequency</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Source Account</FieldLabel>
                <select
                  value={formState.sourceAccountId}
                  onChange={(event) => setField("sourceAccountId", event.target.value)}
                  className="w-full px-4 py-3"
                >
                  <option value="">Optional source account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel>Destination Account</FieldLabel>
                <select
                  value={formState.destinationAccountId}
                  onChange={(event) => setField("destinationAccountId", event.target.value)}
                  className="w-full px-4 py-3"
                >
                  <option value="">Optional destination account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel>Start Date</FieldLabel>
                <input
                  type="date"
                  value={formState.startDate}
                  onChange={(event) => setField("startDate", event.target.value)}
                  className="w-full px-4 py-3"
                />
              </div>

              <div>
                <FieldLabel>End Date</FieldLabel>
                <input
                  type="date"
                  value={formState.endDate}
                  onChange={(event) => setField("endDate", event.target.value)}
                  className="w-full px-4 py-3"
                />
              </div>
            </div>

            <div>
              <FieldLabel>Note</FieldLabel>
              <textarea
                value={formState.note}
                onChange={(event) => setField("note", event.target.value)}
                className="w-full rounded-2xl px-4 py-3"
                rows={4}
                placeholder="Why this goal exists, the savings rule, milestones, or reminders."
              />
            </div>

            {serverError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                {serverError}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={startCreate}
                className="rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-medium"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white shadow-lg disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {isSubmitting ? "Saving..." : isEditing ? "Update Goal" : "Create Goal"}
              </button>
            </div>
          </form>
        </aside>
      </section>
    </div>
  );
}
