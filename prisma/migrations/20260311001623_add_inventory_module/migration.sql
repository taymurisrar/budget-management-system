-- CreateEnum
CREATE TYPE "InventoryUnit" AS ENUM ('piece', 'pack', 'bottle', 'tube', 'kg', 'g', 'l', 'ml', 'box', 'bag');

-- CreateTable
CREATE TABLE "InventoryCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "unit" "InventoryUnit" NOT NULL,
    "currentQuantity" DECIMAL(12,3) NOT NULL,
    "minQuantity" DECIMAL(12,3) NOT NULL,
    "reorderQuantity" DECIMAL(12,3),
    "preferredCurrencyCode" TEXT NOT NULL DEFAULT 'QAR',
    "averageUnitCost" DECIMAL(12,3),
    "estimatedDailyUsage" DECIMAL(12,3),
    "lastPurchaseDate" TIMESTAMP(3),
    "nextRestockDate" TIMESTAMP(3),
    "notes" TEXT,
    "iconKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitPrice" DECIMAL(12,3),
    "totalPrice" DECIMAL(12,3),
    "currencyCode" TEXT NOT NULL DEFAULT 'QAR',
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "storeName" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryConsumption" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantityUsed" DECIMAL(12,3) NOT NULL,
    "usageDate" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryCategory_userId_idx" ON "InventoryCategory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCategory_userId_name_key" ON "InventoryCategory"("userId", "name");

-- CreateIndex
CREATE INDEX "InventoryItem_userId_idx" ON "InventoryItem"("userId");

-- CreateIndex
CREATE INDEX "InventoryItem_categoryId_idx" ON "InventoryItem"("categoryId");

-- CreateIndex
CREATE INDEX "InventoryItem_name_idx" ON "InventoryItem"("name");

-- CreateIndex
CREATE INDEX "InventoryPurchase_userId_idx" ON "InventoryPurchase"("userId");

-- CreateIndex
CREATE INDEX "InventoryPurchase_itemId_idx" ON "InventoryPurchase"("itemId");

-- CreateIndex
CREATE INDEX "InventoryPurchase_purchaseDate_idx" ON "InventoryPurchase"("purchaseDate");

-- CreateIndex
CREATE INDEX "InventoryConsumption_userId_idx" ON "InventoryConsumption"("userId");

-- CreateIndex
CREATE INDEX "InventoryConsumption_itemId_idx" ON "InventoryConsumption"("itemId");

-- CreateIndex
CREATE INDEX "InventoryConsumption_usageDate_idx" ON "InventoryConsumption"("usageDate");

-- AddForeignKey
ALTER TABLE "InventoryCategory" ADD CONSTRAINT "InventoryCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InventoryCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryPurchase" ADD CONSTRAINT "InventoryPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryPurchase" ADD CONSTRAINT "InventoryPurchase_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryConsumption" ADD CONSTRAINT "InventoryConsumption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryConsumption" ADD CONSTRAINT "InventoryConsumption_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
