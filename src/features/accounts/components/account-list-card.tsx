import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type AccountListCardProps = {
  name: string;
  group: string;
  subtype: string;
  currencyCode: string;
  balance: number;
  categorized: boolean;
  Icon?: LucideIcon;
};

export default function AccountListCard({
  name,
  group,
  subtype,
  currencyCode,
  balance,
  categorized,
  Icon,
}: AccountListCardProps) {
  return (
    <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="rounded-2xl bg-black/90 p-3 text-white dark:bg-white dark:text-black">
          {Icon ? <Icon className="h-5 w-5" /> : null}
        </div>

        <div>
          <p className="text-base font-semibold">{name}</p>
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            <Badge>{group}</Badge>
            <Badge variant="blue">{subtype}</Badge>
            {categorized ? <Badge variant="success">Categorized</Badge> : null}
          </div>
        </div>
      </div>

      <p className="text-lg font-semibold">
        {balance.toFixed(2)} {currencyCode}
      </p>
    </Card>
  );
}
