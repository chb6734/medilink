import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';

const extractedMedicationSchema = z.object({
  medicationName: z.string().min(1, '약물명은 필수입니다'),
  dose: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  prescriptionDate: z.string().nullable().optional(),
  dispensingDate: z.string().nullable().optional(),
  confidence: z.number().int().min(0).max(100),
  // 확장 필드
  ingredients: z.string().nullable().optional(),
  indication: z.string().nullable().optional(),
  dosesPerDay: z.number().int().nullable().optional(),
  totalDoses: z.number().int().nullable().optional(),
});

const ocrResponseSchema = z.object({
  medications: z.array(extractedMedicationSchema),
  rawText: z.string(),
  hospitalName: z.string().nullable().optional(),
  patientCondition: z.string().nullable().optional(),
});

export type ExtractedMedication = z.infer<typeof extractedMedicationSchema> & {
  rawOcrText: string;
};

export type OcrResult = {
  medications: ExtractedMedication[];
  rawText: string;
  hospitalName?: string | null;
  patientCondition?: string | null;
  errors?: string[];
};

function getGenAiClient() {
  const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ Missing AI_INTEGRATIONS_GEMINI_API_KEY');
    throw new Error('Missing AI_INTEGRATIONS_GEMINI_API_KEY');
  }

  const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  const apiVersion = process.env.AI_INTEGRATIONS_GEMINI_API_VERSION;

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      ...(apiVersion ? { apiVersion } : {}),
      ...(baseUrl ? { baseUrl } : {}),
    },
  });
}

export function isGeminiOcrEnabled() {
  const v = (process.env.GEMINI_OCR_ENABLED ?? '').trim().toLowerCase();
  const enabled = v === 'true' || v === '1' || v === 'yes' || v === 'y';
  return enabled;
}

// 환경변수 상태 출력 함수 (main.ts에서 호출)
export function logGeminiOcrConfig() {
  const enabled = isGeminiOcrEnabled();
  console.log('\n' + '='.repeat(80));
  console.log('🔧 Gemini OCR 환경변수 상태');
  console.log('='.repeat(80));
  console.log(
    'GEMINI_OCR_ENABLED:',
    process.env.GEMINI_OCR_ENABLED || '(설정 안됨)',
  );
  console.log('활성화 여부:', enabled ? '✅ 활성화됨' : '❌ 비활성화됨');
  console.log(
    'AI_INTEGRATIONS_GEMINI_API_KEY:',
    process.env.AI_INTEGRATIONS_GEMINI_API_KEY ? '✅ 설정됨' : '❌ 설정 안됨',
  );
  console.log(
    'GEMINI_OCR_MODEL:',
    process.env.GEMINI_OCR_MODEL || 'gemini-3-flash-preview (기본값)',
  );
  console.log('='.repeat(80) + '\n');
}

