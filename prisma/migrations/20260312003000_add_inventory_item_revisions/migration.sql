-- CreateEnum
CREATE TYPE "InventoryItemRevisionType" AS ENUM ('created', 'updated', 'restocked');

-- AlterTable
ALTER TABLE "InventoryItem"
ADD COLUMN "householdUserCount" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "InventoryItemRevision" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "revisionType" "InventoryItemRevisionType" NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "subcategory" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "unit" "InventoryUnit" NOT NULL,
    "currentQuantity" DECIMAL(12,3) NOT NULL,
    "inUseQuantity" DECIMAL(12,3),
    "minQuantity" DECIMAL(12,3) NOT NULL,
    "reorderQuantity" DECIMAL(12,3),
    "packageQuantity" DECIMAL(12,3),
    "packageUnit" "InventoryUnit",
    "unitSizeValue" DECIMAL(12,3),
    "unitSizeUnit" "InventoryUnit",
    "householdUserCount" INTEGER NOT NULL DEFAULT 1,
    "preferredCurrencyCode" TEXT NOT NULL DEFAULT 'QAR',
    "averageUnitCost" DECIMAL(12,3),
    "lastPurchaseTotalCost" DECIMAL(12,3),
    "estimatedDailyUsage" DECIMAL(12,3),
    "lastPurchaseDate" TIMESTAMP(3),
    "lastConsumptionDate" TIMESTAMP(3),
    "nextRestockDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "notes" TEXT,
    "changeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryItemRevision_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InventoryItemRevision" ADD CONSTRAINT "InventoryItemRevision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryItemRevision" ADD CONSTRAINT "InventoryItemRevision_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryItemRevision" ADD CONSTRAINT "InventoryItemRevision_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InventoryCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "InventoryItemRevision_userId_idx" ON "InventoryItemRevision"("userId");
CREATE INDEX "InventoryItemRevision_itemId_createdAt_idx" ON "InventoryItemRevision"("itemId", "createdAt");
CREATE INDEX "InventoryItemRevision_categoryId_idx" ON "InventoryItemRevision"("categoryId");
