-- CreateTable
CREATE TABLE "carriers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "carriers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "carriers_name_key" ON "carriers"("name");

CREATE TABLE "routes" (
    "id" SERIAL NOT NULL,
    "origin_city" TEXT NOT NULL,
    "destination_city" TEXT NOT NULL,
    "distance_km" DECIMAL(14,4) NOT NULL,
    "estimated_time_hours" DECIMAL(14,4) NOT NULL,
    "vehicle_type" TEXT NOT NULL,
    "carrier_id" INTEGER,
    "cost_usd" DECIMAL(14,4) NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabled_at" TIMESTAMPTZ(6),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_routes_origin" ON "routes"("origin_city");
CREATE INDEX "idx_routes_destination" ON "routes"("destination_city");
CREATE INDEX "idx_routes_status" ON "routes"("status");
CREATE INDEX "idx_routes_vehicle" ON "routes"("vehicle_type");
CREATE INDEX "idx_routes_carrier" ON "routes"("carrier_id");

ALTER TABLE "routes" ADD CONSTRAINT "routes_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "carriers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
