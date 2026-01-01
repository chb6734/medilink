-- CreateEnum
CREATE TYPE "VisitType" AS ENUM ('new_symptom', 'followup');

-- AlterTable
ALTER TABLE "Facility" ADD COLUMN     "address" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "specialty" TEXT;

-- AlterTable
ALTER TABLE "IntakeForm" ADD COLUMN     "relatedRecordId" TEXT,
ADD COLUMN     "visitType" "VisitType" NOT NULL DEFAULT 'new_symptom';

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "bloodType" TEXT,
ADD COLUMN     "emergencyContact" TEXT,
ADD COLUMN     "heightCm" DOUBLE PRECISION,
ADD COLUMN     "weightKg" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Facility_specialty_idx" ON "Facility"("specialty");

-- CreateIndex
CREATE INDEX "IntakeForm_relatedRecordId_idx" ON "IntakeForm"("relatedRecordId");

-- AddForeignKey
ALTER TABLE "MedicationCheck" ADD CONSTRAINT "MedicationCheck_prescriptionRecordId_fkey" FOREIGN KEY ("prescriptionRecordId") REFERENCES "PrescriptionRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCondition" ADD CONSTRAINT "DailyCondition_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCondition" ADD CONSTRAINT "DailyCondition_prescriptionRecordId_fkey" FOREIGN KEY ("prescriptionRecordId") REFERENCES "PrescriptionRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
