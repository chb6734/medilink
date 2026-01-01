import { IsUUID } from 'class-validator';

/**
 * Get Records Query DTO
 *
 * GET /api/records 엔드포인트의 쿼리 파라미터 검증
 */
export class GetRecordsQueryDto {
  @IsUUID('4', { message: 'patientId must be a valid UUID' })
  patientId: string;
}
