/*
  Warnings:

  - A unique constraint covering the columns `[continuedFromTaskId]` on the table `tasks` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."tasks" ADD COLUMN     "continuedFromTaskId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tasks_continuedFromTaskId_key" ON "public"."tasks"("continuedFromTaskId");

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_continuedFromTaskId_fkey" FOREIGN KEY ("continuedFromTaskId") REFERENCES "public"."tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
