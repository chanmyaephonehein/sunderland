-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "codeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "twoStepCode" TEXT;
