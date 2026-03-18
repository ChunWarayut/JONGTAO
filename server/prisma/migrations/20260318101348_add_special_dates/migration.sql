-- AlterTable
ALTER TABLE "AppConfig" ADD COLUMN "stripePublishableKey" TEXT;
ALTER TABLE "AppConfig" ADD COLUMN "stripeSecretKey" TEXT;

-- CreateTable
CREATE TABLE "Fixture" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "label" TEXT NOT NULL,
    "sublabel" TEXT,
    "icon" TEXT,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "w" REAL NOT NULL,
    "h" REAL NOT NULL,
    "style" TEXT NOT NULL DEFAULT 'default',
    "vertical" BOOLEAN NOT NULL DEFAULT false,
    "rotation" INTEGER
);

-- CreateTable
CREATE TABLE "SpecialDate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceType" TEXT NOT NULL DEFAULT 'normal',
    "depositRequired" BOOLEAN NOT NULL DEFAULT true,
    "depositAmount" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SpecialDate_date_key" ON "SpecialDate"("date");
