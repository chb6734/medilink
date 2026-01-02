import { IsUUID, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Count Records Query DTO
 *
 * GET /api/records/count 엔드포인트의 쿼리 파라미터 검증
 */
export class CountRecordsQueryDto {
  @IsUUID('4', { message: 'patientId must be a valid UUID' })
  patientId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'days must be an integer' })
  @Min(1, { message: 'days must be at least 1' })
  @Max(3650, { message: 'days must not exceed 3650' })
  days?: number;
}
