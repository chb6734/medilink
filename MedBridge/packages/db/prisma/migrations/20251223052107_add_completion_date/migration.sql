-- AlterTable
ALTER TABLE "PrescriptionRecord" ADD COLUMN     "completionDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PrescriptionRecord_completionDate_idx" ON "PrescriptionRecord"("completionDate");
