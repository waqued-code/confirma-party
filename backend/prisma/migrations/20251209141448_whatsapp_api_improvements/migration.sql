-- CreateEnum
CREATE TYPE "MessageTemplateStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MessageQueueStatus" AS ENUM ('SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MessageQueueType" AS ENUM ('INVITE', 'FOLLOW_UP_1', 'FOLLOW_UP_2', 'CUSTOM');

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "firstContactAt" TIMESTAMP(3),
ADD COLUMN     "followUp1SentAt" TIMESTAMP(3),
ADD COLUMN     "followUp2SentAt" TIMESTAMP(3),
ADD COLUMN     "sendError" TEXT;

-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "firstInviteSentAt" TIMESTAMP(3),
ADD COLUMN     "messageTemplateStatus" "MessageTemplateStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "validationErrors" TEXT;

-- CreateTable
CREATE TABLE "MessageQueue" (
    "id" TEXT NOT NULL,
    "type" "MessageQueueType" NOT NULL,
    "content" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "MessageQueueStatus" NOT NULL DEFAULT 'SCHEDULED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "guestId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageQueue_status_scheduledFor_idx" ON "MessageQueue"("status", "scheduledFor");

-- AddForeignKey
ALTER TABLE "MessageQueue" ADD CONSTRAINT "MessageQueue_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageQueue" ADD CONSTRAINT "MessageQueue_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;
