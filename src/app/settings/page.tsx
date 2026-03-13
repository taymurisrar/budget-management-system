import SettingsClient from "@/components/settings-client";
import { prisma } from "@/lib/prisma";
import { defaultCurrencyCode } from "@/lib/currencies";

export default async function SettingsPage() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: {
      baseCurrencyCode: true,
    },
  });

  return (
    <SettingsClient initialBaseCurrencyCode={user?.baseCurrencyCode ?? defaultCurrencyCode} />
  );
}
