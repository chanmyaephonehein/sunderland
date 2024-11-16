/*
  Warnings:

  - Added the required column `password` to the `EmailVerifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EmailVerifications" ADD COLUMN     "password" TEXT NOT NULL;
