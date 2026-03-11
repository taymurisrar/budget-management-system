/*
  Warnings:

  - The values [stock_brokerage,mutual_fund,family_member,shared_member,savings_account] on the enum `AccountSubtype` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `accountNumberMask` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `colorHex` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `currentBalance` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `institutionName` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `openingBalance` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `Account` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AccountSubtype_new" AS ENUM ('cash', 'debit_card', 'bank_account', 'wallet', 'credit_card', 'loan_given', 'loan_taken', 'psx_stock', 'cdc_account', 'mutual_fund_pk', 'national_savings', 'roshan_investment', 'crypto_wallet', 'precious_metal', 'forex_holding', 'membership', 'transport_card');
ALTER TABLE "Account" ALTER COLUMN "subtype" TYPE "AccountSubtype_new" USING ("subtype"::text::"AccountSubtype_new");
ALTER TYPE "AccountSubtype" RENAME TO "AccountSubtype_old";
ALTER TYPE "AccountSubtype_new" RENAME TO "AccountSubtype";
DROP TYPE "public"."AccountSubtype_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropIndex
DROP INDEX "Account_currencyCode_idx";

-- DropIndex
DROP INDEX "Account_group_idx";

-- DropIndex
DROP INDEX "Account_subtype_idx";

-- DropIndex
DROP INDEX "Account_userId_idx";

-- DropIndex
DROP INDEX "Account_userId_name_key";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "accountNumberMask",
DROP COLUMN "colorHex",
DROP COLUMN "currentBalance",
DROP COLUMN "description",
DROP COLUMN "institutionName",
DROP COLUMN "isActive",
DROP COLUMN "openingBalance",
DROP COLUMN "sortOrder",
ADD COLUMN     "balance" DECIMAL(18,2),
ADD COLUMN     "chartColor" TEXT,
ADD COLUMN     "countInAsset" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "details" JSONB,
ADD COLUMN     "hideBalance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "note" TEXT;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
