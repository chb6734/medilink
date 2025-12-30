-- CreateEnum
CREATE TYPE "ConditionStatus" AS ENUM ('improving', 'same', 'worsening', 'fluctuating');

-- CreateTable
CREATE TABLE "MedicationCheck" (
    "id" TEXT NOT NULL,
    "prescriptionRecordId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "takenAt" TIMESTAMP(3),
    "isTaken" BOOLEAN NOT NULL DEFAULT false,
    "dayNumber" INTEGER NOT NULL,
    "doseNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCondition" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "recordDate" TIMESTAMP(3) NOT NULL,
    "status" "ConditionStatus" NOT NULL,
    "note" TEXT,
    "prescriptionRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyCondition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicationCheck_prescriptionRecordId_idx" ON "MedicationCheck"("prescriptionRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationCheck_prescriptionRecordId_scheduledAt_key" ON "MedicationCheck"("prescriptionRecordId", "scheduledAt");

-- CreateIndex
CREATE INDEX "DailyCondition_patientId_idx" ON "DailyCondition"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCondition_patientId_recordDate_key" ON "DailyCondition"("patientId", "recordDate");
