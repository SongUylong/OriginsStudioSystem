/*
  Warnings:

  - A unique constraint covering the columns `[telegramChatId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "telegramChatId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_telegramChatId_key" ON "public"."users"("telegramChatId");
