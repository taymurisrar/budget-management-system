import { z } from "zod";

export const goalTypes = ["free_saving", "circle_saving"] as const;
export const goalFrequencies = ["daily", "weekly", "monthly"] as const;
export const goalStatuses = ["active", "completed", "paused", "archived"] as const;

const optionalDateString = z.string().optional().or(z.literal(""));

const baseGoalSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(2).max(120),
  type: z.enum(goalTypes),
  status: z.enum(goalStatuses).default("active"),
  iconKey: z.string().min(1).max(40).optional().or(z.literal("")),
  note: z.string().max(1000).optional().or(z.literal("")),
  sourceAccountId: z.string().optional().or(z.literal("")),
  destinationAccountId: z.string().optional().or(z.literal("")),
  startDate: optionalDateString,
  endDate: optionalDateString,
  initialAmount: z.coerce.number().min(0),
  targetAmount: z.coerce.number().positive(),
  currentAmount: z.coerce.number().min(0).optional(),
  contributionAmount: z.coerce.number().min(0).optional(),
  frequency: z.enum(goalFrequencies).optional(),
  contributionDelta: z.coerce.number().positive().optional(),
});

export const createGoalSchema = baseGoalSchema
  .omit({
    currentAmount: true,
    contributionDelta: true,
  })
  .superRefine((data, ctx) => {
    if (data.endDate && data.startDate && new Date(data.endDate) < new Date(data.startDate)) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must be on or after the start date",
      });
    }

    if (data.targetAmount < data.initialAmount) {
      ctx.addIssue({
        code: "custom",
        path: ["targetAmount"],
        message: "Saving goal must be greater than or equal to initial saving",
      });
    }

    if (data.type === "circle_saving") {
      if (!data.frequency) {
        ctx.addIssue({
          code: "custom",
          path: ["frequency"],
          message: "Circle saving goals require a frequency",
        });
      }

      if (data.contributionAmount == null || data.contributionAmount <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["contributionAmount"],
          message: "Circle saving goals require a recurring saving amount",
        });
      }
    }
  });

export const updateGoalSchema = baseGoalSchema
  .extend({
    id: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    if (data.endDate && data.startDate && new Date(data.endDate) < new Date(data.startDate)) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must be on or after the start date",
      });
    }

    const effectiveCurrentAmount = data.currentAmount ?? data.initialAmount;
    if (data.targetAmount < effectiveCurrentAmount) {
      ctx.addIssue({
        code: "custom",
        path: ["targetAmount"],
        message: "Saving goal must be greater than or equal to current saving",
      });
    }

    if (data.type === "circle_saving") {
      if (!data.frequency) {
        ctx.addIssue({
          code: "custom",
          path: ["frequency"],
          message: "Circle saving goals require a frequency",
        });
      }

      if (data.contributionAmount == null || data.contributionAmount <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["contributionAmount"],
          message: "Circle saving goals require a recurring saving amount",
        });
      }
    }
  });

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
