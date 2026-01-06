/*
  Warnings:

  - The values [GENERAL] on the enum `FeedbackType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `rating` on the `feedback` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."FeedbackType_new" AS ENUM ('DAILY', 'WEEKLY');
ALTER TABLE "public"."feedback" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "public"."feedback" ALTER COLUMN "type" TYPE "public"."FeedbackType_new" USING ("type"::text::"public"."FeedbackType_new");
ALTER TYPE "public"."FeedbackType" RENAME TO "FeedbackType_old";
ALTER TYPE "public"."FeedbackType_new" RENAME TO "FeedbackType";
DROP TYPE "public"."FeedbackType_old";
ALTER TABLE "public"."feedback" ALTER COLUMN "type" SET DEFAULT 'DAILY';
COMMIT;

-- AlterTable
ALTER TABLE "public"."feedback" DROP COLUMN "rating";
