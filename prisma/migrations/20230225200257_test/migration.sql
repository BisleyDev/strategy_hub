/*
  Warnings:

  - You are about to drop the `OrderModel` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "OrderModel";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "OrderTakeStopModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timeClose" DATETIME,
    "timeOpen" DATETIME NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sizeQuote" REAL NOT NULL,
    "sizeBase" REAL NOT NULL,
    "priceOpen" REAL NOT NULL,
    "priceClose" REAL,
    "fee" REAL NOT NULL,
    "feeAsset" TEXT NOT NULL,
    "profit" REAL,
    "feeClose" REAL,
    "profitPercent" REAL,
    "account" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "stopPrice" REAL NOT NULL,
    "takePrice" REAL NOT NULL
);
