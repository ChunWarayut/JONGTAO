-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "stripePaymentIntentId" TEXT,
    "bookingDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("arrivalTime", "bookingDate", "createdAt", "customerName", "customerPhone", "depositAmount", "extraTable", "guestCount", "id", "lineId", "note", "occasion", "paymentMethod", "paymentStatus", "qrCode", "status", "stripePaymentIntentId", "tableId", "totalAmount", "updatedAt", "zoneId") SELECT "arrivalTime", "bookingDate", "createdAt", "customerName", "customerPhone", "depositAmount", "extraTable", "guestCount", "id", "lineId", "note", "occasion", "paymentMethod", "paymentStatus", "qrCode", "status", "stripePaymentIntentId", "tableId", "totalAmount", "updatedAt", "zoneId" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_qrCode_key" ON "Booking"("qrCode");
CREATE UNIQUE INDEX "Booking_stripePaymentIntentId_key" ON "Booking"("stripePaymentIntentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
