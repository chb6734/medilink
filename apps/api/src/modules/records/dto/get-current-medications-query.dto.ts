import { IsUUID } from 'class-validator';

/**
 * Get Current Medications Query DTO
 *
 * GET /api/records/current-medications 엔드포인트의 쿼리 파라미터 검증
 */
export class GetCurrentMedicationsQueryDto {
  @IsUUID('4', { message: 'patientId must be a valid UUID' })
  patientId: string;
}
