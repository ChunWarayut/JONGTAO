-- CreateTable
CREATE TABLE "BookingTable" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bookingId" INTEGER NOT NULL,
    "tableId" INTEGER NOT NULL,
    CONSTRAINT "BookingTable_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookingTable_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BookingTable_tableId_idx" ON "BookingTable"("tableId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingTable_bookingId_tableId_key" ON "BookingTable"("bookingId", "tableId");

-- Backfill: every existing booking held exactly one table in Booking.tableId.
-- Availability now reads BookingTable, so those rows must exist or previously
-- booked tables would suddenly look free.
INSERT INTO "BookingTable" ("bookingId", "tableId")
SELECT "id", "tableId" FROM "Booking" WHERE "tableId" IS NOT NULL;
