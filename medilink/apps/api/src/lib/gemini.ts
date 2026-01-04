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
      maxOutputTokens: 8192,
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
    '⚠️ 중요 요구사항:',
    '- 반드시 최소 2000자 이상으로 상세하게 작성해주세요.',
    '- 각 섹션별로 충분한 분량(최소 3-5문장)으로 작성해주세요.',
    '- 데이터가 부족하더라도 있는 정보를 최대한 활용하여 분석해주세요.',
    '- 짧게 요약하지 말고, 의료진이 충분히 참고할 수 있도록 자세히 서술해주세요.',
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
    '아래 형식으로 상세한 분석 보고서를 작성해주세요.',
    '각 섹션은 반드시 3-5문장 이상으로 충분히 상세하게 작성해주세요.',
    '',
    '## 환자 상태 종합 분석',
    '(최소 5문장 이상 작성)',
    '- 현재 환자가 호소하는 주요 증상이 무엇인지 구체적으로 설명',
    '- 증상이 언제부터 시작되었고 어떻게 변화해왔는지 시간순 설명',
    '- 복약 순응도가 증상 변화에 어떤 영향을 미쳤는지 분석',
    '- 전반적인 건강 상태가 호전/유지/악화 중인지 평가',
    '- 환자의 현재 상태에 대한 종합적인 소견',
    '',
    '## 복약 패턴 분석',
    '(최소 4문장 이상 작성)',
    '- 복약 순응도 수치와 그 의미 해석',
    '- 복약을 잘 지키는 날과 누락하는 날의 패턴 분석',
    '- 복약 누락 시 증상 변화가 있었는지 분석',
    '- 현재 복용 중인 약물들의 복용 현황 정리',
    '- 복약 관리에 대한 개선점이나 주의사항',
    '',
    '## 증상 경과 분석',
    '(최소 4문장 이상 작성)',
    '- 증상 수준(1-5점)의 시간에 따른 변화 추이 상세 설명',
    '- 증상이 가장 심했던 시기와 가장 좋았던 시기 비교',
    '- 증상 변화에 영향을 준 것으로 보이는 요인들',
    '- 현재 증상 상태와 앞으로의 예상 경과',
    '',
    '## 부작용 및 알러지 확인',
    '(최소 3문장 이상 작성)',
    '- 환자가 보고한 부작용 목록과 각각의 심각도',
    '- 알러지 정보 및 관련 주의사항 상세 설명',
    '- 현재 복용 약물 간 상호작용 가능성 검토',
    '- 부작용 관련 추가 모니터링 필요 사항',
    '',
    '## 의료진 주의사항',
    '(최소 5개 항목 이상 작성)',
    '- 이번 진료에서 반드시 확인해야 할 핵심 사항들',
    '- 환자에게 추가로 문진해야 할 내용들',
    '- 검사나 추가 평가가 필요한 영역',
    '- 처방 시 고려해야 할 특별 주의사항',
    '- 다음 진료까지 모니터링해야 할 사항',
    '',
    '## 처방 이력 요약',
    '(최소 4문장 이상 작성)',
    '- 지금까지의 주요 처방 내역과 변화 흐름',
    '- 반복적으로 나타나는 증상이나 처방 패턴',
    '- 이전 처방에 대한 치료 반응 평가',
    '- 향후 처방 방향에 대한 참고 사항',
    '',
    '---',
    '위 형식에 맞춰 각 섹션을 빠짐없이, 최소 2000자 이상으로 상세하게 작성해주세요.',
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
