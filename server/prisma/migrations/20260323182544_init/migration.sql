/*
  Warnings:

  - You are about to drop the column `stripePublishableKey` on the `AppConfig` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSecretKey` on the `AppConfig` table. All the data in the column will be lost.
  - You are about to drop the column `stripePaymentIntentId` on the `Booking` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "isBookingOpen" BOOLEAN NOT NULL DEFAULT true,
    "openTime" TEXT NOT NULL DEFAULT '18:00',
    "closeTime" TEXT NOT NULL DEFAULT '02:00',
    "isBookingFeeRequired" BOOLEAN NOT NULL DEFAULT true,
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankAccountName" TEXT,
    "promptPayNumber" TEXT
);
INSERT INTO "new_AppConfig" ("closeTime", "id", "isBookingFeeRequired", "isBookingOpen", "openTime") SELECT "closeTime", "id", "isBookingFeeRequired", "isBookingOpen", "openTime" FROM "AppConfig";
DROP TABLE "AppConfig";
ALTER TABLE "new_AppConfig" RENAME TO "AppConfig";
CREATE TABLE "new_Booking" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zoneId" INTEGER NOT NULL,
    "tableId" INTEGER,
    "guestCount" INTEGER NOT NULL,
    "extraTable" BOOLEAN NOT NULL DEFAULT false,
    "totalAmount" REAL NOT NULL,
    "depositAmount" REAL NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "lineId" TEXT,
    "arrivalTime" TEXT,
    "occasion" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "qrCode" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "slipImageUrl" TEXT,
    "slipRejectReason" TEXT,
    "bookingDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("arrivalTime", "bookingDate", "createdAt", "customerName", "customerPhone", "depositAmount", "extraTable", "guestCount", "id", "lineId", "note", "occasion", "paymentMethod", "paymentStatus", "qrCode", "status", "tableId", "totalAmount", "updatedAt", "zoneId") SELECT "arrivalTime", "bookingDate", "createdAt", "customerName", "customerPhone", "depositAmount", "extraTable", "guestCount", "id", "lineId", "note", "occasion", "paymentMethod", "paymentStatus", "qrCode", "status", "tableId", "totalAmount", "updatedAt", "zoneId" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_qrCode_key" ON "Booking"("qrCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
