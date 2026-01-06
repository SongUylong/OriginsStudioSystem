/*
  Warnings:

  - The values [PENDING,CANCELLED] on the enum `TaskStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."TaskStatus_new" AS ENUM ('IN_PROGRESS', 'COMPLETED');
ALTER TABLE "public"."tasks" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."tasks" ALTER COLUMN "status" TYPE "public"."TaskStatus_new" USING ("status"::text::"public"."TaskStatus_new");
ALTER TYPE "public"."TaskStatus" RENAME TO "TaskStatus_old";
ALTER TYPE "public"."TaskStatus_new" RENAME TO "TaskStatus";
DROP TYPE "public"."TaskStatus_old";
ALTER TABLE "public"."tasks" ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';
COMMIT;

-- AlterTable
ALTER TABLE "public"."tasks" ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';

-- CreateTable
CREATE TABLE "public"."feedback_media" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "caption" TEXT,
    "key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "feedbackId" TEXT NOT NULL,

    CONSTRAINT "feedback_media_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."feedback_media" ADD CONSTRAINT "feedback_media_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "public"."feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
