-- CreateTable
CREATE TABLE "feed_supplier_tables" (
    "id" TEXT NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "weight_grams" DOUBLE PRECISION NOT NULL,
    "bw_percent" DOUBLE PRECISION NOT NULL,
    "farm_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feed_supplier_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fca_references" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "weight_from" DOUBLE PRECISION NOT NULL,
    "weight_to" DOUBLE PRECISION NOT NULL,
    "expected_weekly_growth" DOUBLE PRECISION NOT NULL,
    "weekly_growth_percent" DOUBLE PRECISION NOT NULL,
    "expected_fca" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fca_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_feed_projections" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "week_start_date" TIMESTAMP(3) NOT NULL,
    "week_end_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "total_weekly_feed_kg" DOUBLE PRECISION,
    "supplier_name" TEXT NOT NULL,
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_feed_projections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_projection_pond_days" (
    "id" TEXT NOT NULL,
    "weekly_feed_projection_id" TEXT NOT NULL,
    "pond_id" TEXT NOT NULL,
    "day_date" TIMESTAMP(3) NOT NULL,
    "day_index" INTEGER NOT NULL,
    "is_real_data" BOOLEAN NOT NULL DEFAULT false,
    "hectares" DOUBLE PRECISION NOT NULL,
    "weekly_growth_rate" DOUBLE PRECISION,
    "daily_growth_rate" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION NOT NULL,
    "weight_projected" DOUBLE PRECISION,
    "weight_deviation" DOUBLE PRECISION,
    "density" DOUBLE PRECISION NOT NULL,
    "biomass_lbs" DOUBLE PRECISION,
    "biomass_kg" DOUBLE PRECISION,
    "bw_percent" DOUBLE PRECISION,
    "feed_quantity_lbs" DOUBLE PRECISION,
    "feed_quantity_override" DOUBLE PRECISION,
    "khd_feed" DOUBLE PRECISION,
    "feed_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feed_projection_pond_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pond_weekly_analyses" (
    "id" TEXT NOT NULL,
    "weekly_feed_projection_id" TEXT NOT NULL,
    "pond_id" TEXT NOT NULL,
    "population_sampling_id" TEXT,
    "week_date" TIMESTAMP(3) NOT NULL,
    "projected_weight" DOUBLE PRECISION NOT NULL,
    "actual_weight" DOUBLE PRECISION,
    "weight_deviation_percent" DOUBLE PRECISION,
    "projected_biomass_kg" DOUBLE PRECISION,
    "atarraya_biomass_kg" DOUBLE PRECISION,
    "consumption_biomass_kg" DOUBLE PRECISION,
    "biomass_discrepancy_percent" DOUBLE PRECISION,
    "fca_atarraya" DOUBLE PRECISION,
    "fca_consumption" DOUBLE PRECISION,
    "accumulated_feed_kg" DOUBLE PRECISION,
    "survival_atarraya" DOUBLE PRECISION,
    "survival_consumption" DOUBLE PRECISION,
    "alert_level" TEXT,
    "alert_reasons" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pond_weekly_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feed_supplier_tables_farm_id_idx" ON "feed_supplier_tables"("farm_id");

-- CreateIndex
CREATE UNIQUE INDEX "feed_supplier_tables_farm_id_supplier_name_weight_grams_key" ON "feed_supplier_tables"("farm_id", "supplier_name", "weight_grams");

-- CreateIndex
CREATE INDEX "fca_references_farm_id_idx" ON "fca_references"("farm_id");

-- CreateIndex
CREATE INDEX "weekly_feed_projections_farm_id_idx" ON "weekly_feed_projections"("farm_id");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_feed_projections_farm_id_week_start_date_key" ON "weekly_feed_projections"("farm_id", "week_start_date");

-- CreateIndex
CREATE INDEX "feed_projection_pond_days_weekly_feed_projection_id_idx" ON "feed_projection_pond_days"("weekly_feed_projection_id");

-- CreateIndex
CREATE INDEX "feed_projection_pond_days_pond_id_idx" ON "feed_projection_pond_days"("pond_id");

-- CreateIndex
CREATE UNIQUE INDEX "feed_projection_pond_days_weekly_feed_projection_id_pond_id_key" ON "feed_projection_pond_days"("weekly_feed_projection_id", "pond_id", "day_date");

-- CreateIndex
CREATE INDEX "pond_weekly_analyses_weekly_feed_projection_id_idx" ON "pond_weekly_analyses"("weekly_feed_projection_id");

-- CreateIndex
CREATE INDEX "pond_weekly_analyses_pond_id_idx" ON "pond_weekly_analyses"("pond_id");

-- CreateIndex
CREATE UNIQUE INDEX "pond_weekly_analyses_weekly_feed_projection_id_pond_id_key" ON "pond_weekly_analyses"("weekly_feed_projection_id", "pond_id");

-- AddForeignKey
ALTER TABLE "feed_supplier_tables" ADD CONSTRAINT "feed_supplier_tables_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fca_references" ADD CONSTRAINT "fca_references_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_feed_projections" ADD CONSTRAINT "weekly_feed_projections_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_feed_projections" ADD CONSTRAINT "weekly_feed_projections_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_projection_pond_days" ADD CONSTRAINT "feed_projection_pond_days_weekly_feed_projection_id_fkey" FOREIGN KEY ("weekly_feed_projection_id") REFERENCES "weekly_feed_projections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_projection_pond_days" ADD CONSTRAINT "feed_projection_pond_days_pond_id_fkey" FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pond_weekly_analyses" ADD CONSTRAINT "pond_weekly_analyses_weekly_feed_projection_id_fkey" FOREIGN KEY ("weekly_feed_projection_id") REFERENCES "weekly_feed_projections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pond_weekly_analyses" ADD CONSTRAINT "pond_weekly_analyses_pond_id_fkey" FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pond_weekly_analyses" ADD CONSTRAINT "pond_weekly_analyses_population_sampling_id_fkey" FOREIGN KEY ("population_sampling_id") REFERENCES "population_samplings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