export async function extractMedicationsFromImage(
  imageBuffer: Buffer,
  mimeType = 'image/jpeg',
): Promise<OcrResult> {
  console.log('\n🔍 extractMedicationsFromImage 호출됨');
  console.log('이미지 크기:', imageBuffer.length, 'bytes');
  console.log('MIME 타입:', mimeType);

  const ai = getGenAiClient();
  const model = process.env.GEMINI_OCR_MODEL ?? 'gemini-3-flash-preview';
  console.log('사용 모델:', model);
  console.log('API Key 설정:', !!process.env.AI_INTEGRATIONS_GEMINI_API_KEY);

  try {
    const base64Image = imageBuffer.toString('base64');
    console.log('Base64 인코딩 완료, 길이:', base64Image.length);

    // 1단계: 전체 텍스트 추출
    const textExtractionPrompt = `이 이미지는 한국의 처방전 또는 조제내역서입니다.
이미지에서 모든 텍스트를 **정확하게** 읽어서 JSON 형식으로 반환해주세요.

**텍스트 읽기 및 증상 추론 주의사항:**
- 한글 자모를 정확하게 구분하세요 (예: "누" vs "두", "리" vs "이")
- 숫자를 정확하게 읽으세요 (예: "0" vs "O", "1" vs "I")
- 병원명/의원명은 "처방의원", "처방병원", "발행기관" 등의 라벨 옆에 있는 이름을 찾으세요
- 약국명은 "조제약국", "조제기관" 등의 라벨 옆에 있는 이름입니다 (이것은 제외하세요)
- **증상 추론(patientCondition)**: 이미지에 진단명이 명시되어 있으면 그것을 최우선으로 사용하세요. 진단명이 없더라도 처방된 약물들의 목록을 보고, 이 약들이 어떤 증상(예: 코감기, 몸살, 위염, 안구건조증 등)을 위해 처방된 것인지 약학 지식을 바탕으로 추론하여 한국어로 짧게 요약해주세요. (예: '코감기, 알레르기 비염', '근육통 및 몸살' 등)

{
  "rawText": "이미지에서 읽은 모든 텍스트 (줄바꿈 포함, 그대로, 정확하게)",
  "hospitalName": "처방 기관명 (병원명 또는 의원명만 추출, 약국명은 절대 포함하지 마세요. '처방의원', '처방병원', '발행기관' 등의 라벨 옆에 있는 이름을 찾으세요. 없으면 null)",
  "patientCondition": "진단명 또는 약물 기반 추론 증상 (한국어로 짧게 요약, 없으면 null)"
}

**중요:**
- hospitalName은 처방을 한 병원/의원명만 추출하세요. 약국명(조제약국)은 제외하세요.
- patientCondition은 사용자가 자신의 증상을 쉽게 알 수 있도록 '코감기', '복통', '피부염' 처럼 친숙한 용어로 추론해 주세요.
- 텍스트를 정확하게 읽으세요. "두리이비인후과"를 "누리이비인후과"로 잘못 읽지 마세요.
`;

    const textResponse = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            { text: textExtractionPrompt },
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rawText: { type: Type.STRING },
            hospitalName: { type: Type.STRING, nullable: true },
            patientCondition: { type: Type.STRING, nullable: true },
          },
          required: ['rawText'],
        },
      },
    });

    interface TextExtractionResponse {
      rawText?: string;
      hospitalName?: string | null;
      patientCondition?: string | null;
    }

    const responseText: string =
      (textResponse as { text?: string })?.text || '{}';
    const textData = JSON.parse(responseText) as TextExtractionResponse;
    const rawText = textData.rawText || '';
    const hospitalName = textData.hospitalName || null;
    const patientCondition = textData.patientCondition || null;

    if (!rawText || rawText.length < 5) {
      console.error(
        '❌ 1단계 텍스트 추출 실패: 텍스트가 너무 짧거나 없습니다.',
      );
      return {
        medications: [],
        rawText: rawText || '',
        hospitalName: hospitalName || '없음',
        patientCondition: patientCondition || '없음',
        errors: ['이미지에서 텍스트를 추출하지 못했습니다.'],
      };
    }

    // 로그 출력
    const separator = '='.repeat(80);
    console.log('\n' + separator);
    console.log('📝 1단계: 텍스트 추출 완료');
    console.log(separator);
    console.log('전체 텍스트 길이:', rawText.length);
    console.log('병원명:', hospitalName);
    console.log('진단명:', patientCondition);
    console.log('\n전체 텍스트 (처음 500자):', rawText.substring(0, 500));
    if (rawText.length > 500) {
      console.log('... (전체 길이:', rawText.length, '자)');
    }
    console.log(separator + '\n');

    // 2단계: 추출된 텍스트에서 약물명 찾기
    const medicationExtractionPrompt = `다음은 한국 처방전/조제내역서에서 추출한 텍스트입니다.
이 텍스트에서 **약물명만** 정확하게 찾아서 추출해주세요.

**추출할 텍스트:**
${rawText}

**약물 분석 및 증상 추론 지침:**
1. 각 약물의 **indication(적응증)**을 약학 지식을 바탕으로 분석하여 기입하세요 (예: "해열진통제", "항생제", "소화제" 등).
2. 추출된 모든 약물을 종합하여, 환자가 어떤 증상으로 인해 이 약들을 처방받았는지 추론하세요.
3. 이미지에서 이미 추출된 patientCondition("${patientCondition || '없음'}")이 있다면 이를 참고하여 더욱 구체화하거나 보완하세요.

**약물명 패턴:**
- 약물명 뒤에 "정", "캡슐", "앰플", "시럽", "연고", "점안액", "주사액" 등의 형태가 붙습니다
- 예: "타이레놀정", "아모시실린캡슐", "게보린정", "판콜에이내복액", "베아제정"
- 약물명은 보통 용량(예: 500mg, 1정)이나 복용법(예: 1일 3회)과 함께 표시됩니다

**약물명이 아닌 항목 (절대 포함하지 마세요):**
- 환자명, 성명, 이름, 환자정보
- 병원명, 의원명, 약국명, 기관명, 발행기관
- 주소, 전화번호, 우편번호, 연락처
- 처방일, 조제일, 발행일 (날짜 자체는 제외, 약물과 연결된 날짜만)
- 영수증번호, 약제비, 본인부담금, 보험자부담금, 비급여, 금액
- 복용법, 용법, 용량, 횟수, 기간 (설명문 자체)
- 주의사항, 경고, 부작용, 효능, 효과 (설명문)
- 의사명, 약사명, 담당자명
- 진단명, 상병명 (질병명은 제외)

**약물명 추출 방법:**
1. "정", "캡슐", "앰플", "시럽" 등의 형태가 붙은 단어를 찾으세요
2. 용량(예: 500mg, 1정)이나 복용법(예: 1일 3회)과 함께 나오는 약물명을 찾으세요
3. 표나 목록 형태로 나열된 항목 중 약물명을 찾으세요
4. 확실하지 않은 항목은 제외하세요 (confidence 60 이하)

다음 형식의 JSON으로 응답해주세요:
{
  "medications": [
    {
      "medicationName": "약물명 (예: 타이레놀정, 아모시실린캡슐) - 반드시 실제 약물명만",
      "dose": "용량 (예: 500mg, 1정, 없으면 null)",
      "frequency": "복용 빈도 (예: 1일 3회 식후, 없으면 null)",
      "duration": "복용 기간 (예: 7일분, 없으면 null)",
      "prescriptionDate": "처방일 (YYYY-MM-DD 형식, '처방일' 라벨 옆의 날짜를 정확하게 읽으세요, 없으면 null)",
      "dispensingDate": "조제일 (YYYY-MM-DD 형식, '조제일' 라벨 옆의 날짜를 정확하게 읽으세요, 없으면 null)",
      "confidence": 신뢰도 (0-100 정수, 약물명이 확실하면 80 이상, 불확실하면 60 이하),
      "ingredients": "약물의 주요 성분 (약학 지식 기반으로 추론, 없으면 null)",
      "indication": "이 약이 쓰이는 주된 증상/효능 (예: 해열진통, 항생, 소화불량 개선 등, 없으면 null)",
      "dosesPerDay": 1일 복용 횟수 (정수, 없으면 null),
      "totalDoses": 총 복용 횟수 (기간 x 1일 복용 횟수, 없으면 null)
    }
  ]
}

**날짜 추출 지침:**
- 처방일(prescriptionDate): "처방일", "처방일자", "발행일" 등의 라벨 옆에 있는 날짜를 찾으세요
- 조제일(dispensingDate): "조제일", "조제일자", "조제일시" 등의 라벨 옆에 있는 날짜를 찾으세요
- 날짜는 YYYY-MM-DD 형식으로 변환하세요 (예: 2025-04-15, 2025.04.15 -> 2025-04-15)
- 날짜를 정확하게 읽으세요 (예: "2025-04-15"를 "2025-04-18"로 잘못 읽지 마세요)
- 각 약물마다 개별 날짜가 있으면 그 날짜를 사용하고, 없으면 문서 전체의 처방일/조제일을 사용하세요

**투약일수 추출 지침:**
- "투약일수", "복용일수", "기간" 등의 라벨 옆에 있는 숫자를 찾으세요
- duration 필드에서 "3일", "3일분", "3일치" 등의 표현을 찾아서 숫자만 추출하세요
- totalDoses는 투약일수 x 1일 복용 횟수로 계산하세요 (예: 3일 x 3회 = 9회)

**중요 지침:**
- medications 배열에는 **실제 약물명만** 포함하세요
- 약물명이 확실하지 않으면 해당 항목을 제외하세요 (confidence 60 이하로 설정)
- 약물명이 하나도 없으면 빈 배열 []을 반환하세요
- 모든 텍스트를 정확하게 읽고 오인식하지 마세요`;

    const medicationResponse = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [{ text: medicationExtractionPrompt }],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            medications: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  medicationName: { type: Type.STRING },
                  dose: { type: Type.STRING, nullable: true },
                  frequency: { type: Type.STRING, nullable: true },
                  duration: { type: Type.STRING, nullable: true },
                  prescriptionDate: { type: Type.STRING, nullable: true },
                  dispensingDate: { type: Type.STRING, nullable: true },
                  confidence: { type: Type.INTEGER },
                  ingredients: { type: Type.STRING, nullable: true },
                  indication: { type: Type.STRING, nullable: true },
                  dosesPerDay: { type: Type.INTEGER, nullable: true },
                  totalDoses: { type: Type.INTEGER, nullable: true },
                },
                required: ['medicationName', 'confidence'],
              },
            },
          },
          required: ['medications'],
        },
      },
    });

    interface MedicationResponse {
      medications?: Array<{
        medicationName: string;
        dose?: string | null;
        frequency?: string | null;
        duration?: string | null;
        prescriptionDate?: string | null;
        dispensingDate?: string | null;
        confidence: number;
        ingredients?: string | null;
        indication?: string | null;
        dosesPerDay?: number | null;
        totalDoses?: number | null;
      }>;
    }

    const medicationResponseText: string =
      (medicationResponse as { text?: string })?.text || '{}';
    const medicationData = JSON.parse(
      medicationResponseText,
    ) as MedicationResponse;
    const medications = medicationData.medications || [];

    // 1단계와 2단계 결과 합치기
    interface RawOcrResponse {
      medications: Array<{
        medicationName: string;
        dose?: string | null;
        frequency?: string | null;
        duration?: string | null;
        prescriptionDate?: string | null;
        dispensingDate?: string | null;
        confidence: number;
        ingredients?: string | null;
        indication?: string | null;
        dosesPerDay?: number | null;
        totalDoses?: number | null;
      }>;
      rawText: string;
      hospitalName: string | null;
      patientCondition: string | null;
    }

    const raw: RawOcrResponse = {
      medications,
      rawText,
      hospitalName,
      patientCondition,
    };

    // AI OCR 원본 응답 로그 출력
    const separator2 = '='.repeat(80);
    console.log('\n' + separator2);
    console.log('🤖 Gemini OCR 원본 응답 (2단계: 약물명 추출)');
    console.log(separator2);
    console.log('약물 개수:', raw.medications.length);
    if (raw.medications.length > 0) {
      console.log('\n약물 목록:');
      raw.medications.forEach((med, idx: number) => {
        console.log(
          `  ${idx + 1}. ${med.medicationName} (신뢰도: ${med.confidence}%)`,
        );
        console.log(`     - 용량: ${med.dose || '없음'}`);
        console.log(`     - 빈도: ${med.frequency || '없음'}`);
        console.log(`     - 기간: ${med.duration || '없음'}`);
        console.log(`     - 처방일: ${med.prescriptionDate || '없음'}`);
        console.log(`     - 조제일: ${med.dispensingDate || '없음'}`);
      });
    } else {
      console.log('⚠️  약물이 추출되지 않았습니다!');
    }
    console.log('\n병원명:', raw.hospitalName || '없음');
    console.log('진단명:', raw.patientCondition || '없음');
    console.log('전체 텍스트 길이:', raw.rawText.length);
    console.log('\n전체 응답 JSON:');
    console.log(JSON.stringify(raw, null, 2));
    console.log(separator2 + '\n');

    const validation = ocrResponseSchema.safeParse(raw);

    // 약물명 필터링 함수
    const isValidMedicationName = (name: string): boolean => {
      if (!name || typeof name !== 'string') return false;

      const trimmed = name.trim();
      if (trimmed.length < 2) return false;

      // 약물명이 아닌 일반적인 텍스트 패턴 제외
      const excludePatterns = [
        /^(환자명|이름|성명|처방일|조제일|발행일|복용|복약|주의|경고|부작용|효능|효과|용법|용량|횟수|기간|일수|개월|주|일|회|정|캡슐|앰플|시럽|연고|점안|주사|정제|환|고약|파우더|분말|액|물|가루|알약|알|정|캡|앰|시|연|점|주|고|파|분|액|물|가루)/i,
        /^(병원|의원|약국|병원명|의원명|약국명|기관|발행기관|처방기관|조제기관)/i,
        /^(주소|전화|연락처|번호|우편번호|주소지|소재지)/i,
        /^(의사|약사|처방의|조제약사|담당|담당자|의사명|약사명)/i,
        /^(날짜|년|월|일|시|분|초|오전|오후|AM|PM)/i,
        /^(총|합계|금액|원|만원|천원|원화|비용|가격|요금)/i,
        /^(보험|건강|의료|보험자|피보험자|보험번호|증권번호)/i,
        /^(진단|상병|질병|증상|병명|상병명|진단명)/i,
        /^(복용법|용법|용량|횟수|기간|복용기간|투약|투약법|투약기간)/i,
        /^(주의|경고|금기|부작용|상호작용|주의사항|경고사항)/i,
        /^(효능|효과|적응증|적응|목적|용도)/i,
        /^(제조|제조사|제조원|제조일자|유통기한|만료일|유효기간)/i,
        /^(처방전|조제전|조제내역|처방내역|내역서|기록|기록지)/i,
        /^(번호|No|NO|#|번호표|순번|순서|항목|항|번|호)/i,
        /^(서명|날인|인|도장|직인|서명란|날인란)/i,
        /^(확인|검토|승인|처리|완료|대기|진행|상태)/i,
        /^\d+$/, // 숫자만 있는 경우
        /^[가-힣]{1,2}$/, // 1-2글자 한글만 (너무 짧음)
        /^(정|캡슐|앰플|시럽|연고|점안|주사|정제|환|고약|파우더|분말|액|물|가루|알약|알|캡|앰|시|연|점|주|고|파|분|액|물|가루)$/i, // 약물 형태만 (약물명 아님)
      ];

      // 제외 패턴 체크
      for (const pattern of excludePatterns) {
        if (pattern.test(trimmed)) {
          return false;
        }
      }

      // 너무 짧거나 일반적인 단어 제외
      if (trimmed.length < 3 && !/[가-힣]/.test(trimmed)) {
        return false;
      }

      return true;
    };

    interface RawMedication {
      medicationName: string;
      dose?: string | null;
      frequency?: string | null;
      duration?: string | null;
      prescriptionDate?: string | null;
      dispensingDate?: string | null;
      confidence: number;
      ingredients?: string | null;
      indication?: string | null;
      dosesPerDay?: number | null;
      totalDoses?: number | null;
    }

    // 약물명 필터링 및 정규화
    const filterAndNormalizeMedications = (
      meds: RawMedication[],
    ): ExtractedMedication[] => {
      return meds
        .filter((m) => {
          if (!m?.medicationName || typeof m.medicationName !== 'string') {
            return false;
          }

          // 약물명 유효성 검사
          if (!isValidMedicationName(m.medicationName)) {
            return false;
          }

          // confidence가 너무 낮으면 제외 (50 미만)
          const conf =
            typeof m.confidence === 'number'
              ? Math.min(100, Math.max(0, Math.round(m.confidence)))
              : 50;

          if (conf < 50) {
            return false;
          }

          return true;
        })
        .map(
          (m): ExtractedMedication => ({
            medicationName: String(m.medicationName).trim(),
            dose: m.dose ? String(m.dose).trim() : null,
            frequency: m.frequency ? String(m.frequency).trim() : null,
            duration: m.duration ? String(m.duration).trim() : null,
            prescriptionDate: m.prescriptionDate
              ? String(m.prescriptionDate).trim()
              : null,
            dispensingDate: m.dispensingDate
              ? String(m.dispensingDate).trim()
              : null,
            confidence:
              typeof m.confidence === 'number'
                ? Math.min(100, Math.max(0, Math.round(m.confidence)))
                : 70,
            rawOcrText: raw.rawText,
            ingredients: m.ingredients ? String(m.ingredients).trim() : null,
            indication: m.indication ? String(m.indication).trim() : null,
            dosesPerDay:
              typeof m.dosesPerDay === 'number' ? m.dosesPerDay : null,
            totalDoses: typeof m.totalDoses === 'number' ? m.totalDoses : null,
          }),
        );
    };

    if (!validation.success) {
      const filtered = filterAndNormalizeMedications(raw.medications);
      return {
        medications: filtered,
        rawText: raw.rawText,
        hospitalName: raw.hospitalName ?? null,
        patientCondition: raw.patientCondition ?? null,
        errors: validation.error.issues.map((e) => e.message),
      };
    }

    // 검증 성공해도 필터링 적용
    const filtered = filterAndNormalizeMedications(
      validation.data.medications as RawMedication[],
    );

    // 필터링된 결과 로그 출력
    const separator3 = '='.repeat(80);
    console.log('\n' + separator3);
    console.log('✅ 필터링된 OCR 결과 (최종)');
    console.log(separator3);
    console.log(`원본 약물 개수: ${validation.data.medications.length}`);
    console.log(`필터링 후 약물 개수: ${filtered.length}`);
    if (filtered.length > 0) {
      console.log('\n최종 약물 목록:');
      filtered.forEach((med, idx) => {
        console.log(
          `  ${idx + 1}. ${med.medicationName} (신뢰도: ${med.confidence}%)`,
        );
      });
    } else {
      console.log('⚠️  필터링 후 약물이 없습니다!');
    }
    console.log('\n병원명:', validation.data.hospitalName || '없음');
    console.log('진단명:', validation.data.patientCondition || '없음');
    console.log(separator3 + '\n');

    return {
      medications: filtered.map(
        (m): ExtractedMedication => ({
          ...m,
          rawOcrText: validation.data.rawText,
          dose: m.dose ?? null,
          frequency: m.frequency ?? null,
          duration: m.duration ?? null,
          prescriptionDate: m.prescriptionDate ?? null,
          dispensingDate: m.dispensingDate ?? null,
          ingredients: m.ingredients ?? null,
          indication: m.indication ?? null,
          dosesPerDay: m.dosesPerDay ?? null,
          totalDoses: m.totalDoses ?? null,
        }),
      ),
      rawText: validation.data.rawText,
      hospitalName: validation.data.hospitalName ?? null,
      patientCondition: validation.data.patientCondition ?? null,
    };
  } catch (e) {
    return {
      medications: [],
      rawText: '',
      errors: [e instanceof Error ? e.message : 'OCR 처리 중 오류 발생'],
    };
  }
}

