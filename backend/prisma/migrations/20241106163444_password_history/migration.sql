-- CreateTable
CREATE TABLE "PasswordHistogry" (
    "id" SERIAL NOT NULL,
    "password" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordHistogry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PasswordHistogry" ADD CONSTRAINT "PasswordHistogry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
