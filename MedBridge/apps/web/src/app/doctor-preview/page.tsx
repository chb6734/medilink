"use client";

import { DoctorView } from "@/widgets/doctor/DoctorView";
import type { PrescriptionRecord } from "@/entities/record/model/types";
import type { QuestionnaireData } from "@/entities/questionnaire/model/types";

export default function DoctorPreviewPage() {
  const records: PrescriptionRecord[] = [
    {
      id: "demo-1",
      prescriptionDate: new Date().toISOString().slice(0, 10),
      hospitalName: "OO내과의원",
      pharmacyName: "OO약국",
      medications: [
        {
          id: "m-1",
          name: "아목시실린",
          dosage: "500mg",
          frequency: "하루 3회",
          startDate: new Date().toISOString().slice(0, 10),
          prescribedBy: "OO내과의원",
          confidence: 95,
        },
        {
          id: "m-2",
          name: "타이레놀",
          dosage: "650mg",
          frequency: "필요 시",
          startDate: new Date().toISOString().slice(0, 10),
          prescribedBy: "OO내과의원",
          confidence: 92,
        },
      ],
      ocrConfidence: 92,
    },
  ];

  const questionnaireData: QuestionnaireData = {
    hospitalName: "OO내과의원",
    chiefComplaint: "발열 및 인후통이 3일째 지속됩니다.",
    symptomStart: "3일 전",
    symptomProgress: "점점 악화",
    symptomDetail: "기침/가래 동반, 밤에 더 심함",
    medicationCompliance: "대부분 잘 복용했어요",
    sideEffects: "없음",
    allergies: "없음",
    patientNotes: "지난번에 같은 증상으로 항생제 복용 후 호전된 적이 있어요.",
  };

  return (
    <DoctorView
      records={records}
      questionnaireData={questionnaireData}
      patient={{
        name: "홍길동",
        phone: "010-1234-5678",
        age: 34,
        bloodType: "A+",
        height: 172,
        weight: 68,
      }}
    />
  );
}


