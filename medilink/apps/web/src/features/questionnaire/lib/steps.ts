/**
 * Questionnaire Step Definitions
 */

export type StepKind = 'symptom' | 'select' | 'textarea';

export interface Step {
  id: string;
  kind: StepKind;
  required: boolean;
  title?: string;
  subtitle?: string;
  options?: string[];
  placeholder?: string;
  skipIf?: () => boolean;
}

export const SYMPTOM_OPTIONS = [
  '감기/기침',
  '발열',
  '복통/설사',
  '두통',
  '어지러움',
  '피부 증상',
  '허리/관절 통증',
  '기타',
] as const;

export const SYMPTOM_START_OPTIONS = [
  '오늘',
  '1-2일 전',
  '3-7일 전',
  '1-2주 전',
  '2주 이상',
] as const;

export const SYMPTOM_PROGRESS_OPTIONS = [
  '점점 좋아지고 있어요',
  '비슷해요',
  '점점 나빠지고 있어요',
  '좋았다 나빠다 해요',
] as const;

export const NEW_VISIT_MEDICATION_OPTIONS = [
  '아니요, 먹지 않았어요',
  '네, 사서 먹었어요',
] as const;

export const FOLLOWUP_MEDICATION_OPTIONS = [
  '처방받은 적 없음',
  '빠짐없이 먹었어요',
  '가끔 빠뜨렸어요',
  '자주 빠뜨렸어요',
  '먹다가 중단했어요',
] as const;

/**
 * 약 복용 여부 확인
 */
export function didTakeMedication(medicationCompliance: string | undefined): boolean {
  if (!medicationCompliance) return false;
  return !medicationCompliance.includes('아니요') && !medicationCompliance.includes('처방받은 적 없음');
}

/**
 * 방문 유형에 따른 스텝 생성
 */
export function createSteps(
  visitType: 'new' | 'followup',
  medicationCompliance: string | undefined
): Step[] {
  const medicationStep: Step = visitType === 'new'
    ? {
        id: 'medicationCompliance',
        kind: 'select',
        required: true,
        title: '약국에서 약을 사서 드셨나요?',
        subtitle: '처방 없이 직접 구매한 약이 있는지 알려주세요',
        options: [...NEW_VISIT_MEDICATION_OPTIONS],
      }
    : {
        id: 'medicationCompliance',
        kind: 'select',
        required: true,
        title: '처방받은 약을 드셨나요?',
        subtitle: '복약 여부는 진료 판단에 큰 도움이 됩니다',
        options: [...FOLLOWUP_MEDICATION_OPTIONS],
      };

  return [
    {
      id: 'chiefComplaint',
      kind: 'symptom',
      required: true,
    },
    {
      id: 'symptomProgress',
      kind: 'select',
      required: true,
      title: '증상이 어떻게 변했나요?',
      subtitle: '최근 며칠 사이 경과를 선택해주세요',
      options: [...SYMPTOM_PROGRESS_OPTIONS],
    },
    medicationStep,
    {
      id: 'sideEffects',
      kind: 'textarea',
      required: true,
      title: '약 먹고 이상한 점은 없었나요?',
      subtitle: '"없다면 "없음"이라고 적어주세요',
      placeholder: '예: 속이 메스꺼웠어요\n(없으면 "없음" 입력)',
      skipIf: () => !didTakeMedication(medicationCompliance),
    },
    {
      id: 'allergies',
      kind: 'textarea',
      required: false,
      title: '알레르기가 있으신가요?',
      subtitle: '선택사항',
      placeholder: '예: 페니실린 알레르기\n(없으면 "없음" 입력)',
    },
    {
      id: 'patientNotes',
      kind: 'textarea',
      required: false,
      title: '의사에게 꼭 전할 말이 있나요?',
      subtitle: '선택사항',
      placeholder: '예: 이전에 같은 증상으로 ○○병원에서 치료받았어요',
    },
  ];
}
