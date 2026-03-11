/*
  Warnings:

  - A unique constraint covering the columns `[userId,name]` on the table `Account` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,accountId,categoryId,subcategoryId,period,month,quarter,year]` on the table `Budget` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,name,type]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,categoryId,name]` on the table `InventoryItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[categoryId,name]` on the table `Subcategory` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('posted', 'pending', 'cancelled', 'failed');

-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('monthly', 'quarterly', 'yearly');

-- CreateEnum
CREATE TYPE "InventoryItemType" AS ENUM ('consumable', 'durable');

-- CreateEnum
CREATE TYPE "InventoryConsumptionSource" AS ENUM ('manual', 'forecast_adjustment', 'auto_deduction');

-- CreateEnum
CREATE TYPE "InventoryPurchaseSource" AS ENUM ('manual', 'imported');

-- AlterEnum
ALTER TYPE "AccountSubtype" ADD VALUE 'savings_account';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InventoryUnit" ADD VALUE 'roll';
ALTER TYPE "InventoryUnit" ADD VALUE 'tray';
ALTER TYPE "InventoryUnit" ADD VALUE 'can';
ALTER TYPE "InventoryUnit" ADD VALUE 'jar';

-- DropIndex
DROP INDEX "Budget_userId_categoryId_subcategoryId_month_year_key";

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "accountNumberMask" TEXT,
ADD COLUMN     "colorHex" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "institutionName" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "alertThresholdPercent" INTEGER DEFAULT 80,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "period" "BudgetPeriod" NOT NULL DEFAULT 'monthly',
ADD COLUMN     "quarter" INTEGER,
ADD COLUMN     "spentAmount" DECIMAL(12,2),
ALTER COLUMN "month" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "colorHex" TEXT,
ADD COLUMN     "iconKey" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "InventoryCategory" ADD COLUMN     "colorHex" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "InventoryConsumption" ADD COLUMN     "context" TEXT,
ADD COLUMN     "source" "InventoryConsumptionSource" NOT NULL DEFAULT 'manual',
ADD COLUMN     "usedBy" TEXT;

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "estimatedDaysRemaining" INTEGER,
ADD COLUMN     "expiryDate" TIMESTAMP(3),
ADD COLUMN     "itemType" "InventoryItemType" NOT NULL DEFAULT 'consumable',
ADD COLUMN     "lastConsumptionDate" TIMESTAMP(3),
ADD COLUMN     "lastUnitCost" DECIMAL(12,3),
ADD COLUMN     "maxQuantity" DECIMAL(12,3),
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "storageLocation" TEXT;

-- AlterTable
ALTER TABLE "InventoryPurchase" ADD COLUMN     "baseTotalPrice" DECIMAL(12,3),
ADD COLUMN     "exchangeRate" DECIMAL(18,8),
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "source" "InventoryPurchaseSource" NOT NULL DEFAULT 'manual';

-- AlterTable
ALTER TABLE "Subcategory" ADD COLUMN     "colorHex" TEXT,
ADD COLUMN     "iconKey" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "baseAmount" DECIMAL(12,2),
ADD COLUMN     "currencyCode" TEXT,
ADD COLUMN     "exchangeRate" DECIMAL(18,8),
ADD COLUMN     "externalReference" TEXT,
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "recurringGroupKey" TEXT,
ADD COLUMN     "referenceNumber" TEXT,
ADD COLUMN     "status" "TransactionStatus" NOT NULL DEFAULT 'posted',
ADD COLUMN     "transferGroupId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "baseCurrencyCode" TEXT NOT NULL DEFAULT 'QAR',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Qatar';

-- DropEnum
DROP TYPE "AccountType";

-- CreateIndex
CREATE UNIQUE INDEX "Account_userId_name_key" ON "Account"("userId", "name");

-- CreateIndex
CREATE INDEX "Budget_year_month_idx" ON "Budget"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_userId_accountId_categoryId_subcategoryId_period_mon_key" ON "Budget"("userId", "accountId", "categoryId", "subcategoryId", "period", "month", "quarter", "year");

-- CreateIndex
CREATE INDEX "Category_type_idx" ON "Category"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_name_type_key" ON "Category"("userId", "name", "type");

-- CreateIndex
CREATE INDEX "ExchangeRate_baseCurrency_quoteCurrency_idx" ON "ExchangeRate"("baseCurrency", "quoteCurrency");

-- CreateIndex
CREATE INDEX "InventoryConsumption_source_idx" ON "InventoryConsumption"("source");

-- CreateIndex
CREATE INDEX "InventoryItem_isActive_idx" ON "InventoryItem"("isActive");

-- CreateIndex
CREATE INDEX "InventoryItem_nextRestockDate_idx" ON "InventoryItem"("nextRestockDate");

-- CreateIndex
CREATE INDEX "InventoryItem_expiryDate_idx" ON "InventoryItem"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_userId_categoryId_name_key" ON "InventoryItem"("userId", "categoryId", "name");

-- CreateIndex
CREATE INDEX "InventoryPurchase_storeName_idx" ON "InventoryPurchase"("storeName");

-- CreateIndex
CREATE UNIQUE INDEX "Subcategory_categoryId_name_key" ON "Subcategory"("categoryId", "name");

-- CreateIndex
CREATE INDEX "Transaction_type_status_idx" ON "Transaction"("type", "status");

-- CreateIndex
CREATE INDEX "Transaction_transferGroupId_idx" ON "Transaction"("transferGroupId");

-- CreateIndex
CREATE INDEX "Transaction_recurringGroupKey_idx" ON "Transaction"("recurringGroupKey");
