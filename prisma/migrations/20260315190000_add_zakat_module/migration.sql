-- CreateEnum
CREATE TYPE "ZakatAssetType" AS ENUM (
  'gold',
  'silver',
  'cash',
  'investment',
  'property',
  'business_inventory',
  'receivable',
  'retirement',
  'cryptocurrency',
  'other'
);

-- CreateEnum
CREATE TYPE "ZakatOwnershipRelation" AS ENUM ('self', 'spouse', 'parent', 'child', 'other');

-- CreateEnum
CREATE TYPE "ZakatMetalPurity" AS ENUM ('k24', 'k22', 'k20', 'k18');

-- CreateEnum
CREATE TYPE "ZakatAssetRevisionAction" AS ENUM ('created', 'updated', 'archived');

-- CreateTable
CREATE TABLE "ZakatAsset" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "assetType" "ZakatAssetType" NOT NULL,
  "ownershipRelation" "ZakatOwnershipRelation" NOT NULL DEFAULT 'self',
  "ownerName" TEXT,
  "countInMyAssets" BOOLEAN NOT NULL DEFAULT true,
  "currencyCode" TEXT NOT NULL,
  "manualValue" DECIMAL(18, 2),
  "deductibleAmount" DECIMAL(18, 2),
  "metalWeightGrams" DECIMAL(18, 3),
  "metalPurity" "ZakatMetalPurity",
  "purchaseDate" TIMESTAMP(3) NOT NULL,
  "zakatDueDate" TIMESTAMP(3) NOT NULL,
  "preferredPaymentMonth" INTEGER,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ZakatAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZakatPayment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "amount" DECIMAL(18, 2) NOT NULL,
  "currencyCode" TEXT NOT NULL,
  "paymentDate" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ZakatPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZakatAssetRevision" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "action" "ZakatAssetRevisionAction" NOT NULL,
  "summary" TEXT,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ZakatAssetRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ZakatAsset_userId_isActive_idx" ON "ZakatAsset"("userId", "isActive");

-- CreateIndex
CREATE INDEX "ZakatAsset_assetType_idx" ON "ZakatAsset"("assetType");

-- CreateIndex
CREATE INDEX "ZakatAsset_purchaseDate_idx" ON "ZakatAsset"("purchaseDate");

-- CreateIndex
CREATE INDEX "ZakatAsset_zakatDueDate_idx" ON "ZakatAsset"("zakatDueDate");

-- CreateIndex
CREATE INDEX "ZakatPayment_userId_paymentDate_idx" ON "ZakatPayment"("userId", "paymentDate");

-- CreateIndex
CREATE INDEX "ZakatPayment_assetId_paymentDate_idx" ON "ZakatPayment"("assetId", "paymentDate");

-- CreateIndex
CREATE INDEX "ZakatAssetRevision_userId_createdAt_idx" ON "ZakatAssetRevision"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ZakatAssetRevision_assetId_createdAt_idx" ON "ZakatAssetRevision"("assetId", "createdAt");

-- AddForeignKey
ALTER TABLE "ZakatAsset"
ADD CONSTRAINT "ZakatAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZakatPayment"
ADD CONSTRAINT "ZakatPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZakatPayment"
ADD CONSTRAINT "ZakatPayment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ZakatAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZakatAssetRevision"
ADD CONSTRAINT "ZakatAssetRevision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZakatAssetRevision"
ADD CONSTRAINT "ZakatAssetRevision_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ZakatAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
