import { VertexAI } from '@google-cloud/vertexai';

let cached: VertexAI | null = null;

function getVertexAi() {
  if (!cached) {
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1';
    if (!project) {
      throw new Error(
        'Missing GOOGLE_CLOUD_PROJECT (required for Gemini via Vertex AI).',
      );
    }
    cached = new VertexAI({ project, location });
  }
  return cached;
}

export async function summarizeForClinician(rawText: string) {
  // MVP optional: keep behind env flag.
  if (process.env.GEMINI_ENABLED !== 'true') return null;

  const vertex = getVertexAi();
  const modelName = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';
  const model = vertex.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 256,
    },
  });

  const prompt = [
    'You are summarizing patient-provided and OCR-extracted text for a clinician.',
    'Rules:',
    '- Do NOT infer diagnosis or disease candidates.',
    '- Do NOT provide medical advice.',
    '- Only compress/structure what is explicitly stated.',
    '- Output in Korean.',
    '',
    'TEXT:',
    rawText,
  ].join('\n');

  const resp = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  return (
    resp.response.candidates?.[0]?.content?.parts
      ?.map((p) => ('text' in p ? p.text : ''))
      .join('')
      ?.trim() ?? null
  );
}

export async function analyzePatientStatus(params: {
  chiefComplaints: Array<{ complaint: string; date: string }>;
  currentMedications: Array<{
    name: string;
    dosage: string;
    frequency: string;
  }>;
  medicationHistory: Array<{
    date: string;
    taken: boolean;
    symptomLevel: number;
    notes?: string;
  }>;
  patientNotes?: string;
  intakeForms?: Array<{
    date: string;
    chiefComplaint: string;
    symptomStart: string;
    symptomProgress: string;
    sideEffects: string;
    allergies: string;
    medicationCompliance: string;
  }>;
  previousPrescriptions?: Array<{
    date: string;
    facility: string;
    diagnosis: string;
    chiefComplaint: string;
    medications: string;
  }>;
  patientInfo?: {
    age: number | null;
    bloodType: string | null;
    allergies: string | null;
  };
}) {
  if (process.env.GEMINI_ENABLED !== 'true') return null;

  const vertex = getVertexAi();
  const modelName = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';
  const model = vertex.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
  });

  const complaintsText =
    params.chiefComplaints.length > 0
      ? params.chiefComplaints
          .map((c) => `- ${c.complaint} (${c.date})`)
          .join('\n')
      : '없음';

  const medsText =
    params.currentMedications.length > 0
      ? params.currentMedications
          .map((m) => `- ${m.name} (${m.dosage}, ${m.frequency})`)
          .join('\n')
      : '없음';

  const adherenceRate =
    params.medicationHistory.length > 0
      ? Math.round(
          (params.medicationHistory.filter((h) => h.taken).length /
            params.medicationHistory.length) *
            100,
        )
      : 0;

  const avgSymptomLevel =
    params.medicationHistory.length > 0
      ? (
          params.medicationHistory.reduce((sum, h) => sum + h.symptomLevel, 0) /
          params.medicationHistory.length
        ).toFixed(1)
      : '0';

  const historyText =
    params.medicationHistory.length > 0
      ? params.medicationHistory
          .slice(-14)
          .map(
            (h) =>
              `- ${h.date}: ${h.taken ? '복용완료' : '복용누락'}, 증상수준 ${h.symptomLevel}/5${h.notes ? `, 메모: ${h.notes}` : ''}`,
          )
          .join('\n')
      : '없음';

  // 문진 기록 텍스트
  const intakeFormsText =
    params.intakeForms && params.intakeForms.length > 0
      ? params.intakeForms
          .map(
            (f) =>
              `[${f.date}]\n` +
              `  주요 증상: ${f.chiefComplaint}\n` +
              `  증상 시작: ${f.symptomStart || '미입력'}\n` +
              `  증상 경과: ${f.symptomProgress}\n` +
              `  복약 순응: ${f.medicationCompliance}\n` +
              (f.sideEffects && f.sideEffects !== '없음'
                ? `  부작용: ${f.sideEffects}\n`
                : '') +
              (f.allergies && f.allergies !== '없음'
                ? `  알러지: ${f.allergies}`
                : ''),
          )
          .join('\n\n')
      : '없음';

  // 이전 처방 기록 텍스트
  const prescriptionsText =
    params.previousPrescriptions && params.previousPrescriptions.length > 0
      ? params.previousPrescriptions
          .map(
            (p) =>
              `[${p.date}] ${p.facility}\n` +
              `  주호소: ${p.chiefComplaint || '미기재'}\n` +
              `  진단: ${p.diagnosis}\n` +
              `  처방약: ${p.medications || '없음'}`,
          )
          .join('\n\n')
      : '없음';

  // 환자 기본 정보 텍스트
  const patientInfoText = params.patientInfo
    ? [
        params.patientInfo.age ? `나이: ${params.patientInfo.age}세` : null,
        params.patientInfo.bloodType
          ? `혈액형: ${params.patientInfo.bloodType}`
          : null,
        params.patientInfo.allergies
          ? `알러지: ${params.patientInfo.allergies}`
          : null,
      ]
        .filter(Boolean)
        .join(', ')
    : '정보 없음';

  const prompt = [
    '당신은 의료진을 위한 환자 상태 분석 AI입니다.',
    '제공된 모든 정보를 종합적으로 분석하여 의료진이 진료에 참고할 수 있는 상세한 환자 상태 보고서를 작성해주세요.',
    '',
    '규칙:',
    '- 진단이나 질병 추측을 하지 마세요.',
    '- 의학적 조언을 제공하지 마세요.',
    '- 제공된 정보만을 바탕으로 분석하세요.',
    '- 한국어로 답변하세요.',
    '- 구체적이고 상세하게 작성하세요.',
    '- 시간 순서대로 증상 변화를 추적해주세요.',
    '',
    '═══════════════════════════════════════',
    '                    환자 정보',
    '═══════════════════════════════════════',
    '',
    `▶ 기본 정보: ${patientInfoText}`,
    '',
    '▶ 주요 증상 이력:',
    complaintsText,
    '',
    '▶ 현재 복용중인 약:',
    medsText,
    '',
    '═══════════════════════════════════════',
    '               복약 기록 (최근 2주)',
    '═══════════════════════════════════════',
    '',
    `▶ 복약 순응도: ${adherenceRate}%`,
    `▶ 평균 증상 수준: ${avgSymptomLevel}/5 (1: 매우 좋음 ~ 5: 매우 나쁨)`,
    '',
    '▶ 일별 복약 기록:',
    historyText,
    '',
    '═══════════════════════════════════════',
    '               문진 기록 (시간순)',
    '═══════════════════════════════════════',
    '',
    intakeFormsText,
    '',
    '═══════════════════════════════════════',
    '           이전 처방 기록 (최근 10건)',
    '═══════════════════════════════════════',
    '',
    prescriptionsText,
    '',
    params.patientNotes ? `▶ 추가 메모:\n${params.patientNotes}` : '',
    '',
    '═══════════════════════════════════════',
    '                 분석 요청',
    '═══════════════════════════════════════',
    '',
    '아래 형식으로 상세한 분석 보고서를 작성해주세요:',
    '',
    '【환자 상태 종합 분석】',
    '- 현재 주요 증상과 그 경과를 2-3문장으로 설명',
    '- 복약 순응도와 증상 변화의 상관관계 분석',
    '- 전반적인 건강 상태 추이 요약',
    '',
    '【복약 패턴 분석】',
    '- 복약 순응도 평가 (좋음/보통/주의 필요)',
    '- 복약 누락 패턴이 있다면 설명',
    '- 복약과 증상 변화의 연관성',
    '',
    '【증상 경과 분석】',
    '- 시간에 따른 증상 변화 추이',
    '- 호전/악화 여부 및 그 정도',
    '- 특이사항이나 주목할 변화',
    '',
    '【부작용 및 알러지 확인】',
    '- 보고된 부작용 정리',
    '- 알러지 정보 및 주의사항',
    '- 약물 간 상호작용 우려 사항',
    '',
    '【의료진 주의사항】',
    '- 진료 시 반드시 확인해야 할 사항 3-5개',
    '- 추가 문진이 필요한 영역',
    '- 특별히 주의해야 할 위험 요소',
    '',
    '【처방 이력 요약】',
    '- 주요 처방 패턴 및 변화',
    '- 반복되는 증상이나 진단',
    '- 치료 반응 추이',
    '',
    '분석을 시작해주세요:',
  ].join('\n');

  try {
    const resp = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const result =
      resp.response.candidates?.[0]?.content?.parts
        ?.map((p) => ('text' in p ? p.text : ''))
        .join('')
        ?.trim() ?? null;

    return result;
  } catch (error) {
    console.error('환자 상태 분석 중 오류:', error);
    return null;
  }
}
