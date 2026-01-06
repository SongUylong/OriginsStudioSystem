-- CreateEnum
CREATE TYPE "public"."TaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- AlterTable
ALTER TABLE "public"."tasks" ADD COLUMN     "assignedById" TEXT,
ADD COLUMN     "priority" "public"."TaskPriority" NOT NULL DEFAULT 'NORMAL';

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
