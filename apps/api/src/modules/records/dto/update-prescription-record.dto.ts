import { IsOptional, IsString, IsInt, Min } from 'class-validator';

/**
 * Update Prescription Record DTO
 *
 * PUT /api/records/:id 엔드포인트의 Body 검증
 * 처방 기본 정보 수정용
 */
export class UpdatePrescriptionRecordDto {
  @IsOptional()
  @IsString()
  facilityName?: string;

  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @IsOptional()
  @IsString()
  doctorDiagnosis?: string;

  @IsOptional()
  @IsString()
  noteDoctorSaid?: string;

  @IsOptional()
  @IsString()
  prescribedAt?: string;

  @IsOptional()
  @IsString()
  dispensedAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  daysSupply?: number;
}
