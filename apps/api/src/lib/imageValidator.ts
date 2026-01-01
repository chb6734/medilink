import { VertexAI } from '@google-cloud/vertexai';

/**
 * 이미지 검증 - 의료 문서 여부 판별
 *
 * @description
 * 업로드된 이미지가 처방전, 약봉투, 조제전 등 의료 문서인지 Gemini로 검증합니다.
 * 의료 문서가 아니면 에러를 발생시켜 사용자에게 올바른 사진을 요청합니다.
 */

const project = process.env.GOOGLE_CLOUD_PROJECT || '';
const location = process.env.GOOGLE_CLOUD_LOCATION || 'asia-northeast3';
const modelName = 'gemini-2.0-flash-exp';

export interface ImageValidationResult {
  isValid: boolean;
  documentType?: 'prescription' | 'medicine_bag' | 'dispensing_record' | 'unknown';
  reason: string;
  confidence: number;
}

/**
 * 이미지가 의료 문서인지 검증
 *
 * @param imageBuffer - 이미지 버퍼
 * @param mimeType - MIME 타입 (예: image/jpeg, image/png)
 * @returns 검증 결과
 */
export async function validateMedicalDocument(
  imageBuffer: Buffer,
  mimeType: string,
): Promise<ImageValidationResult> {
  if (!project) {
    console.warn('⚠️ GOOGLE_CLOUD_PROJECT 환경 변수가 설정되지 않았습니다. 이미지 검증을 건너뜁니다.');
    return {
      isValid: true,
      documentType: 'unknown',
      reason: '환경 변수 미설정으로 검증 건너뜀',
      confidence: 0,
    };
  }

  try {
    const vertex = new VertexAI({ project, location });
    const model = vertex.getGenerativeModel({ model: modelName });

    const prompt = `당신은 이미지가 의료 관련 문서인지 판별하는 AI 어시스턴트입니다.

이미지를 분석하여 다음 중 하나에 해당하는지 판별해주세요:
1. 처방전 (Prescription) - 의사가 발행한 처방 문서
2. 약봉투 (Medicine Bag) - 약국에서 받은 약봉투 (약 이름, 복용법 등이 표기됨)
3. 조제내역서 (Dispensing Record) - 약국에서 발행한 조제 내역 문서

**판별 기준:**
- 의료기관 이름 (병원, 약국)
- 약물 이름
- 복용법, 용량, 횟수
- 처방일, 조제일
- 환자명, 등록번호

위 조건 중 2개 이상이 명확히 보이면 의료 문서로 판정합니다.

**다음은 의료 문서가 아닙니다:**
- 일반 음식 사진
- 풍경 사진
- 사람 얼굴 사진
- 텍스트 없는 이미지
- 의료와 무관한 문서 (영수증, 계약서 등)

다음 JSON 형식으로만 응답해주세요:
{
  "isValid": true/false,
  "documentType": "prescription" | "medicine_bag" | "dispensing_record" | "unknown",
  "reason": "판별 이유 (1-2문장)",
  "confidence": 0-100 (확신도)
}

예시:
- 약봉투 사진 → {"isValid": true, "documentType": "medicine_bag", "reason": "약국명, 약물명, 복용법이 명확히 보임", "confidence": 95}
- 음식 사진 → {"isValid": false, "documentType": "unknown", "reason": "의료 문서 관련 텍스트가 보이지 않음", "confidence": 90}`;

    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType,
      },
    };

    const resp = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }, imagePart],
        },
      ],
    });

    const text = resp.response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // JSON 파싱
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ Gemini 응답에서 JSON을 찾을 수 없습니다:', text);
      // 검증 실패 시 기본값으로 통과 (너무 엄격하면 사용자 경험 저해)
      return {
        isValid: true,
        documentType: 'unknown',
        reason: 'JSON 파싱 실패',
        confidence: 0,
      };
    }

    const result: ImageValidationResult = JSON.parse(jsonMatch[0]);

    console.log('✅ 이미지 검증 결과:', result);

    return result;
  } catch (error) {
    console.error('❌ 이미지 검증 중 오류 발생:', error);
    // 오류 발생 시 기본값으로 통과
    return {
      isValid: true,
      documentType: 'unknown',
      reason: '검증 오류 발생',
      confidence: 0,
    };
  }
}
