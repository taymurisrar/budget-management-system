-- CreateEnum
CREATE TYPE "UserDateFormat" AS ENUM ('dmy', 'mdy', 'iso');

-- CreateEnum
CREATE TYPE "UserTimeFormat" AS ENUM ('twelve_hour', 'twenty_four_hour');

-- CreateEnum
CREATE TYPE "WeekStart" AS ENUM ('sunday', 'monday', 'saturday');

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateFormat" "UserDateFormat" NOT NULL DEFAULT 'dmy',
    "timeFormat" "UserTimeFormat" NOT NULL DEFAULT 'twelve_hour',
    "weekStartsOn" "WeekStart" NOT NULL DEFAULT 'monday',
    "priorityNotifications" BOOLEAN NOT NULL DEFAULT true,
    "automationPreviews" BOOLEAN NOT NULL DEFAULT true,
    "securityPrompts" BOOLEAN NOT NULL DEFAULT true,
    "compactMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
