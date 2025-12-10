-- CreateTable
CREATE TABLE "WhatsAppAuth" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "creds" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppAuth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppAuthKey" (
    "id" TEXT NOT NULL,
    "authId" TEXT NOT NULL DEFAULT 'default',
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppAuthKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppAuthKey_authId_idx" ON "WhatsAppAuthKey"("authId");
