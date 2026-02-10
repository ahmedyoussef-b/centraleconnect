-- CreateTable
CREATE TABLE "equipments" (
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "type" TEXT,
    "subtype" TEXT,
    "system_code" TEXT,
    "sub_system" TEXT,
    "location" TEXT,
    "manufacturer" TEXT,
    "serial_number" TEXT,
    "document_ref" TEXT,
    "coordinates" TEXT,
    "svg_layer" TEXT,
    "fire_zone" TEXT,
    "linked_parameters" TEXT,
    "status" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isImmutable" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "checksum" TEXT,
    "nominal_data" JSONB,

    CONSTRAINT "equipments_pkey" PRIMARY KEY ("externalId")
);

-- CreateTable
CREATE TABLE "parameters" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "data_type" TEXT NOT NULL DEFAULT 'TEXT',
    "nominal_value" DOUBLE PRECISION,
    "min_safe" DOUBLE PRECISION,
    "max_safe" DOUBLE PRECISION,
    "alarm_high" DOUBLE PRECISION,
    "alarm_low" DOUBLE PRECISION,
    "standard_ref" TEXT,
    "equipment_id" TEXT NOT NULL,

    CONSTRAINT "parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alarms" (
    "code" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "parameter" TEXT,
    "reset_procedure" TEXT,
    "standard_ref" TEXT,
    "equipment_id" TEXT NOT NULL,

    CONSTRAINT "alarms_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "log_entries" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "equipment_id" TEXT,

    CONSTRAINT "log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alarm_events" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "details" TEXT,
    "alarm_code" TEXT NOT NULL,

    CONSTRAINT "alarm_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scada_data" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "equipment_id" TEXT NOT NULL,

    CONSTRAINT "scada_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annotations" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "text" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "x_pos" DOUBLE PRECISION NOT NULL,
    "y_pos" DOUBLE PRECISION NOT NULL,
    "equipment_id" TEXT NOT NULL,

    CONSTRAINT "annotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" SERIAL NOT NULL,
    "imageData" TEXT NOT NULL,
    "ocr_text" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "perceptual_hash" TEXT,
    "equipment_id" TEXT NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedures" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT,
    "steps" TEXT,

    CONSTRAINT "procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "synoptic_items" (
    "external_id" TEXT NOT NULL,
    "name" TEXT,
    "type" TEXT,
    "parent_id" TEXT,
    "group_path" TEXT,
    "element_id" TEXT,
    "level" INTEGER,
    "approved_by" TEXT,
    "approval_date" TEXT,

    CONSTRAINT "synoptic_items_pkey" PRIMARY KEY ("external_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipments_externalId_key" ON "equipments"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "equipments_checksum_key" ON "equipments"("checksum");

-- CreateIndex
CREATE INDEX "parameters_equipment_id_idx" ON "parameters"("equipment_id");

-- CreateIndex
CREATE UNIQUE INDEX "alarms_code_key" ON "alarms"("code");

-- CreateIndex
CREATE INDEX "alarms_equipment_id_idx" ON "alarms"("equipment_id");

-- CreateIndex
CREATE UNIQUE INDEX "log_entries_signature_key" ON "log_entries"("signature");

-- CreateIndex
CREATE INDEX "log_entries_equipment_id_idx" ON "log_entries"("equipment_id");

-- CreateIndex
CREATE INDEX "alarm_events_alarm_code_idx" ON "alarm_events"("alarm_code");

-- CreateIndex
CREATE INDEX "scada_data_equipment_id_idx" ON "scada_data"("equipment_id");

-- CreateIndex
CREATE INDEX "annotations_equipment_id_idx" ON "annotations"("equipment_id");

-- CreateIndex
CREATE INDEX "documents_equipment_id_idx" ON "documents"("equipment_id");

-- CreateIndex
CREATE UNIQUE INDEX "procedures_id_key" ON "procedures"("id");

-- CreateIndex
CREATE UNIQUE INDEX "synoptic_items_external_id_key" ON "synoptic_items"("external_id");

-- AddForeignKey
ALTER TABLE "parameters" ADD CONSTRAINT "parameters_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipments"("externalId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alarms" ADD CONSTRAINT "alarms_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipments"("externalId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipments"("externalId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alarm_events" ADD CONSTRAINT "alarm_events_alarm_code_fkey" FOREIGN KEY ("alarm_code") REFERENCES "alarms"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scada_data" ADD CONSTRAINT "scada_data_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipments"("externalId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipments"("externalId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipments"("externalId") ON DELETE RESTRICT ON UPDATE CASCADE;
