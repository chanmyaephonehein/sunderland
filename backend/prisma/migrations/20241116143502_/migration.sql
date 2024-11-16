/*
  Warnings:

  - You are about to drop the column `isEmailVerified` on the `Users` table. All the data in the column will be lost.
  - You are about to drop the `EmailVerification` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EmailVerification" DROP CONSTRAINT "EmailVerification_userId_fkey";

-- AlterTable
ALTER TABLE "Users" DROP COLUMN "isEmailVerified";

-- DropTable
DROP TABLE "EmailVerification";

-- CreateTable
CREATE TABLE "EmailVerifications" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerifications_email_key" ON "EmailVerifications"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerifications_token_key" ON "EmailVerifications"("token");
