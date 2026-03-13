-- CreateEnum
CREATE TYPE "BackupProvider" AS ENUM ('browser_download', 'local_path', 'google_drive');

-- CreateEnum
CREATE TYPE "BackupSchedule" AS ENUM ('manual', 'daily', 'weekly', 'monthly');

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "backupAutoEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "backupLocalPath" TEXT,
ADD COLUMN     "backupProvider" "BackupProvider" NOT NULL DEFAULT 'browser_download',
ADD COLUMN     "backupSchedule" "BackupSchedule" NOT NULL DEFAULT 'manual',
ADD COLUMN     "lastBackupAt" TIMESTAMP(3);
