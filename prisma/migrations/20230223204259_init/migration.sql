-- CreateTable
CREATE TABLE "PositionModel" (
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
    "strategy" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "OrderModel" (
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
