-- CreateTable
CREATE TABLE "weekly_preweights" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "sampling_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_preweights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preweight_pond_entries" (
    "id" TEXT NOT NULL,
    "weekly_preweight_id" TEXT NOT NULL,
    "pond_id" TEXT NOT NULL,
    "growth_rate" DOUBLE PRECISION NOT NULL,
    "mortality" INTEGER NOT NULL DEFAULT 0,
    "disease" INTEGER NOT NULL DEFAULT 0,
    "molt" INTEGER NOT NULL DEFAULT 0,
    "culture_days" INTEGER NOT NULL,
    "total_number" INTEGER NOT NULL,
    "total_weight" DOUBLE PRECISION NOT NULL,
    "average_weight" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preweight_pond_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preweight_samples" (
    "id" TEXT NOT NULL,
    "preweight_pond_entry_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "average_weight" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preweight_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "population_samplings" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "pond_id" TEXT NOT NULL,
    "sampling_date" TIMESTAMP(3) NOT NULL,
    "hectares" DOUBLE PRECISION NOT NULL,
    "stocking_count" INTEGER NOT NULL,
    "cast_net_counts" JSONB NOT NULL,
    "grid_columns" INTEGER NOT NULL DEFAULT 4,
    "entrada_rows" INTEGER NOT NULL DEFAULT 5,
    "salida_rows" INTEGER NOT NULL DEFAULT 1,
    "number_of_throws" INTEGER NOT NULL,
    "total_count" INTEGER NOT NULL,
    "count_per_throw" DOUBLE PRECISION NOT NULL,
    "shrimp_per_sq_meter" DOUBLE PRECISION NOT NULL,
    "average_weight" DOUBLE PRECISION NOT NULL,
    "water_level" DOUBLE PRECISION NOT NULL,
    "old_molts" INTEGER NOT NULL DEFAULT 0,
    "old_molts_percent" DOUBLE PRECISION NOT NULL,
    "fresh_molts" INTEGER NOT NULL DEFAULT 0,
    "fresh_molts_percent" DOUBLE PRECISION NOT NULL,
    "disease_count" INTEGER NOT NULL DEFAULT 0,
    "disease_percent" DOUBLE PRECISION NOT NULL,
    "observations" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "population_samplings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_water_controls" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "record_date" TIMESTAMP(3) NOT NULL,
    "record_time" TEXT NOT NULL,
    "farm_section" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_water_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_water_pond_entries" (
    "id" TEXT NOT NULL,
    "daily_water_control_id" TEXT NOT NULL,
    "pond_id" TEXT NOT NULL,
    "gate_id" TEXT NOT NULL,
    "gate_height_inches" DOUBLE PRECISION,
    "turbidity_secchi_cm" DOUBLE PRECISION,
    "water_color" TEXT,
    "observations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_water_pond_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "weekly_preweights_farm_id_idx" ON "weekly_preweights"("farm_id");

-- CreateIndex
CREATE INDEX "weekly_preweights_sampling_date_idx" ON "weekly_preweights"("sampling_date");

-- CreateIndex
CREATE INDEX "preweight_pond_entries_weekly_preweight_id_idx" ON "preweight_pond_entries"("weekly_preweight_id");

-- CreateIndex
CREATE INDEX "preweight_pond_entries_pond_id_idx" ON "preweight_pond_entries"("pond_id");

-- CreateIndex
CREATE INDEX "preweight_samples_preweight_pond_entry_id_idx" ON "preweight_samples"("preweight_pond_entry_id");

-- CreateIndex
CREATE INDEX "population_samplings_farm_id_idx" ON "population_samplings"("farm_id");

-- CreateIndex
CREATE INDEX "population_samplings_pond_id_idx" ON "population_samplings"("pond_id");

-- CreateIndex
CREATE INDEX "population_samplings_sampling_date_idx" ON "population_samplings"("sampling_date");

-- CreateIndex
CREATE INDEX "daily_water_controls_farm_id_idx" ON "daily_water_controls"("farm_id");

-- CreateIndex
CREATE INDEX "daily_water_controls_record_date_idx" ON "daily_water_controls"("record_date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_water_controls_farm_id_record_date_record_time_farm_s_key" ON "daily_water_controls"("farm_id", "record_date", "record_time", "farm_section");

-- CreateIndex
CREATE INDEX "daily_water_pond_entries_daily_water_control_id_idx" ON "daily_water_pond_entries"("daily_water_control_id");

-- CreateIndex
CREATE INDEX "daily_water_pond_entries_pond_id_idx" ON "daily_water_pond_entries"("pond_id");

-- AddForeignKey
ALTER TABLE "weekly_preweights" ADD CONSTRAINT "weekly_preweights_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_preweights" ADD CONSTRAINT "weekly_preweights_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preweight_pond_entries" ADD CONSTRAINT "preweight_pond_entries_weekly_preweight_id_fkey" FOREIGN KEY ("weekly_preweight_id") REFERENCES "weekly_preweights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preweight_pond_entries" ADD CONSTRAINT "preweight_pond_entries_pond_id_fkey" FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preweight_samples" ADD CONSTRAINT "preweight_samples_preweight_pond_entry_id_fkey" FOREIGN KEY ("preweight_pond_entry_id") REFERENCES "preweight_pond_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "population_samplings" ADD CONSTRAINT "population_samplings_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "population_samplings" ADD CONSTRAINT "population_samplings_pond_id_fkey" FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "population_samplings" ADD CONSTRAINT "population_samplings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_water_controls" ADD CONSTRAINT "daily_water_controls_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_water_controls" ADD CONSTRAINT "daily_water_controls_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_water_pond_entries" ADD CONSTRAINT "daily_water_pond_entries_daily_water_control_id_fkey" FOREIGN KEY ("daily_water_control_id") REFERENCES "daily_water_controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_water_pond_entries" ADD CONSTRAINT "daily_water_pond_entries_pond_id_fkey" FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
