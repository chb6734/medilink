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
}) {
  if (process.env.GEMINI_ENABLED !== 'true') return null;

  const vertex = getVertexAi();
  const modelName = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';
  const model = vertex.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 512,
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
          .slice(-7)
          .map(
            (h) =>
              `- ${h.date}: ${h.taken ? '복용완료' : '복용누락'}, 증상수준 ${h.symptomLevel}/5${h.notes ? `, 메모: ${h.notes}` : ''}`,
          )
          .join('\n')
      : '없음';

  const prompt = [
    '당신은 의료진을 위한 환자 상태 분석 AI입니다.',
    '제공된 정보를 바탕으로 환자의 현재 상태를 간략히 요약하고 주의사항을 알려주세요.',
    '',
    '규칙:',
    '- 진단이나 질병 추측을 하지 마세요.',
    '- 의학적 조언을 제공하지 마세요.',
    '- 제공된 정보만을 바탕으로 분석하세요.',
    '- 한국어로 답변하세요.',
    '- 간결하고 명확하게 작성하세요.',
    '',
    '=== 환자 정보 ===',
    '',
    '주요 증상:',
    complaintsText,
    '',
    '현재 복용중인 약:',
    medsText,
    '',
    '복약 기록 (최근 7일):',
    `- 복약 순응도: ${adherenceRate}%`,
    `- 평균 증상 수준: ${avgSymptomLevel}/5`,
    historyText,
    '',
    params.patientNotes ? `환자 메모:\n${params.patientNotes}` : '',
    '',
    '=== 분석 요청 ===',
    '다음 형식으로 답변해주세요:',
    '',
    '【현재 상태 요약】',
    '환자의 현재 상태를 2-3문장으로 간략히 요약해주세요.',
    '',
    '【주의사항】',
    '의료진이 주의해야 할 사항을 2-3개 항목으로 나열해주세요.',
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
