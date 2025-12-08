-- CreateEnum
CREATE TYPE "PartyPlan" AS ENUM ('GRATUITO', 'FESTA', 'CELEBRACAO', 'PERSONALIZADO');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "guestLimit" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "plan" "PartyPlan" NOT NULL DEFAULT 'GRATUITO';

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "plan" "PartyPlan" NOT NULL,
    "paymentMethod" TEXT,
    "externalId" TEXT,
    "partyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;
