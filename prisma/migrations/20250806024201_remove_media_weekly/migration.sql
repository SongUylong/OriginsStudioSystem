/*
  Warnings:

  - You are about to drop the `weekly_summary_media` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."weekly_summary_media" DROP CONSTRAINT "weekly_summary_media_weeklySummaryId_fkey";

-- DropTable
DROP TABLE "public"."weekly_summary_media";
