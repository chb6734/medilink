import { IsUUID } from 'class-validator';

/**
 * Get Doctor Summary Query DTO
 *
 * GET /api/records/doctor-summary 엔드포인트의 쿼리 파라미터 검증
 */
export class GetDoctorSummaryQueryDto {
  @IsUUID('4', { message: 'patientId must be a valid UUID' })
  patientId: string;
}
