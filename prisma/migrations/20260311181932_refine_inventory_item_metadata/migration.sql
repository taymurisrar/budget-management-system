-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InventoryUnit" ADD VALUE 'small_piece';
ALTER TYPE "InventoryUnit" ADD VALUE 'large_piece';
ALTER TYPE "InventoryUnit" ADD VALUE 'lb';
ALTER TYPE "InventoryUnit" ADD VALUE 'oz';
ALTER TYPE "InventoryUnit" ADD VALUE 'carton';
ALTER TYPE "InventoryUnit" ADD VALUE 'sachet';
ALTER TYPE "InventoryUnit" ADD VALUE 'dozen';
ALTER TYPE "InventoryUnit" ADD VALUE 'gallon';

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "inUseQuantity" DECIMAL(12,3),
ADD COLUMN     "lastPurchaseTotalCost" DECIMAL(12,3),
ADD COLUMN     "packageQuantity" DECIMAL(12,3),
ADD COLUMN     "packageUnit" "InventoryUnit",
ADD COLUMN     "subcategory" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "unitSizeUnit" "InventoryUnit",
ADD COLUMN     "unitSizeValue" DECIMAL(12,3);

-- CreateIndex
CREATE INDEX "InventoryItem_subcategory_idx" ON "InventoryItem"("subcategory");
