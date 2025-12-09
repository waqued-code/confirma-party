-- CreateEnum
CREATE TYPE "FollowUpScheduleType" AS ENUM ('SPECIFIC_DATE', 'DAYS_BEFORE_PARTY', 'DAYS_AFTER_INVITE');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "scheduleType" "FollowUpScheduleType" NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "daysOffset" INTEGER,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL,
    "partyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FollowUp_partyId_order_key" ON "FollowUp"("partyId", "order");

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;