export interface ConflictItem {
  type: string;
  description: string;
}

export async function detectConflicts(
  medications: Array<{
    medicationName: string;
    dose?: string | null;
    duration?: string | null;
    confidence?: number;
  }>,
  allergies: string | null,
  adverseEvents: string | null,
): Promise<ConflictItem[]> {
  if (medications.length === 0) return [];
  const ai = getGenAiClient();
  const model =
    process.env.GEMINI_CONFLICT_MODEL ??
    process.env.GEMINI_OCR_MODEL ??
    'gemini-3-flash-preview';

  const prompt = `다음 약물 목록에서 잠재적인 문제점을 확인해주세요:

약물 목록:
${medications
  .map(
    (m, i) =>
      `${i + 1}. ${m.medicationName} (용량: ${m.dose || '불명'}, 기간: ${m.duration || '불명'})`,
  )
  .join('\n')}

환자 보고 알레르기: ${allergies || '없음'}
환자 보고 부작용: ${adverseEvents || '없음'}

다음 유형의 문제를 확인하세요:
1. duplicate: 동일/유사 약물 중복
2. date_overlap: 복용 기간 중복
3. allergy_conflict: 알레르기 약물과의 충돌 가능성
4. low_confidence: OCR 신뢰도가 낮은 항목

JSON 배열로 응답해주세요:
[
  {
    "type": "duplicate|date_overlap|allergy_conflict|low_confidence",
    "description": "문제 설명 (한국어)"
  }
]

문제가 없으면 빈 배열 []을 반환하세요.`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ['type', 'description'],
        },
      },
    },
  });

  try {
    const parsed = JSON.parse(
      (response as { text?: string })?.text || '[]',
    ) as ConflictItem[];
    return parsed;
  } catch {
    return [];
  }
}
