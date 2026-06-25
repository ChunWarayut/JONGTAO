-- CreateTable
CREATE TABLE "TableHold" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tableId" INTEGER NOT NULL,
    "bookingDate" DATETIME NOT NULL,
    "sessionId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TableHold_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "isBookingOpen" BOOLEAN NOT NULL DEFAULT true,
    "openTime" TEXT NOT NULL DEFAULT '18:00',
    "closeTime" TEXT NOT NULL DEFAULT '02:00',
    "isBookingFeeRequired" BOOLEAN NOT NULL DEFAULT true,
    "holdMinutes" INTEGER NOT NULL DEFAULT 15,
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankAccountName" TEXT,
    "promptPayNumber" TEXT
);
INSERT INTO "new_AppConfig" ("bankAccountName", "bankAccountNumber", "bankName", "closeTime", "id", "isBookingFeeRequired", "isBookingOpen", "openTime", "promptPayNumber") SELECT "bankAccountName", "bankAccountNumber", "bankName", "closeTime", "id", "isBookingFeeRequired", "isBookingOpen", "openTime", "promptPayNumber" FROM "AppConfig";
DROP TABLE "AppConfig";
ALTER TABLE "new_AppConfig" RENAME TO "AppConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TableHold_tableId_idx" ON "TableHold"("tableId");

-- CreateIndex
CREATE INDEX "TableHold_expiresAt_idx" ON "TableHold"("expiresAt");

