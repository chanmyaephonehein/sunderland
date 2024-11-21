/*
  Warnings:

  - The `twoStepCode` column on the `Users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "passwordReset" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "passwordResetUntil" TIMESTAMP(3),
DROP COLUMN "twoStepCode",
ADD COLUMN     "twoStepCode" INTEGER NOT NULL DEFAULT 0;
