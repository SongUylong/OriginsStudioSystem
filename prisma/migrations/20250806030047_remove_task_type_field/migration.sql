/*
  Warnings:

  - You are about to drop the column `type` on the `tasks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."tasks" DROP COLUMN "type";

-- DropEnum
DROP TYPE "public"."TaskType";
