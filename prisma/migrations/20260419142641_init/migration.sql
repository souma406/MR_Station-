-- CreateTable
CREATE TABLE "fuel_types" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuel_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stations" (
    "id" SERIAL NOT NULL,
    "external_id" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "postal_code" TEXT,
    "country_code" TEXT NOT NULL DEFAULT 'MR',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "services" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "current_prices" (
    "id" SERIAL NOT NULL,
    "station_id" INTEGER NOT NULL,
    "fuel_type_id" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MRU',
    "source_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "current_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" SERIAL NOT NULL,
    "station_id" INTEGER NOT NULL,
    "fuel_type_id" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MRU',
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_runs" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "rows_read" INTEGER NOT NULL DEFAULT 0,
    "stations_created" INTEGER NOT NULL DEFAULT 0,
    "stations_updated" INTEGER NOT NULL DEFAULT 0,
    "prices_created" INTEGER NOT NULL DEFAULT 0,
    "prices_updated" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "error_messages" TEXT[],
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "import_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fuel_types_code_key" ON "fuel_types"("code");

-- CreateIndex
CREATE INDEX "stations_city_idx" ON "stations"("city");

-- CreateIndex
CREATE INDEX "stations_country_code_idx" ON "stations"("country_code");

-- CreateIndex
CREATE INDEX "stations_latitude_longitude_idx" ON "stations"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "stations_external_id_country_code_key" ON "stations"("external_id", "country_code");

-- CreateIndex
CREATE INDEX "current_prices_station_id_idx" ON "current_prices"("station_id");

-- CreateIndex
CREATE INDEX "current_prices_fuel_type_id_idx" ON "current_prices"("fuel_type_id");

-- CreateIndex
CREATE INDEX "current_prices_price_idx" ON "current_prices"("price");

-- CreateIndex
CREATE UNIQUE INDEX "current_prices_station_id_fuel_type_id_key" ON "current_prices"("station_id", "fuel_type_id");

-- CreateIndex
CREATE INDEX "price_history_station_id_idx" ON "price_history"("station_id");

-- CreateIndex
CREATE INDEX "price_history_fuel_type_id_idx" ON "price_history"("fuel_type_id");

-- CreateIndex
CREATE INDEX "price_history_recorded_at_idx" ON "price_history"("recorded_at");

-- CreateIndex
CREATE INDEX "import_runs_status_idx" ON "import_runs"("status");

-- CreateIndex
CREATE INDEX "import_runs_started_at_idx" ON "import_runs"("started_at");

-- AddForeignKey
ALTER TABLE "current_prices" ADD CONSTRAINT "current_prices_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "current_prices" ADD CONSTRAINT "current_prices_fuel_type_id_fkey" FOREIGN KEY ("fuel_type_id") REFERENCES "fuel_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_fuel_type_id_fkey" FOREIGN KEY ("fuel_type_id") REFERENCES "fuel_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
