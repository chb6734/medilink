/**
 * Questionnaire Form Validation Schema
 *
 * Uses Zod for form-level validation following the Cohesion principle.
 * All validation rules are colocated with the form definition.
 */
import { z } from 'zod';
import {
  SYMPTOM_OPTIONS,
  SYMPTOM_PROGRESS_OPTIONS,
  NEW_VISIT_MEDICATION_OPTIONS,
  FOLLOWUP_MEDICATION_OPTIONS,
} from './steps';

/**
 * Non-empty string validation
 */
const nonEmptyString = z.string().min(1, '필수 항목입니다');

/**
 * Optional string that can be empty
 */
const optionalString = z.string().optional();

/**
 * Questionnaire form validation schema
 *
 * This schema validates the entire questionnaire form data.
 * It uses discriminated validation based on whether medication was taken.
 */
export const questionnaireSchema = z.object({
  hospitalName: nonEmptyString.describe('병원 이름'),
  chiefComplaint: nonEmptyString.describe('주요 증상'),
  symptomDetail: optionalString.describe('증상 상세'),
  symptomStart: z.enum([...SYMPTOM_OPTIONS] as unknown as [string, ...string[]]).optional(),
  symptomProgress: z.enum([...SYMPTOM_PROGRESS_OPTIONS] as unknown as [string, ...string[]], {
    errorMap: () => ({ message: '증상 경과를 선택해주세요' }),
  }),
  medicationCompliance: z
    .string()
    .min(1, '약 복용 여부를 선택해주세요')
    .describe('약 복용 여부'),
  sideEffects: z.string().describe('부작용'),
  allergies: z.string().describe('알레르기'),
  patientNotes: z.string().describe('기타 전달사항'),
});

/**
 * Type inferred from the schema
 */
export type QuestionnaireFormData = z.infer<typeof questionnaireSchema>;

/**
 * Partial questionnaire schema for step-by-step validation
 */
export const partialQuestionnaireSchema = questionnaireSchema.partial();

/**
 * Validate a single field of the questionnaire
 *
 * @param fieldName - The field to validate
 * @param value - The value to validate
 * @returns Validation result with ok discriminated union
 */
export function validateField(
  fieldName: keyof QuestionnaireFormData,
  value: string | undefined
): { ok: true } | { ok: false; error: string } {
  const fieldSchema = questionnaireSchema.shape[fieldName];

  if (!fieldSchema) {
    return { ok: true };
  }

  const result = fieldSchema.safeParse(value);

  if (result.success) {
    return { ok: true };
  }

  return {
    ok: false,
    error: result.error.errors[0]?.message ?? '유효하지 않은 값입니다',
  };
}

/**
 * Validate the entire questionnaire form
 *
 * @param data - The form data to validate
 * @returns Validation result with discriminated union
 */
export function validateQuestionnaire(
  data: Partial<QuestionnaireFormData>
): { ok: true; data: QuestionnaireFormData } | { ok: false; errors: Record<string, string> } {
  const result = questionnaireSchema.safeParse(data);

  if (result.success) {
    return { ok: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const error of result.error.errors) {
    const path = error.path.join('.');
    if (path && !errors[path]) {
      errors[path] = error.message;
    }
  }

  return { ok: false, errors };
}

/**
 * Check if a step's required field is valid
 *
 * @param stepId - The step ID (field name)
 * @param value - The field value
 * @param required - Whether the field is required
 * @returns Whether the step is valid
 */
export function isStepValid(
  stepId: string,
  value: string | undefined,
  required: boolean
): boolean {
  if (!required) return true;
  return !!value && value.trim().length > 0;
}
